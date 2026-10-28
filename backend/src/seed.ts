import crypto from "crypto";
import { pool } from "./db";
import { hashPassword } from "./services/password.service";
import { emailValue, validatePasswordStrength } from "./middleware/validation.middleware";
import { transaction } from "./transaction";

export async function seed(): Promise<void> {
  const email = emailValue(process.env.ADMIN_EMAIL);
  const password = process.env.ADMIN_PASSWORD;
  if (!validatePasswordStrength(password).valid) throw new Error("Set a strong ADMIN_PASSWORD explicitly; no default admin credentials are created");
  const demo = process.env.SEED_DEMO_DATA === "true";
  if (demo && process.env.NODE_ENV !== "development") throw new Error("Demo data is allowed only in development");
  const hash = await hashPassword(password!);
  await transaction(async client => {
    const admin = (await client.query(
      "INSERT INTO users (email, password_hash, role, status) VALUES ($1, $2, 'admin', 'active') ON CONFLICT (email) DO NOTHING RETURNING id",
      [email, hash]
    )).rows[0] || (await client.query("SELECT id, role FROM users WHERE email = $1", [email])).rows[0];
    if (admin.role && admin.role !== "admin") throw new Error("ADMIN_EMAIL belongs to a non-admin account");
    if (!demo) return;
    const org = (await client.query("SELECT id FROM organizations WHERE name = 'BloodLink Demo Blood Bank'")).rows[0] ||
      (await client.query("INSERT INTO organizations (name, type, verification_status, verified_by, verified_at) VALUES ('BloodLink Demo Blood Bank', 'bloodbank', 'approved', $1, NOW()) RETURNING id", [admin.id])).rows[0];
    const demoHash = await hashPassword(crypto.randomBytes(32).toString("base64"));
    await client.query(
      "INSERT INTO users (email, password_hash, role, organization_id, status) VALUES ('demo.staff@example.com', $1, 'bloodbank_staff', $2, 'suspended') ON CONFLICT (email) DO NOTHING",
      [demoHash, org.id]
    );
    const donor = (await client.query(
      "INSERT INTO users (email, password_hash, role, status) VALUES ('demo.donor@example.com', $1, 'donor', 'active') ON CONFLICT (email) DO NOTHING RETURNING id",
      [demoHash]
    )).rows[0] || (await client.query("SELECT id FROM users WHERE email = 'demo.donor@example.com'")).rows[0];
    await client.query("INSERT INTO donor_profiles (user_id, full_name, blood_group) VALUES ($1, 'Demo Donor', 'O+') ON CONFLICT (user_id) DO NOTHING", [donor.id]);

    const sabHospital = (await client.query("SELECT id FROM organizations WHERE name = 'Sabaragamuwa Provincial General Hospital'")).rows[0] ||
      (await client.query(`
        INSERT INTO organizations (name, type, district, address, contact_phone, contact_email, branch_name, latitude, longitude, verification_status, is_active)
        VALUES ('Sabaragamuwa Provincial General Hospital', 'hospital', 'Ratnapura', 'Hospital Rd, Ratnapura 70000', '+94 45 222 2261', 'sabaragamuwa.gh@health.gov.lk', 'Emergency Trauma Unit', 6.6828, 80.4034, 'approved', true)
        RETURNING id
      `)).rows[0];

    const teachHospital = (await client.query("SELECT id FROM organizations WHERE name = 'Teaching Hospital Ratnapura'")).rows[0] ||
      (await client.query(`
        INSERT INTO organizations (name, type, district, address, contact_phone, contact_email, branch_name, latitude, longitude, verification_status, is_active)
        VALUES ('Teaching Hospital Ratnapura', 'hospital', 'Ratnapura', 'Main Street, Ratnapura', '+94 45 222 3444', 'th.ratnapura@health.gov.lk', 'Hematology Ward', 6.6945, 80.3980, 'approved', true)
        RETURNING id
      `)).rows[0];

    await client.query(`
      INSERT INTO blood_requests (organization_id, blood_group, required_units, priority, radius_km, status)
      SELECT $1, 'O-', 2, 'Emergency', 25.0, 'Active'
      WHERE NOT EXISTS (SELECT 1 FROM blood_requests WHERE organization_id = $1 AND blood_group = 'O-' AND priority = 'Emergency' AND status = 'Active')
    `, [sabHospital.id]);

    await client.query(`
      INSERT INTO blood_requests (organization_id, blood_group, required_units, priority, radius_km, status)
      SELECT $1, 'O-', 1, 'Urgent', 15.0, 'Active'
      WHERE NOT EXISTS (SELECT 1 FROM blood_requests WHERE organization_id = $1 AND blood_group = 'O-' AND priority = 'Urgent' AND status = 'Active')
    `, [teachHospital.id]);
  });
  console.log("Seed completed. Existing passwords were preserved; no credentials are logged.");
}
if (require.main === module) {
  seed().catch(error => { console.error("Seed failed:", error.code || error.message); process.exitCode = 1; }).finally(() => pool.end());
}
