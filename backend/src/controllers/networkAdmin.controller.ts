import { Response } from "express";
import { PoolClient } from "pg";
import { AuthRequest } from "../middleware/auth.middleware";
import { pool } from "../db";
import { transaction, HttpError } from "../transaction";
import { hashPassword } from "../services/password.service";
import { revokeAllUserTokens } from "../services/token.service";

async function audit(client: PoolClient, req: AuthRequest, action: string, targetType: string, targetId: number, metadata: object) {
  await client.query(
    "INSERT INTO audit_logs (actor_user_id, action, target_type, target_id, metadata, ip_address) VALUES ($1, $2, $3, $4, $5, $6)",
    [req.user!.id, action, targetType, targetId, JSON.stringify(metadata), req.ip || null]
  );
}

export async function listNetworkOrganizations(req: AuthRequest, res: Response) {
  const result = await pool.query(`
    SELECT o.*,
      (SELECT email FROM users WHERE organization_id = o.id AND is_bank_account) AS account_email,
      (SELECT name FROM organizations WHERE id = o.parent_organization_id) AS parent_name,
      (SELECT COUNT(*)::integer FROM users u WHERE u.organization_id = o.id AND u.role IN ('hospital_staff', 'bloodbank_staff')) AS staff_count,
      (SELECT COALESCE(SUM(s.available_units), 0)::integer FROM blood_stocks s WHERE s.organization_id = o.id) AS total_units,
      (SELECT COUNT(*)::integer FROM blood_stocks s WHERE s.organization_id = o.id AND s.status = 'Critical') AS critical_groups,
      (SELECT COUNT(*)::integer FROM blood_requests r WHERE r.organization_id = o.id AND r.status = 'Active') AS active_requests
    FROM organizations o ORDER BY o.created_at DESC, o.id DESC`);
  res.json({ organizations: result.rows });
}

export async function networkOverview(req: AuthRequest, res: Response) {
  const result = await pool.query(`SELECT
    (SELECT COUNT(*)::integer FROM organizations WHERE type = 'bloodbank') AS total_banks,
    (SELECT COUNT(*)::integer FROM organizations WHERE type = 'bloodbank' AND verification_status = 'approved' AND is_active) AS active_banks,
    (SELECT COUNT(*)::integer FROM organizations WHERE type = 'bloodbank' AND verification_status = 'pending') AS pending_banks,
    (SELECT COUNT(*)::integer FROM blood_stocks s JOIN organizations o ON o.id = s.organization_id WHERE o.type = 'bloodbank' AND o.verification_status = 'approved' AND o.is_active AND s.status = 'Critical') AS critical_groups,
    (SELECT COUNT(*)::integer FROM blood_requests r JOIN organizations o ON o.id = r.organization_id WHERE o.type = 'bloodbank' AND o.verification_status = 'approved' AND o.is_active AND r.status = 'Active') AS active_requests,
    (SELECT COALESCE(json_agg(stock), '[]'::json) FROM (
      SELECT s.blood_group, SUM(s.available_units)::integer AS units
      FROM blood_stocks s JOIN organizations o ON o.id = s.organization_id
      WHERE o.type = 'bloodbank' AND o.verification_status = 'approved' AND o.is_active
      GROUP BY s.blood_group
    ) stock) AS stock`);
  res.json(result.rows[0]);
}

export async function networkOrganizationDetails(req: AuthRequest, res: Response) {
  const organization = (await pool.query("SELECT * FROM organizations WHERE id = $1", [req.params.id])).rows[0];
  if (!organization) throw new HttpError(404, "Institution not found");
  const [stock, staff, requests] = await Promise.all([
    pool.query("SELECT blood_group, available_units, status, updated_at FROM blood_stocks WHERE organization_id = $1 ORDER BY blood_group", [req.params.id]),
    pool.query("SELECT id, email, role, status, created_at FROM users WHERE organization_id = $1 ORDER BY id", [req.params.id]),
    pool.query("SELECT id, blood_group, required_units, priority, created_at FROM blood_requests WHERE organization_id = $1 AND status = 'Active' ORDER BY created_at DESC", [req.params.id]),
  ]);
  res.json({ organization, stock: stock.rows, staff: staff.rows, requests: requests.rows });
}

export async function createNetworkOrganization(req: AuthRequest, res: Response) {
  const { name, type, district, address, contactPhone, contactEmail, latitude, longitude, registrationEvidenceUrl } = req.body;
  const organization = await transaction(async client => {
    const row = (await client.query(`
      INSERT INTO organizations (name, type, district, address, contact_phone, contact_email, latitude, longitude, registration_evidence_url)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *`,
      [name, type, district, address, contactPhone, contactEmail, latitude, longitude, registrationEvidenceUrl]
    )).rows[0];
    await audit(client, req, "ORGANIZATION_CREATED", "organization", row.id, { organizationName: name });
    return row;
  });
  res.status(201).json({ organization });
}

