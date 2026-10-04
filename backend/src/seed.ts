import dotenv from "dotenv";
import { pool } from "./db";
import { hashPassword } from "./services/password.service";

dotenv.config();

async function seed() {
  console.log("🌱 Starting BloodLink database seeding...\n");

  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    // 1. Seed Super Admin
    const adminEmail = process.env.ADMIN_EMAIL || "admin@bloodlink.lk";
    const adminPassword = process.env.ADMIN_PASSWORD || "Admin@BloodLink2026!";

    const adminCheck = await client.query(
      "SELECT id FROM users WHERE email = $1",
      [adminEmail],
    );

    let adminId: number;
    if (adminCheck.rows.length === 0) {
      const hashedAdminPassword = await hashPassword(adminPassword);
      const res = await client.query(
        `INSERT INTO users (email, password_hash, role, status)
         VALUES ($1, $2, 'admin', 'active')
         RETURNING id`,
        [adminEmail, hashedAdminPassword],
      );
      adminId = res.rows[0].id;
      console.log(`✅ Super Admin created: ${adminEmail} (password: ${adminPassword})`);
    } else {
      adminId = adminCheck.rows[0].id;
      console.log(`ℹ️  Super Admin already exists: ${adminEmail}`);
    }

    // 2. Seed Sample Organizations
    // A) Approved Blood Bank
    let approvedOrgId: number;
    const approvedOrgCheck = await client.query(
      "SELECT id FROM organizations WHERE name = $1",
      ["National Blood Transfusion Service (Colombo)"],
    );

    if (approvedOrgCheck.rows.length === 0) {
      const res = await client.query(
        `INSERT INTO organizations (name, type, registration_evidence_url, verification_status, verified_by, verified_at)
         VALUES ($1, 'bloodbank', 'https://example.com/docs/nbts-evidence.pdf', 'approved', $2, NOW())
         RETURNING id`,
        ["National Blood Transfusion Service (Colombo)", adminId],
      );
      approvedOrgId = res.rows[0].id;
      console.log(`✅ Approved Organization created: NBTS Colombo (ID: ${approvedOrgId})`);
    } else {
      approvedOrgId = approvedOrgCheck.rows[0].id;
      console.log(`ℹ️  Approved Organization already exists: NBTS Colombo (ID: ${approvedOrgId})`);
    }

    // B) Pending Hospital
    const pendingOrgCheck = await client.query(
      "SELECT id FROM organizations WHERE name = $1",
      ["Kandy Teaching Hospital"],
    );

    if (pendingOrgCheck.rows.length === 0) {
      const res = await client.query(
        `INSERT INTO organizations (name, type, registration_evidence_url, verification_status)
         VALUES ($1, 'hospital', 'https://example.com/docs/kandy-evidence.pdf', 'pending')
         RETURNING id`,
        ["Kandy Teaching Hospital"],
      );
      console.log(`✅ Pending Organization created: Kandy Teaching Hospital (ID: ${res.rows[0].id})`);
    } else {
      console.log(`ℹ️  Pending Organization already exists: Kandy Teaching Hospital`);
    }

    // 3. Seed Hospital & Blood Bank Staff Accounts
    const defaultStaffPassword = "Staff@BloodLink2026!";
    const hashedStaffPassword = await hashPassword(defaultStaffPassword);

    // Approved Staff
    const activeStaffEmail = "staff.colombo@bloodlink.lk";
    const activeStaffCheck = await client.query(
      "SELECT id FROM users WHERE email = $1",
      [activeStaffEmail],
    );

    if (activeStaffCheck.rows.length === 0) {
      await client.query(
        `INSERT INTO users (email, password_hash, role, organization_id, status)
         VALUES ($1, $2, 'bloodbank_staff', $3, 'active')`,
        [activeStaffEmail, hashedStaffPassword, approvedOrgId],
      );
      console.log(`✅ Active Staff created: ${activeStaffEmail} (password: ${defaultStaffPassword})`);
    } else {
      console.log(`ℹ️  Active Staff already exists: ${activeStaffEmail}`);
    }

    // Suspended / Pending Staff (Awaiting Admin Approval)
    const pendingStaffEmail = "staff.pending@bloodlink.lk";
    const pendingStaffCheck = await client.query(
      "SELECT id FROM users WHERE email = $1",
      [pendingStaffEmail],
    );

    if (pendingStaffCheck.rows.length === 0) {
      await client.query(
        `INSERT INTO users (email, password_hash, role, organization_id, status)
         VALUES ($1, $2, 'hospital_staff', $3, 'suspended')`,
        [pendingStaffEmail, hashedStaffPassword, approvedOrgId],
      );
      console.log(`✅ Pending Staff (Suspended) created: ${pendingStaffEmail} (password: ${defaultStaffPassword})`);
    } else {
      console.log(`ℹ️  Pending Staff already exists: ${pendingStaffEmail}`);
    }

    // 4. Seed Donors
    const defaultDonorPassword = "Donor@BloodLink2026!";
    const hashedDonorPassword = await hashPassword(defaultDonorPassword);

    const donorEmail = "donor1@example.com";
    const donorCheck = await client.query(
      "SELECT id FROM users WHERE email = $1",
      [donorEmail],
    );

    let donorId: number;
    if (donorCheck.rows.length === 0) {
      const res = await client.query(
        `INSERT INTO users (email, password_hash, role, status)
         VALUES ($1, $2, 'donor', 'active')
         RETURNING id`,
        [donorEmail, hashedDonorPassword],
      );
      donorId = res.rows[0].id;
      console.log(`✅ Sample Donor created: ${donorEmail} (password: ${defaultDonorPassword})`);
    } else {
      donorId = donorCheck.rows[0].id;
      console.log(`ℹ️  Sample Donor already exists: ${donorEmail}`);
    }

    // 5. Seed Donor Blood-Group Verification Request (Pending Review)
    const verificationCheck = await client.query(
      "SELECT id FROM donor_verifications WHERE donor_id = $1",
      [donorId],
    );

    if (verificationCheck.rows.length === 0) {
      const res = await client.query(
        `INSERT INTO donor_verifications (donor_id, document_url, claimed_blood_group, status)
         VALUES ($1, 'https://example.com/docs/donor1-blood-card.pdf', 'O+', 'pending')
         RETURNING id`,
        [donorId],
      );
      console.log(`✅ Pending Donor Verification created for ${donorEmail} (Claimed: O+, ID: ${res.rows[0].id})`);
    } else {
      console.log(`ℹ️  Donor Verification already exists for ${donorEmail}`);
    }

    await client.query("COMMIT");

    console.log("\n🎉 Seeding completed successfully!");
    console.log("-----------------------------------------------------------------");
    console.log("🔐 Credentials for Testing:");
    console.log(`   [Admin]        Email: ${adminEmail} | Password: ${adminPassword}`);
    console.log(`   [Staff-Active] Email: ${activeStaffEmail} | Password: ${defaultStaffPassword}`);
    console.log(`   [Staff-Pending]Email: ${pendingStaffEmail} | Password: ${defaultStaffPassword}`);
    console.log(`   [Donor]        Email: ${donorEmail} | Password: ${defaultDonorPassword}`);
    console.log("-----------------------------------------------------------------\n");
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("❌ Seeding failed:", error);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

seed();
