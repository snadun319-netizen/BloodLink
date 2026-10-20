import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import http from "node:http";
import { Pool } from "pg";
import dotenv from "dotenv";
import nodemailer from "nodemailer";

dotenv.config();
const configured = process.env.TEST_DATABASE_URL || process.env.DATABASE_URL;
if (!configured) throw new Error("Set TEST_DATABASE_URL to a PostgreSQL account with CREATEDB permission");
const url = new URL(configured);
if (!process.env.TEST_DATABASE_URL && !["localhost", "127.0.0.1", "[::1]"].includes(url.hostname)) throw new Error("Remote tests require explicit TEST_DATABASE_URL");
const testName = "bloodlink_test_" + crypto.randomBytes(8).toString("hex");
const names = [testName, testName + "_fresh"];
const created: string[] = [];
const admin = new Pool({ connectionString: configured, connectionTimeoutMillis: 5000 });
let pool: Pool | undefined, fresh: Pool | undefined, server: http.Server | undefined;
let passed = 0, failEmail = false;
const emails: { to: string; text: string }[] = [];
function check(condition: unknown, name: string) { assert.ok(condition, name); passed++; console.log("PASS: " + name); }
// Only email transport is replaced. HTTP, database, crypto, and middleware run unchanged.
(nodemailer as any).createTransport = () => ({
  sendMail: async (message: { to: string; text: string }) => {
    if (failEmail) throw new Error("Simulated delivery outage");
    emails.push(message); return { message: JSON.stringify(message) };
  },
});
async function main() {
  for (const name of names) {
    if (!/^bloodlink_test_[a-f0-9]{16}(?:_fresh)?$/.test(name)) throw new Error("Unsafe database name");
    await admin.query('CREATE DATABASE "' + name + '"'); created.push(name);
  }
  url.pathname = "/" + testName;
  process.env.DATABASE_URL = url.toString();
  process.env.NODE_ENV = "test"; process.env.EMAIL_TRANSPORT = "console";
  process.env.JWT_ACCESS_SECRET = crypto.randomBytes(48).toString("hex");
  process.env.JWT_REFRESH_SECRET = crypto.randomBytes(48).toString("hex");
  delete process.env.TRUST_PROXY; delete process.env.SMTP_HOST;
  pool = (await import("./db")).pool;
  const db = pool;
  const { runMigrations } = await import("./migrate");
  const schema = fs.readFileSync(path.resolve(__dirname, "../../database/schema.sql"), "utf8");
  await db.query(schema.split("-- Baseline hardening")[0].replaceAll("TIMESTAMPTZ", "TIMESTAMP"));
  await db.query("INSERT INTO registration_otps (identifier, identifier_type, otp_hash, expires_at, verified_at) VALUES ('legacy@example.com', 'email', 'legacy', NOW() + INTERVAL '1 hour', NOW()), ('legacy@example.com', 'email', 'legacy', NOW() + INTERVAL '1 hour', NULL)");
  const legacyUser = (await db.query("INSERT INTO users (email, password_hash, role) VALUES ('legacy@example.com', 'preserved-password-hash', 'donor') RETURNING id")).rows[0];
  await db.query("INSERT INTO password_reset_tokens (user_id, otp_hash, expires_at) VALUES ($1, 'legacy', NOW() + INTERVAL '1 hour')", [legacyUser.id]);
  await db.query("INSERT INTO refresh_tokens (user_id, token_hash, family_id, expires_at) VALUES ($1, 'legacy-token', 'legacy-family', NOW() + INTERVAL '1 hour')", [legacyUser.id]);
  await runMigrations();
  check((await db.query("SELECT id FROM registration_otps")).rows.length === 0, "Upgrade clears duplicate insecure legacy OTP challenges");
  check((await db.query("SELECT used_at FROM password_reset_tokens WHERE user_id = $1", [legacyUser.id])).rows[0].used_at, "Upgrade invalidates old numeric reset grants");
  check((await db.query("SELECT is_revoked FROM refresh_tokens WHERE user_id = $1", [legacyUser.id])).rows[0].is_revoked, "Upgrade revokes old sessions");
  check((await db.query("SELECT password_hash FROM users WHERE id = $1", [legacyUser.id])).rows[0].password_hash === "preserved-password-hash", "Upgrade preserves existing users and password hashes");
  check((await db.query("SELECT COUNT(*) FROM schema_migrations")).rows[0].count === "5", "Legacy upgrade records all migrations");
  check((await db.query("SELECT data_type FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'locked_until'")).rows[0].data_type === "timestamp with time zone", "Legacy timestamps migrate to timezone-aware values");
  await runMigrations();
  check((await db.query("SELECT COUNT(*) FROM schema_migrations")).rows[0].count === "5", "Migration runner is repeatable");
  await assert.rejects(() => runMigrations(true)); passed++;
  url.pathname = "/" + names[1];
  fresh = new Pool({ connectionString: url.toString() }); await fresh.query(schema);
  check((await fresh.query("SELECT column_name FROM information_schema.columns WHERE table_name = 'users'")).rows.some(r => r.column_name === "token_version"), "Fresh schema includes security hardening");
  const { hashPassword, verifyPassword } = await import("./services/password.service");
  const hash = await hashPassword("Password123!");
  check(hash.startsWith("$argon2id$") && await verifyPassword(hash, "Password123!") && !await verifyPassword(hash, "bad"), "Argon2id password verification works");
  const { issueTokenPair, rotateRefreshToken, cleanupExpiredTokens } = await import("./services/token.service");
  const { signAccessToken, verifyAccessToken, verifyRefreshToken } = await import("./services/jwt.service");
  const { createRegistrationOtp, verifyRegistrationOtp, createPasswordResetOtp, verifyPasswordResetOtp } = await import("./services/otp.service");
  const { createApp } = await import("./app");
  const { processPasswordResetJobs } = await import("./services/passwordResetDelivery.service");
  const limiters = await import("./middleware/rateLimiter.middleware");
  function resetLimits() { for (const limiter of Object.values(limiters)) (limiter as any).resetKey("127.0.0.1"); }
  server = http.createServer(createApp());
  await new Promise<void>(resolve => server!.listen(0, "127.0.0.1", resolve));
  const base = "http://127.0.0.1:" + (server.address() as any).port;
  async function api(endpoint: string, body?: unknown, token?: string, method = body === undefined ? "GET" : "POST") {
    const response = await fetch(base + endpoint, {
      method, headers: { "Content-Type": "application/json", ...(token ? { Authorization: "Bearer " + token } : {}) },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    });
    return { status: response.status, data: await response.json() as any, headers: response.headers };
  }
  const post = (endpoint: string, body: unknown) => api("/api/auth" + endpoint, body);
  const me = (token: string) => api("/api/auth/me", undefined, token);
  function otpFor(email: string) {
    const message = emails.filter(message => message.to === email).at(-1);
    assert.ok(message, "Email delivered"); const otp = /code is: (\d{6})/.exec(message.text)?.[1];
    assert.ok(otp, "OTP present in email"); return otp;
  }
  async function proof(email: string) {
    resetLimits(); const send = await post("/send-otp", { identifier: email, type: "email" });
    check(send.status === 200 && !("devOtp" in send.data), "Registration OTP is delivered without API disclosure");
    const verification = await post("/verify-otp", { identifier: email, type: "email", otp: otpFor(email) });
    check(verification.status === 200 && /^[a-f0-9]{64}$/.test(verification.data.registrationToken), "Email OTP issues random registration proof");
    return verification.data.registrationToken as string;
  }
  async function allowResend(id: number) {
    await db.query("UPDATE password_reset_tokens SET created_at = NOW() - INTERVAL '1 minute' WHERE user_id = $1", [id]);
    await db.query("UPDATE password_reset_email_jobs SET created_at = NOW() - INTERVAL '1 minute' WHERE user_id = $1", [id]);
  }
  async function resetProof(email: string, id: number) {
    resetLimits(); await allowResend(id);
    check((await post("/forgot-password", { email })).status === 200, "Reset request succeeds");
    await processPasswordResetJobs();
    const verification = await post("/verify-reset-otp", { email, otp: otpFor(email) });
    check(verification.status === 200 && /^[a-f0-9]{64}$/.test(verification.data.resetToken), "Reset OTP issues random proof");
    return verification.data.resetToken as string;
  }
  check((await api("/api/health")).status === 200, "Database health endpoint works");
  for (const body of [[], null, "string", 42]) check((await post("/login", body)).status === 400, "Non-object bodies return 400");
  for (const identifier of [{}, [], 123, true]) check((await post("/login", { identifier, password: "Password123!" })).status === 400, "Invalid identifier types return 400");
  resetLimits();
  const malformed = await fetch(base + "/api/auth/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: "{" });
  check(malformed.status === 400 && (await malformed.json() as any).error === "Invalid JSON", "Malformed JSON returns safe JSON error");
  check((await post("/login", { password: "x".repeat(70000) })).status === 413, "Oversized bodies return 413");
  check((await post("/refresh", { refreshToken: {} })).status === 400, "Invalid refresh token type rejected");
  check((await api("/api/admin/stats")).status === 401, "Admin endpoints require authentication");
  const input = { email: "donor@example.com", password: "Password123!", fullName: "Test Donor", phone: "0771234567", nic: "199012345678", bloodGroup: "A+", dob: "1990-04-10" };
  resetLimits();
  check((await post("/register", input)).status === 400, "Registration cannot bypass email verification");
  check((await post("/register", { ...input, registrationToken: "a".repeat(64) })).status === 400, "Forged registration proof rejected");
  const registrationToken = await proof(input.email);
  for (const changes of [{ dob: "1990-02-31" }, { fullName: " " }, { password: {} }, { documentUrl: "javascript:alert(1)" }]) {
    check((await post("/register", { ...input, registrationToken, ...changes })).status === 400, "Invalid registration fields rejected");
  }
  resetLimits();
  const registration = await post("/register", { ...input, registrationToken });
  check(registration.status === 201, "Verified donor registration succeeds");
  const id = registration.data.user.id;
  check((await db.query("SELECT phone FROM donor_profiles WHERE user_id = $1", [id])).rows[0].phone === "+94771234567", "Canonical donor phone persisted");
  check((await db.query("SELECT id FROM donor_verifications WHERE donor_id = $1", [id])).rows.length === 0, "Missing document does not create fabricated verification");
  check((await db.query("SELECT id FROM registration_otps WHERE identifier = $1", [input.email])).rows.length === 0, "Registration proof is consumed");
  check((await db.query("SELECT token_hash FROM refresh_tokens WHERE user_id = $1", [id])).rows[0].token_hash !== registration.data.refreshToken, "Refresh tokens are hashed in storage");
  const profile = await me(registration.data.accessToken);
  check(profile.status === 200 && profile.data.user.email === input.email && !("latitude" in profile.data.user) && !("password_hash" in profile.data.user), "Profile returns owner data without credential or location disclosure");
  check(profile.headers.get("cache-control") === "no-store", "Authentication responses cannot be cached");
  check((await post("/register", { ...input, registrationToken })).status === 409, "Duplicate email returns 409");
  resetLimits();
  const login = await post("/login", { identifier: " DONOR@EXAMPLE.COM ", password: input.password });
  check(login.status === 200, "Email login handles case and whitespace");
  check((await post("/login", { phone: "077 123 4567", password: input.password })).status === 200, "Phone login handles canonical formats");
  check((await post("/login", { email: input.email, password: "bad" })).status === 401, "Wrong passwords return generic credentials error");
  check((await api("/api/admin/users", undefined, login.data.accessToken)).status === 403, "Donors cannot access admin endpoints");
  check((await me(login.data.accessToken + "bad")).status === 401, "Tampered tokens are rejected");
  assert.throws(() => verifyRefreshToken(login.data.accessToken)); passed++;
  assert.throws(() => verifyAccessToken(login.data.refreshToken)); passed++;
  const signedClaims = verifyAccessToken(login.data.accessToken);
  const staleAdmin = signAccessToken({ ...signedClaims, id: String(id), role: "admin" });
  check((await api("/api/admin/users", undefined, staleAdmin)).status === 403, "Current database roles override stale JWT roles");

  resetLimits(); await db.query("UPDATE users SET failed_login_attempts = 0 WHERE id = $1", [id]);
  const failures = await Promise.all(Array.from({ length: 5 }, () => post("/login", { email: input.email, password: "Wrong123!" })));
  check(failures.every(r => r.status === 401), "Concurrent wrong logins return 401");
  check((await db.query("SELECT failed_login_attempts FROM users WHERE id = $1", [id])).rows[0].failed_login_attempts === 5, "Login lockout counter is race-safe");
  check((await post("/login", { email: input.email, password: input.password })).status === 423, "Locked account rejects correct password");
  check((await post("/login", { email: input.email, password: "Wrong123!" })).status === 401, "Lockout does not reveal account existence to incorrect credentials");
  await db.query("UPDATE users SET locked_until = NOW() - INTERVAL '1 second' WHERE id = $1", [id]);
  await post("/login", { email: input.email, password: "Wrong123!" });
  check((await db.query("SELECT failed_login_attempts FROM users WHERE id = $1", [id])).rows[0].failed_login_attempts === 1, "Expired lockout resets attempt window");
  check((await post("/login", { email: input.email, password: input.password })).status === 200, "Login recovers after lockout expiry");

  resetLimits();
  const known = await post("/forgot-password", { email: input.email }), unknown = await post("/forgot-password", { email: "unknown@example.com" });
  check(known.status === unknown.status && JSON.stringify(known.data) === JSON.stringify(unknown.data), "Reset request hides account existence and OTP");
  check((await post("/verify-reset-otp", { email: "unknown@example.com", otp: "000000" })).status === 400, "Unknown reset accounts return generic verification failure");
  check((await db.query("SELECT id FROM password_reset_email_jobs WHERE user_id = $1 AND status = 'pending'", [id])).rows.length === 1, "Reset email jobs persist before delivery");
  await processPasswordResetJobs();
  const row = (await db.query("SELECT id FROM password_reset_tokens WHERE user_id = $1 ORDER BY id DESC LIMIT 1", [id])).rows[0];
  check((await post("/reset-password", { email: input.email, resetTokenId: row.id, password: "Hacked123!" })).status === 400, "Critical numeric-ID reset bypass is blocked");
  check((await post("/reset-password", { resetToken: String(row.id), password: "Hacked123!" })).status === 400, "Numeric reset tokens are rejected");
  check((await post("/verify-reset-otp", { email: input.email, otp: "000000" })).status === 400, "Wrong reset OTP is rejected");
  const verified = await post("/verify-reset-otp", { email: input.email, otp: otpFor(input.email) });
  check(verified.status === 200, "Correct reset OTP verifies");
  check((await post("/verify-reset-otp", { email: input.email, otp: otpFor(input.email) })).status === 400, "Verified reset OTP cannot be replayed");
  const grant = (await db.query("SELECT reset_token_hash, verified_at FROM password_reset_tokens WHERE id = $1", [row.id])).rows[0];
  check(grant.verified_at && grant.reset_token_hash !== verified.data.resetToken, "Reset proof is hashed and linked to OTP verification");
  const resetToken = verified.data.resetToken;
  check((await post("/reset-password", { email: "other@example.com", resetToken, password: "NewPassword123!" })).status === 400, "Reset proof is bound to its account");
  check((await post("/reset-password", { resetToken, password: "NewPassword123!", confirmPassword: "different" })).status === 400, "Password confirmation mismatch rejected");
  resetLimits();
  const resets = await Promise.all([1, 2].map(() => post("/reset-password", { resetToken, password: "NewPassword123!" })));
  check(resets.filter(r => r.status === 200).length === 1 && resets.filter(r => r.status === 400).length === 1, "Concurrent password resets consume proof exactly once");
  check((await me(login.data.accessToken)).status === 401, "Reset immediately invalidates old access sessions");
  check((await post("/refresh", { refreshToken: login.data.refreshToken })).status === 401, "Reset invalidates old refresh tokens");
  check((await post("/login", { email: input.email, password: input.password })).status === 401, "Old password stops working");
  const newLogin = await post("/login", { email: input.email, password: "NewPassword123!" });
  check(newLogin.status === 200, "New password works");
  check((await post("/reset-password", { resetToken, password: "Another123!" })).status === 400, "Used reset proof is rejected");

  await allowResend(id); const expiredOtp = await createPasswordResetOtp(id);
  await db.query("UPDATE password_reset_tokens SET expires_at = NOW() - INTERVAL '1 second' WHERE user_id = $1", [id]);
  check(!(await verifyPasswordResetOtp(id, expiredOtp)).valid, "Expired reset OTP rejected");
  await allowResend(id); const limitedOtp = await createPasswordResetOtp(id);
  await Promise.all(Array.from({ length: 8 }, () => verifyPasswordResetOtp(id, "000000")));
  check((await db.query("SELECT attempts FROM password_reset_tokens WHERE user_id = $1 AND used_at IS NULL", [id])).rows[0].attempts === 5, "Concurrent OTP guesses cannot exceed attempt limit");
  check(!(await verifyPasswordResetOtp(id, limitedOtp)).valid, "Exhausted OTP rejects even correct code");
  await allowResend(id); const singleOtp = await createPasswordResetOtp(id);
  const verifications = await Promise.all([1, 2].map(() => verifyPasswordResetOtp(id, singleOtp)));
  check(verifications.filter(r => r.valid).length === 1, "Concurrent OTP verification issues one proof");
  await db.query("UPDATE password_reset_tokens SET expires_at = NOW() - INTERVAL '1 second' WHERE user_id = $1", [id]);
  resetLimits();
  check((await post("/reset-password", { resetToken: verifications.find(r => r.valid)!.resetToken, password: "Expired123!" })).status === 400, "Expired verified proof rejected");
  const oldGrant = await resetProof(input.email, id); await allowResend(id); await createPasswordResetOtp(id);
  check((await post("/reset-password", { resetToken: oldGrant, password: "Invalid123!" })).status === 400, "New reset request invalidates previous proofs");

  const pair = await issueTokenPair({ id: String(id), role: "donor", orgId: null });
  const rotations = await Promise.all([1, 2].map(() => rotateRefreshToken(pair.refreshToken)));
  check(rotations.filter(Boolean).length === 1, "Concurrent refresh rotates once");
  check((await db.query("SELECT is_revoked FROM refresh_tokens WHERE family_id = $1", [pair.familyId])).rows.every(r => r.is_revoked), "Refresh reuse revokes entire family");
  check((await me(rotations.find(Boolean)!.accessToken)).status === 401, "Reuse invalidates descendant access tokens");
  const pair2 = await issueTokenPair({ id: String(id), role: "donor", orgId: null }), rotated = await rotateRefreshToken(pair2.refreshToken);
  await cleanupExpiredTokens();
  check((await db.query("SELECT id FROM refresh_tokens WHERE family_id = $1", [pair2.familyId])).rows.length === 2, "Cleanup preserves ancestors for reuse detection");
  await runMigrations();
  check((await me(rotated!.accessToken)).status === 200, "Repeated migration preserves live sessions");
  check((await post("/logout", { refreshToken: rotated!.refreshToken })).status === 200, "Logout succeeds");
  check((await me(rotated!.accessToken)).status === 401 && (await post("/refresh", { refreshToken: rotated!.refreshToken })).status === 401, "Logout revokes access and refresh tokens");

  const adminUser = (await db.query("INSERT INTO users (email, password_hash, role) VALUES ('admin@example.com', $1, 'admin') RETURNING id", [hash])).rows[0];
  const adminToken = (await issueTokenPair({ id: String(adminUser.id), role: "admin", orgId: null })).accessToken;
  resetLimits();
  check((await api("/api/admin/users/" + id + "/status", { status: "suspended" }, adminToken, "PATCH")).status === 200, "Admin can suspend user");
  check((await me(newLogin.data.accessToken)).status === 401 && (await post("/login", { email: input.email, password: "NewPassword123!" })).status === 403, "Suspension revokes sessions and blocks login");
  check((await api("/api/admin/users/" + adminUser.id + "/status", { status: "suspended" }, adminToken, "PATCH")).status === 403, "Admin cannot suspend self");
  check((await api("/api/admin/users/" + id + "/status", { status: "active" }, adminToken, "PATCH")).status === 200, "Admin can reactivate user");
  check((await me(newLogin.data.accessToken)).status === 401, "Reactivation cannot restore revoked sessions");
  check((await api("/api/admin/audit-logs?limit=-1", undefined, adminToken)).status === 400, "Invalid pagination rejected");
  const deletedActor = (await db.query("INSERT INTO users (email, password_hash, role) VALUES ('deleted@example.com', $1, 'donor') RETURNING id", [hash])).rows[0];
  const oldAudit = (await db.query("INSERT INTO audit_logs (actor_user_id, action) VALUES ($1, 'DELETED_ACTOR_TEST') RETURNING id", [deletedActor.id])).rows[0];
  await db.query("DELETE FROM users WHERE id = $1", [deletedActor.id]);
  check((await api("/api/admin/audit-logs?action=DELETED_ACTOR_TEST", undefined, adminToken)).data.logs.some((log: any) => log.id === oldAudit.id), "Deleted actors remain visible in audit history");
  check((await api("/api/admin/users/bad/status", { status: "active" }, adminToken, "PATCH")).status === 400, "Invalid IDs return 400");
  const donorToken = (await issueTokenPair({ id: String(id), role: "donor", orgId: null })).accessToken;
  const submitted = await api("/api/donors/submit", { documentUrl: "https://example.com/proof.pdf", claimedBloodGroup: "O+" }, donorToken);
  check(submitted.status === 201, "Donor document submission succeeds");
  check((await api("/api/donors/submit", { documentUrl: "https://example.com/second.pdf", claimedBloodGroup: "O+" }, donorToken)).status === 409, "Duplicate pending verification rejected");
  check((await api("/api/donors/admin/pending", undefined, adminToken)).status === 200, "Admin can list pending reviews");
  check((await api("/api/donors/admin/" + submitted.data.verification.id + "/approve", {}, adminToken, "PATCH")).status === 200, "Admin approval succeeds");
  const verifiedProfile = (await db.query("SELECT blood_group, blood_group_verified FROM donor_profiles WHERE user_id = $1", [id])).rows[0];
  check(verifiedProfile.blood_group === "O+" && verifiedProfile.blood_group_verified, "Approval atomically updates verified blood group");
  check((await api("/api/donors/admin/" + submitted.data.verification.id + "/approve", {}, adminToken, "PATCH")).status === 404, "Repeated approval rejected");

  resetLimits();
  const org = await api("/api/organizations/register", { name: "Test Hospital", type: "hospital" });
  check(org.status === 201 && org.data.organization.verification_status === "pending", "Organization registration requires review");
  const orgId = org.data.organization.id;
  const staffInput = { email: "STAFF@EXAMPLE.COM", password: "Password123!", role: "hospital_staff", organizationId: orgId };
  check((await api("/api/staff/register", staffInput)).status === 403, "Unapproved organization blocks staff registration");
  check((await api("/api/organizations/admin/" + orgId + "/approve", {}, adminToken, "PATCH")).status === 200, "Organization approval succeeds");
  const staff = await api("/api/staff/register", staffInput);
  check(staff.status === 201 && staff.data.user.email === "staff@example.com" && staff.data.user.status === "suspended", "Staff registration normalizes email and awaits approval");
  check((await api("/api/staff/register", { ...staffInput, email: "wrong@example.com", role: "bloodbank_staff" })).status === 400, "Staff role must match organization");
  check((await api("/api/staff/admin/" + staff.data.user.id + "/approve", {}, adminToken, "PATCH")).status === 200, "Staff approval succeeds");
  resetLimits(); const staffLogin = await post("/login", { email: "staff@example.com", password: "Password123!" });
  check(staffLogin.status === 200, "Approved staff can log in");
  await db.query("UPDATE organizations SET verification_status = 'rejected' WHERE id = $1", [orgId]);
  check((await me(staffLogin.data.accessToken)).status === 403, "Organization rejection blocks staff immediately");
  check((await post("/refresh", { refreshToken: staffLogin.data.refreshToken })).status === 401, "Rejected organization cannot refresh staff tokens");

  // Network administration uses the same real HTTP, PostgreSQL and RBAC stack.
  resetLimits();
  check((await api("/api/admin/organizations")).status === 401, "Anonymous visitors cannot inspect the institution directory");
  check((await api("/api/admin/organizations", undefined, donorToken)).status === 403, "Donors cannot inspect the institution directory");
  const bankInput = { name: "Network Test Blood Bank", type: "bloodbank", district: "Ratnapura", address: "Test address", contactPhone: "0771231234", contactEmail: "CONTACT@EXAMPLE.COM", latitude: 6.68, longitude: 80.4 };
  const bankCreated = await api("/api/admin/organizations", bankInput, adminToken, "POST");
  check(bankCreated.status === 201 && bankCreated.data.organization.verification_status === "pending", "Admin creates pending blood bank");
  const bankId = bankCreated.data.organization.id;
  check(bankCreated.data.organization.contact_phone === "+94771231234" && bankCreated.data.organization.contact_email === "contact@example.com", "Bank contact details normalize consistently");
  check((await api("/api/admin/organizations", { ...bankInput, district: "Invalid district" }, adminToken, "POST")).status === 400, "Invalid bank district is rejected");
  check((await api("/api/admin/organizations", { ...bankInput, latitude: 91 }, adminToken, "POST")).status === 400, "Out-of-range institution coordinates are rejected");
  check((await api("/api/admin/organizations", { ...bankInput, longitude: null }, adminToken, "POST")).status === 400, "Institution coordinates must be supplied together");
  const bankStaffInput = { email: "network.staff@example.com", password: "Password123!", role: "bloodbank_staff", organizationId: bankId };
  check((await api("/api/admin/staff", bankStaffInput, adminToken, "POST")).status === 403, "Cannot provision staff for pending institution");
  check((await api(`/api/admin/organizations/${bankId}/access`, { isActive: false }, adminToken, "PATCH")).status === 409, "Institution access changes require prior approval");
  check((await api(`/api/organizations/admin/${bankId}/approve`, {}, adminToken, "PATCH")).status === 200, "Admin can approve newly created bank");
  check((await api(`/api/admin/organizations/${bankId}`, { ...bankInput, name: "Updated Network Blood Bank" }, adminToken, "PATCH")).data.organization.name === "Updated Network Blood Bank", "Admin can edit bank details");
  const bankStaff = await api("/api/admin/staff", bankStaffInput, adminToken, "POST");
  check(bankStaff.status === 201 && bankStaff.data.user.status === "active" && !JSON.stringify(bankStaff.data).includes("password_hash"), "Admin provisions active staff without exposing password hashes");
  check((await api("/api/admin/staff", bankStaffInput, adminToken, "POST")).status === 409, "Duplicate staff email is rejected");
  check((await api("/api/admin/staff", { ...bankStaffInput, email: "mismatch@example.com", role: "hospital_staff" }, adminToken, "POST")).status === 400, "Admin provisioning enforces organization role match");
  await db.query("INSERT INTO blood_stocks (organization_id, blood_group, available_units, status) VALUES ($1, 'O-', 1, 'Critical'), ($1, 'A+', 10, 'Low')", [bankId]);
  const bankDirectory = await api("/api/admin/organizations", undefined, adminToken);
  const directoryEntry = bankDirectory.data.organizations.find((bank: any) => bank.id === bankId);
  check(directoryEntry.total_units === 11 && directoryEntry.staff_count === 1 && directoryEntry.critical_groups === 1, "Directory aggregates stock and staff independently");
  const networkStats = await api("/api/admin/network-overview", undefined, adminToken);
  check(networkStats.data.total_banks === 1 && networkStats.data.active_banks === 1 && networkStats.data.critical_groups === 1, "Network overview counts blood banks and critical stock");
  const bankDetail = await api(`/api/admin/organizations/${bankId}`, undefined, adminToken);
  check(bankDetail.data.stock.length === 2 && bankDetail.data.staff.length === 1 && !JSON.stringify(bankDetail.data).includes("password_hash"), "Bank detail returns scoped stock and safe staff records");
  check((await api("/api/admin/organizations/2147483647", undefined, adminToken)).status === 404, "Unknown institution returns 404");
  resetLimits();
  const bankLogin = await post("/login", { email: bankStaffInput.email, password: bankStaffInput.password });
  check(bankLogin.status === 200, "Provisioned institution staff can log in");
  check((await api("/api/admin/organizations", undefined, bankLogin.data.accessToken)).status === 403, "Institution staff cannot enter the network admin API");
  check((await api(`/api/admin/organizations/${bankId}/access`, { isActive: "false" }, adminToken, "PATCH")).status === 400, "Access switch rejects non-boolean input");
  check((await api(`/api/admin/organizations/${bankId}/access`, { isActive: false }, adminToken, "PATCH")).status === 200, "Admin can suspend an institution");
  check((await me(bankLogin.data.accessToken)).status === 401, "Institution suspension revokes current staff access tokens");
  check((await post("/refresh", { refreshToken: bankLogin.data.refreshToken })).status === 401, "Institution suspension blocks token refresh");
  check((await post("/login", { email: bankStaffInput.email, password: bankStaffInput.password })).status === 403, "Suspended institution blocks staff login");
  check((await api("/api/admin/staff", { ...bankStaffInput, email: "blocked@example.com" }, adminToken, "POST")).status === 403, "Suspended institution blocks staff provisioning");
  check((await api(`/api/admin/users/${bankStaff.data.user.id}/status`, { status: "active" }, adminToken, "PATCH")).status === 403, "Suspended institution blocks staff activation");
  check((await api("/api/admin/network-overview", undefined, adminToken)).data.stock.length === 0, "Suspended bank stock is excluded from active network totals");
  check((await api(`/api/admin/organizations/${bankId}/access`, { isActive: true }, adminToken, "PATCH")).status === 200, "Admin can reactivate an institution");
  check((await me(bankLogin.data.accessToken)).status === 401, "Reactivation does not restore revoked staff sessions");
  check((await post("/login", { email: bankStaffInput.email, password: bankStaffInput.password })).status === 200, "Reactivated institution staff can start a new session");
  check((await api("/api/admin/staff", undefined, adminToken)).data.staff.some((member: any) => member.id === bankStaff.data.user.id && member.organization_name === "Updated Network Blood Bank"), "Staff directory includes current institution name");
  const bankAudits = await api("/api/admin/audit-logs?limit=100", undefined, adminToken);
  check(["ORGANIZATION_CREATED", "ORGANIZATION_UPDATED", "ORGANIZATION_SUSPENDED", "ORGANIZATION_REACTIVATED", "STAFF_CREATED"].every(action => bankAudits.data.logs.some((entry: any) => entry.action === action)), "Network management changes leave an audit trail");
  // An audit failure must roll back creation rather than silently lose accountability.
  await db.query("ALTER TABLE audit_logs ADD CONSTRAINT test_no_org_creation CHECK (action <> 'ORGANIZATION_CREATED') NOT VALID");
  check((await api("/api/admin/organizations", { ...bankInput, name: "Must Roll Back" }, adminToken, "POST")).status === 400, "Audit persistence failure rejects institution creation");
  check((await db.query("SELECT id FROM organizations WHERE name = 'Must Roll Back'")).rows.length === 0, "Failed audit rolls back institution creation atomically");
  await db.query("ALTER TABLE audit_logs DROP CONSTRAINT test_no_org_creation");

  // Account-first onboarding: create credentials, then link an unused account when adding a bank.
  resetLimits();
  check((await api("/api/organizations/register", { name: "Public Blood Bank", type: "bloodbank" })).status === 403, "Blood banks cannot self-register");
  check((await api("/api/staff/register", { ...bankStaffInput, email: "public.bank@example.com" })).status === 403, "Blood bank accounts cannot self-register");
  const initialPassword = "Temporary123!";
  const accountInput = { accountEmail: "PRIMARY.BANK@EXAMPLE.COM", password: initialPassword };
  const newAccount = (accountEmail: string) => api("/api/admin/bank-accounts", { accountEmail, password: initialPassword }, adminToken);
  check((await api("/api/admin/bank-accounts", accountInput)).status === 401, "Anonymous visitors cannot create bank accounts");
  check((await api("/api/admin/bank-accounts", accountInput, donorToken)).status === 403, "Donors cannot create bank accounts");
  check((await api("/api/admin/bank-accounts", { ...accountInput, password: "weak" }, adminToken)).status === 400, "Account creation rejects weak passwords");
  const bankCount = (await db.query("SELECT COUNT(*) FROM organizations")).rows[0].count;
  const createdAccount = await api("/api/admin/bank-accounts", accountInput, adminToken);
  const primary = createdAccount.data.user;
  check(createdAccount.status === 201 && primary.organization_id === null && primary.email === "primary.bank@example.com", "Admin creates an unassigned account before a blood bank exists");
  check(primary.is_bank_account && primary.must_change_password && !("password_hash" in primary), "New bank accounts require password change without disclosing hashes");
  check((await db.query("SELECT COUNT(*) FROM organizations")).rows[0].count === bankCount, "Creating an account does not create a placeholder bank");
  check((await api("/api/admin/bank-accounts", accountInput, adminToken)).status === 409, "Duplicate account email is rejected");
  resetLimits();
  check((await post("/login", { email: primary.email, password: initialPassword })).status === 403, "An unassigned bank account cannot sign in");
  check((await db.query("SELECT id FROM refresh_tokens WHERE user_id = $1", [primary.id])).rowCount === 0, "Unassigned login creates no sessions");
  const onboarding = { ...bankInput, name: "Admin Onboarded Bank", accountId: primary.id, branchName: "Head office" };
  check((await api("/api/admin/blood-banks", onboarding)).status === 401, "Anonymous visitors cannot register banks");
  check((await api("/api/admin/blood-banks", onboarding, donorToken)).status === 403, "Donors cannot register banks");
  check((await api("/api/admin/blood-banks", { ...onboarding, accountId: undefined }, adminToken)).status === 400, "Bank registration requires a selected account");
  check((await api("/api/admin/blood-banks", { ...onboarding, accountId: bankStaff.data.user.id }, adminToken)).status === 404, "Ordinary teammates cannot be selected as primary accounts");
  check((await api("/api/admin/blood-banks", { ...onboarding, accountId: 2147483647 }, adminToken)).status === 404, "Unknown bank accounts are rejected");
  check((await api("/api/admin/blood-banks", { ...onboarding, latitude: null }, adminToken)).status === 400, "Bank registration requires map coordinates");
  check((await api("/api/admin/blood-banks", { ...onboarding, address: "" }, adminToken)).status === 400, "Bank registration requires an address");
  check((await api(`/api/admin/users/${primary.id}/status`, { status: "suspended" }, adminToken, "PATCH")).status === 200, "Admin can suspend an unassigned account");
  check((await api("/api/admin/blood-banks", onboarding, adminToken)).status === 403, "Suspended accounts cannot be assigned to a bank");
  check((await api(`/api/admin/users/${primary.id}/status`, { status: "active" }, adminToken, "PATCH")).status === 200, "Admin can reactivate an unassigned account");
  const onboarded = await api("/api/admin/blood-banks", onboarding, adminToken);
  const mainBank = onboarded.data.organization;
  check(onboarded.status === 201 && mainBank.verification_status === "approved" && onboarded.data.user.id === primary.id && onboarded.data.user.organization_id === mainBank.id, "Adding a blood bank links the selected existing account atomically");
  check(!JSON.stringify(onboarded.data).includes(initialPassword) && !("password_hash" in onboarded.data.user), "Bank registration never returns stored credentials");
  const reused = await api("/api/admin/blood-banks", { ...onboarding, name: "Reused account rollback" }, adminToken);
  check(reused.status === 409 && !(await db.query("SELECT id FROM organizations WHERE name = 'Reused account rollback'")).rowCount, "An assigned account cannot be reused for a second bank");
  const spare = await newAccount("spare.bank@example.com");
  check((await api(`/api/admin/blood-banks/${mainBank.id}/account`, { accountId: spare.data.user.id }, adminToken)).status === 409, "A bank cannot receive two primary accounts");
  const branchAccount = await newAccount("branch@example.com");
  const branchInput = { ...onboarding, name: "Main Bank Colombo", branchName: "Colombo branch", parentOrganizationId: mainBank.id, accountId: branchAccount.data.user.id };
  const branch = await api("/api/admin/blood-banks", branchInput, adminToken);
  check(branch.status === 201 && branch.data.organization.parent_organization_id === mainBank.id && branch.data.user.id === branchAccount.data.user.id, "Branch registration links its own pre-created account");
  check((await api("/api/admin/blood-banks", { ...branchInput, parentOrganizationId: branch.data.organization.id, accountId: spare.data.user.id }, adminToken)).status === 400, "Branches cannot be selected as main banks");
  check((await api(`/api/admin/organizations/${mainBank.id}`, { ...bankInput, branchName: "Head office", parentOrganizationId: branch.data.organization.id }, adminToken, "PATCH")).status === 409, "Main banks with branches cannot become branches");
  check((await api(`/api/admin/organizations/${branch.data.organization.id}`, { ...bankInput, branchName: "Branch", parentOrganizationId: branch.data.organization.id }, adminToken, "PATCH")).status === 400, "A bank cannot be its own parent");
  const directory = await api("/api/admin/organizations", undefined, adminToken);
  check(directory.data.organizations.some((item: any) => item.id === branch.data.organization.id && item.parent_name === mainBank.name && item.account_email === "branch@example.com"), "Directory includes the selected login and branch linkage");
  const accounts = await api("/api/admin/bank-accounts", undefined, adminToken);
  check(accounts.data.accounts.some((item: any) => item.id === spare.data.user.id && item.organization_id === null && item.organization_name === null) && accounts.data.accounts.every((item: any) => item.is_bank_account), "Accounts list includes unassigned logins and excludes teammates");
  const competing = await Promise.all(["race1@example.com", "race2@example.com"].map(newAccount));
  const assignments = await Promise.all(competing.map(result => api(`/api/admin/blood-banks/${bankId}/account`, { accountId: result.data.user.id }, adminToken)));
  check(assignments.filter(result => result.status === 200).length === 1 && assignments.filter(result => result.status === 409).length === 1, "Concurrent assignments preserve one account per existing bank");
  const oneAccount = await newAccount("one.account@example.com");
  const competingBanks = await Promise.all(["Concurrent bank one", "Concurrent bank two"].map(name => api("/api/admin/blood-banks", { ...onboarding, name, accountId: oneAccount.data.user.id }, adminToken)));
  check(competingBanks.filter(result => result.status === 201).length === 1 && competingBanks.filter(result => result.status === 409).length === 1, "One account cannot be linked to two banks in concurrent requests");
  await db.query("ALTER TABLE audit_logs ADD CONSTRAINT test_no_bank_assignment CHECK (action <> 'BANK_ACCOUNT_ASSIGNED') NOT VALID");
  const failedAssignment = await api("/api/admin/blood-banks", { ...onboarding, name: "Assignment audit rollback", accountId: spare.data.user.id }, adminToken);
  check(failedAssignment.status === 400 && !(await db.query("SELECT id FROM organizations WHERE name = 'Assignment audit rollback'")).rowCount && (await db.query("SELECT organization_id FROM users WHERE id = $1", [spare.data.user.id])).rows[0].organization_id === null, "Failed assignment audit rolls back the bank and preserves the available account");
  await db.query("ALTER TABLE audit_logs DROP CONSTRAINT test_no_bank_assignment");
  await db.query("ALTER TABLE audit_logs ADD CONSTRAINT test_no_account_creation CHECK (action <> 'BANK_ACCOUNT_CREATED') NOT VALID");
  check((await newAccount("audit.rollback@example.com")).status === 400 && !(await db.query("SELECT id FROM users WHERE email = 'audit.rollback@example.com'")).rowCount, "Failed creation audit rolls back the unassigned account");
  await db.query("ALTER TABLE audit_logs DROP CONSTRAINT test_no_account_creation");
  resetLimits();
  const temporaryLogin = await post("/login", { email: primary.email, password: initialPassword });
  check(temporaryLogin.status === 200 && temporaryLogin.data.user.mustChangePassword && temporaryLogin.data.user.organizationId === mainBank.id, "Temporary credentials signal mandatory password change at login");
  check((await me(temporaryLogin.data.accessToken)).data.user.mustChangePassword, "Current user exposes first-use password requirement");
  const operational = await api("/api/admin/bank-accounts", undefined, temporaryLogin.data.accessToken);
  check(operational.status === 403 && operational.data.code === "PASSWORD_CHANGE_REQUIRED", "Temporary credentials require a password change before protected workflows");
  const passwordChange = { currentPassword: initialPassword, password: "BankOwnedPassword456!", confirmPassword: "BankOwnedPassword456!" };
  check((await api("/api/auth/change-password", { ...passwordChange, currentPassword: "WrongPassword123!" }, temporaryLogin.data.accessToken)).status === 400, "Password change verifies the current password");
  check((await api("/api/auth/change-password", { ...passwordChange, confirmPassword: "different" }, temporaryLogin.data.accessToken)).status === 400, "Password change checks confirmation");
  check((await api("/api/auth/change-password", passwordChange, temporaryLogin.data.accessToken)).status === 200, "Bank replaces its temporary password");
  check((await me(temporaryLogin.data.accessToken)).status === 401, "Password change revokes the old session");
  check((await post("/refresh", { refreshToken: temporaryLogin.data.refreshToken })).status === 401, "Password change revokes old refresh tokens");
  resetLimits();
  check((await post("/login", { email: primary.email, password: initialPassword })).status === 401, "Temporary password no longer works after handover");
  const ownedLogin = await post("/login", { email: primary.email, password: passwordChange.password });
  check(ownedLogin.status === 200 && !ownedLogin.data.user.mustChangePassword, "Bank signs in with its own password after handover");
  check((await api("/api/admin/bank-accounts", undefined, ownedLogin.data.accessToken)).status === 403, "Bank accounts cannot use platform administration");
  const branchProof = await resetProof("branch@example.com", branch.data.user.id);
  check((await post("/reset-password", { resetToken: branchProof, password: "RecoveredPassword789!" })).status === 200, "Email recovery can replace a temporary bank password");
  check(!(await db.query("SELECT must_change_password FROM users WHERE id = $1", [branch.data.user.id])).rows[0].must_change_password, "Email recovery clears the first-use password requirement");

  const otherProof = await proof("other@example.com");
  check((await post("/register", { ...input, email: "other@example.com", phone: "0777654321", registrationToken: otherProof })).status === 409, "Database rejects duplicate NIC");
  check((await db.query("SELECT id FROM users WHERE email = 'other@example.com'")).rows.length === 0, "Registration failure rolls back user and tokens");
  check((await db.query("SELECT id FROM registration_otps WHERE identifier = 'other@example.com'")).rows.length === 1, "Failed registration preserves proof for retry");
  resetLimits();
  check((await post("/register", { ...input, email: "other@example.com", nic: "199099999999", registrationToken: otherProof })).status === 409, "Database rejects duplicate phone");
  check((await post("/register", { ...input, email: "other@example.com", nic: "199099999999", phone: "0777654321", registrationToken: otherProof })).status === 201, "Corrected registration succeeds");
  const concurrentEmail = "concurrent@example.com", otp = await createRegistrationOtp(concurrentEmail, "email");
  const proofs = await Promise.all([1, 2].map(() => verifyRegistrationOtp(concurrentEmail, "email", otp)));
  check(proofs.filter(r => r.valid).length === 1, "Concurrent registration OTP verification issues one proof");
  resetLimits();
  const concurrentInput = { ...input, email: concurrentEmail, phone: "0776666666", nic: "199011111111", registrationToken: proofs.find(r => r.valid)!.registrationToken };
  const registrations = await Promise.all([1, 2].map(() => post("/register", concurrentInput)));
  check(registrations.filter(r => r.status === 201).length === 1 && registrations.every(r => r.status < 500), "Concurrent registration creates one user without server errors");

  resetLimits(); await allowResend(id); failEmail = true;
  const failedMail = await post("/forgot-password", { email: input.email }), missingMail = await post("/forgot-password", { email: "missing@example.com" });
  await processPasswordResetJobs();
  check(JSON.stringify(failedMail.data) === JSON.stringify(missingMail.data), "Email outage does not reveal account existence");
  check((await db.query("SELECT id FROM password_reset_tokens WHERE user_id = $1 AND used_at IS NULL", [id])).rows.length === 0, "Email delivery failure invalidates challenge");
  check((await db.query("SELECT status FROM password_reset_email_jobs WHERE user_id = $1", [id])).rows[0].status === "pending", "Email delivery failures are queued for retry");
  failEmail = false;
  await allowResend(id);
  await db.query("UPDATE password_reset_email_jobs SET next_attempt_at = NOW() WHERE user_id = $1", [id]);
  const emailCount = emails.length;
  await Promise.all([processPasswordResetJobs(), processPasswordResetJobs()]);
  check(emails.length === emailCount + 1, "Concurrent queue workers deliver each pending job once");
  check((await db.query("SELECT status, attempts FROM password_reset_email_jobs WHERE user_id = $1", [id])).rows[0].status === "sent", "Email retry succeeds after outage recovery");
  await allowResend(id);
  await db.query("UPDATE password_reset_email_jobs SET status = 'processing', attempts = 0, lease_until = NOW() - INTERVAL '1 second' WHERE user_id = $1", [id]);
  await processPasswordResetJobs();
  check((await db.query("SELECT status FROM password_reset_email_jobs WHERE user_id = $1", [id])).rows[0].status === "sent", "Expired worker lease is recovered after restart");
  failEmail = true;
  await db.query("UPDATE password_reset_email_jobs SET status = 'pending', attempts = 2, next_attempt_at = NOW() WHERE user_id = $1", [id]);
  await allowResend(id); await processPasswordResetJobs();
  check((await db.query("SELECT status FROM password_reset_email_jobs WHERE user_id = $1", [id])).rows[0].status === "failed", "Repeated email failures stop after three attempts");
  failEmail = false; process.env.NODE_ENV = "production";
  assert.throws(() => createApp(), /Configure SMTP/); passed++;
  process.env.NODE_ENV = "test";
  check(true, "Production refuses console-only email");
  resetLimits();
  for (let i = 0; i < 10; i++) {
    const response = await fetch(base + "/api/auth/login", {
      method: "POST", headers: { "Content-Type": "application/json", "X-Forwarded-For": "198.51.100." + (i + 1) },
      body: JSON.stringify({ email: "missing" + i + "@example.com", password: "Password123!" }),
    });
    check(response.status === 401, "Login attempts tracked per IP across identifiers");
  }
  check((await post("/login", { email: "different@example.com", password: "Password123!" })).status === 429, "Identifier and forwarding-header changes cannot bypass rate limit");
  console.log("\n" + passed + " security and integration checks passed.");
}
main().catch(error => { console.error("Test failed:", error); process.exitCode = 1; }).finally(async () => {
  if (server) await new Promise<void>(resolve => server!.close(() => resolve()));
  await pool?.end(); await fresh?.end();
  for (const name of created.reverse()) await admin.query('DROP DATABASE "' + name + '" WITH (FORCE)');
  await admin.end();
});