export async function editNetworkOrganization(req: AuthRequest, res: Response) {
  const { name, district, address, contactPhone, contactEmail, latitude, longitude, registrationEvidenceUrl, branchName, parentOrganizationId } = req.body;
  const organization = await transaction(async client => {
    await validateParent(client, parentOrganizationId, Number(req.params.id));
    const row = (await client.query(`UPDATE organizations SET name = $1, district = $2, address = $3,
      contact_phone = $4, contact_email = $5, latitude = $6, longitude = $7, registration_evidence_url = $8, branch_name = $9, parent_organization_id = $10
      WHERE id = $11 RETURNING *`, [name, district, address, contactPhone, contactEmail, latitude, longitude, registrationEvidenceUrl, branchName, parentOrganizationId, req.params.id])).rows[0];
    if (!row) throw new HttpError(404, "Institution not found");
    await audit(client, req, "ORGANIZATION_UPDATED", "organization", row.id, { organizationName: name });
    return row;
  });
  res.json({ organization });
}

export async function setNetworkOrganizationAccess(req: AuthRequest, res: Response) {
  const organization = await transaction(async client => {
    const row = (await client.query("SELECT * FROM organizations WHERE id = $1 FOR UPDATE", [req.params.id])).rows[0];
    if (!row) throw new HttpError(404, "Institution not found");
    if (row.verification_status !== "approved") throw new HttpError(409, "Approve the institution before changing its access");
    const users = (await client.query("SELECT id FROM users WHERE organization_id = $1 AND role IN ('hospital_staff', 'bloodbank_staff') ORDER BY id FOR UPDATE", [row.id])).rows;
    await client.query("UPDATE organizations SET is_active = $1 WHERE id = $2", [req.body.isActive, row.id]);
    if (!req.body.isActive) for (const user of users) await revokeAllUserTokens(user.id, client);
    await audit(client, req, req.body.isActive ? "ORGANIZATION_REACTIVATED" : "ORGANIZATION_SUSPENDED", "organization", row.id, { organizationName: row.name });
    return { ...row, is_active: req.body.isActive };
  });
  res.json({ organization });
}

export async function listNetworkStaff(req: AuthRequest, res: Response) {
  const result = await pool.query(`SELECT u.id, u.email, u.role, u.organization_id, u.status, u.created_at,
    o.name AS organization_name, o.verification_status AS organization_status, o.is_active AS organization_active
    FROM users u LEFT JOIN organizations o ON o.id = u.organization_id
    WHERE u.role IN ('hospital_staff', 'bloodbank_staff') ORDER BY u.created_at DESC, u.id DESC`);
  res.json({ staff: result.rows });
}

export async function createNetworkStaff(req: AuthRequest, res: Response) {
  const { email, password, role, organizationId } = req.body;
  const passwordHash = await hashPassword(password);
  const user = await transaction(async client => {
    const org = (await client.query("SELECT * FROM organizations WHERE id = $1 FOR UPDATE", [organizationId])).rows[0];
    if (!org) throw new HttpError(404, "Institution not found");
    if (org.verification_status !== "approved" || !org.is_active) throw new HttpError(403, "Institution must be approved and active");
    if (org.type !== (role === "hospital_staff" ? "hospital" : "bloodbank")) throw new HttpError(400, "Staff role does not match institution type");
    const row = (await client.query(`INSERT INTO users (email, password_hash, role, organization_id, status)
      VALUES ($1, $2, $3, $4, 'active') RETURNING id, email, role, organization_id, status, created_at`,
      [email, passwordHash, role, organizationId])).rows[0];
    await audit(client, req, "STAFF_CREATED", "user", row.id, { email, organizationName: org.name });
    return row;
  });
  res.status(201).json({ user });
}

async function validateParent(client: PoolClient, parentId: number | null, currentId?: number) {
  // Serialize branch changes so concurrent edits cannot turn a main bank into its own descendant.
  await client.query("SELECT pg_advisory_xact_lock(178442362)");
  if (currentId && parentId && (await client.query("SELECT id FROM organizations WHERE parent_organization_id = $1 LIMIT 1", [currentId])).rowCount) throw new HttpError(409, "A main bank with branches cannot become a branch");
  if (!parentId) return;
  const parent = (await client.query("SELECT type, parent_organization_id FROM organizations WHERE id = $1", [parentId])).rows[0];
  if (parentId === currentId || !parent || parent.type !== "bloodbank" || parent.parent_organization_id) throw new HttpError(400, "Select a main blood bank as the parent");
}

