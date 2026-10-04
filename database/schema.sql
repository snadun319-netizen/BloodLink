-- =============================================================================
-- BloodLink Database Schema
-- Smart Blood Donation Coordination System
-- Target DBMS: PostgreSQL 15+
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. Organizations (Hospitals and Blood Banks)
-- -----------------------------------------------------------------------------
CREATE TABLE organizations (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  type VARCHAR(20) NOT NULL CHECK (type IN ('hospital', 'bloodbank')),
  registration_evidence_url TEXT,
  address TEXT,
  contact_phone VARCHAR(20),
  latitude NUMERIC(10, 7),
  longitude NUMERIC(10, 7),
  verification_status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (verification_status IN ('pending', 'approved', 'rejected')),
  verified_by INTEGER,
  verified_at TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- -----------------------------------------------------------------------------
-- 2. Users (Accounts: Donors, Hospital Staff, Blood Bank Staff, Admins)
-- -----------------------------------------------------------------------------
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  role VARCHAR(20) NOT NULL CHECK (role IN ('donor', 'hospital_staff', 'bloodbank_staff', 'admin')),
  organization_id INTEGER REFERENCES organizations(id) ON DELETE SET NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'suspended')),
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Link organizations.verified_by to users(id) now that users exists
ALTER TABLE organizations ADD CONSTRAINT fk_org_verified_by
  FOREIGN KEY (verified_by) REFERENCES users(id) ON DELETE SET NULL;

-- -----------------------------------------------------------------------------
-- 3. Donor Profiles (Detailed Donor Information for Matching & Reminders)
-- -----------------------------------------------------------------------------
CREATE TABLE donor_profiles (
  id SERIAL PRIMARY KEY,
  user_id INTEGER UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  full_name VARCHAR(255),
  nic VARCHAR(20),
  phone VARCHAR(20),
  blood_group VARCHAR(5) CHECK (blood_group IN ('A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-')),
  is_available BOOLEAN NOT NULL DEFAULT true,
  latitude NUMERIC(10, 7),
  longitude NUMERIC(10, 7),
  last_donation_date DATE,
  next_eligible_date DATE,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- -----------------------------------------------------------------------------
-- 4. Donor Blood Group Verification Requests (Admin Review Workflow)
-- -----------------------------------------------------------------------------
CREATE TABLE donor_verifications (
  id SERIAL PRIMARY KEY,
  donor_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  document_url TEXT NOT NULL,
  claimed_blood_group VARCHAR(5) NOT NULL CHECK (claimed_blood_group IN ('A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-')),
  status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  reviewed_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  reviewed_at TIMESTAMP,
  rejection_reason TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- -----------------------------------------------------------------------------
-- 5. Blood Stock Inventory (Hospital & Blood Bank Stock Management)
-- -----------------------------------------------------------------------------
CREATE TABLE blood_stocks (
  id SERIAL PRIMARY KEY,
  organization_id INTEGER NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  blood_group VARCHAR(5) NOT NULL CHECK (blood_group IN ('A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-')),
  available_units INTEGER NOT NULL DEFAULT 0 CHECK (available_units >= 0),
  status VARCHAR(20) NOT NULL DEFAULT 'Normal' CHECK (status IN ('Normal', 'Low', 'Critical')),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  UNIQUE (organization_id, blood_group)
);

-- -----------------------------------------------------------------------------
-- 6. Blood Requests (Hospital Emergency & Routine Blood Requests)
-- -----------------------------------------------------------------------------
CREATE TABLE blood_requests (
  id SERIAL PRIMARY KEY,
  organization_id INTEGER NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  blood_group VARCHAR(5) NOT NULL CHECK (blood_group IN ('A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-')),
  required_units INTEGER NOT NULL CHECK (required_units > 0),
  priority VARCHAR(20) NOT NULL DEFAULT 'Normal' CHECK (priority IN ('Normal', 'Urgent', 'Emergency')),
  radius_km NUMERIC(5, 2) NOT NULL DEFAULT 20.0,
  status VARCHAR(20) NOT NULL DEFAULT 'Active' CHECK (status IN ('Active', 'Fulfilled', 'Cancelled')),
  created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- -----------------------------------------------------------------------------
-- 7. Notifications & Donor Responses (Push Alerts Dispatched to Donors)
-- -----------------------------------------------------------------------------
CREATE TABLE notifications (
  id SERIAL PRIMARY KEY,
  request_id INTEGER NOT NULL REFERENCES blood_requests(id) ON DELETE CASCADE,
  donor_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  response_status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (response_status IN ('pending', 'accepted', 'declined')),
  responded_at TIMESTAMP,
  sent_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- -----------------------------------------------------------------------------
-- 8. Donations (Donation Records for History & Eligibility Calculation)
-- -----------------------------------------------------------------------------
CREATE TABLE donations (
  id SERIAL PRIMARY KEY,
  donor_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  organization_id INTEGER NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  units_donated INTEGER NOT NULL DEFAULT 1 CHECK (units_donated > 0),
  donation_date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- -----------------------------------------------------------------------------
-- 9. Audit Logs (Audit Trail for Sensitive Administrative Actions)
-- -----------------------------------------------------------------------------
CREATE TABLE audit_logs (
  id SERIAL PRIMARY KEY,
  actor_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  action VARCHAR(100) NOT NULL,
  target_type VARCHAR(50),
  target_id INTEGER,
  metadata JSONB,
  ip_address VARCHAR(45),
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);