async function availableBankAccount(client: PoolClient, accountId: number) {
  const user = (await client.query(`SELECT id, email, role, organization_id, status, is_bank_account, must_change_password, created_at
    FROM users WHERE id = $1 FOR UPDATE`, [accountId])).rows[0];
  if (!user || !user.is_bank_account || user.role !== "bloodbank_staff") throw new HttpError(404, "Bank account not found");
  if (user.organization_id !== null) throw new HttpError(409, "This account is already assigned to a blood bank");
  if (user.status !== "active") throw new HttpError(403, "Activate the account before assigning it to a blood bank");
  return user;
}

async function linkBankAccount(client: PoolClient, req: AuthRequest, org: { id: number; name: string }, user: { id: number; email: string }) {
  const row = (await client.query(`UPDATE users SET organization_id = $1, updated_at = NOW() WHERE id = $2
    RETURNING id, email, role, organization_id, status, is_bank_account, must_change_password, created_at`, [org.id, user.id])).rows[0];
  await audit(client, req, "BANK_ACCOUNT_ASSIGNED", "user", user.id, { email: user.email, organizationName: org.name, organizationId: org.id });
  return row;
}

export async function onboardBloodBank(req: AuthRequest, res: Response) {
  const { name, district, address, contactPhone, contactEmail, latitude, longitude, registrationEvidenceUrl, branchName, parentOrganizationId, accountId } = req.body;
  const result = await transaction(async client => {
    await validateParent(client, parentOrganizationId);
    const selectedAccount = await availableBankAccount(client, accountId);
    const organization = (await client.query(`INSERT INTO organizations
      (name, type, district, address, contact_phone, contact_email, latitude, longitude, registration_evidence_url, branch_name, parent_organization_id, verification_status, verified_by, verified_at)
      VALUES ($1, 'bloodbank', $2, $3, $4, $5, $6, $7, $8, $9, $10, 'approved', $11, NOW()) RETURNING *`,
      [name, district, address, contactPhone, contactEmail, latitude, longitude, registrationEvidenceUrl, branchName, parentOrganizationId, req.user!.id])).rows[0];
    await audit(client, req, "ORGANIZATION_CREATED", "organization", organization.id, { organizationName: name });
    const user = await linkBankAccount(client, req, organization, selectedAccount);
    return { organization, user };
  });
  res.status(201).json(result);
}

export async function createBankAccount(req: AuthRequest, res: Response) {
  const passwordHash = await hashPassword(req.body.password);
  const user = await transaction(async client => {
    const row = (await client.query(`INSERT INTO users (email, password_hash, role, organization_id, status, is_bank_account, must_change_password)
      VALUES ($1, $2, 'bloodbank_staff', NULL, 'active', true, true)
      RETURNING id, email, role, organization_id, status, is_bank_account, must_change_password, created_at`, [req.body.accountEmail, passwordHash])).rows[0];
    await audit(client, req, "BANK_ACCOUNT_CREATED", "user", row.id, { email: row.email });
    return row;
  });
  res.status(201).json({ user });
}

export async function assignBankAccount(req: AuthRequest, res: Response) {
  const user = await transaction(async client => {
    // Lock the bank before the account, consistently with institution suspension.
    const org = (await client.query("SELECT * FROM organizations WHERE id = $1 FOR UPDATE", [req.params.id])).rows[0];
    if (!org || org.type !== "bloodbank") throw new HttpError(404, "Blood bank not found");
    if (!org.is_active || org.verification_status !== "approved") throw new HttpError(403, "Blood bank must be approved and active");
    if ((await client.query("SELECT id FROM users WHERE organization_id = $1 AND is_bank_account", [org.id])).rowCount) throw new HttpError(409, "This blood bank already has a primary account");
    const selectedAccount = await availableBankAccount(client, req.body.accountId);
    return linkBankAccount(client, req, org, selectedAccount);
  });
  res.json({ user });
}

export async function listBankAccounts(req: AuthRequest, res: Response) {
  const result = await pool.query(`SELECT u.id, u.email, u.role, u.organization_id, u.status, u.created_at, u.is_bank_account, u.must_change_password,
    o.name AS organization_name, o.verification_status AS organization_status, o.is_active AS organization_active
    FROM users u LEFT JOIN organizations o ON o.id = u.organization_id WHERE u.is_bank_account ORDER BY u.created_at DESC, u.id DESC`);
  res.json({ accounts: result.rows });
}
