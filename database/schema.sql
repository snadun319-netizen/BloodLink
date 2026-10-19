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
  district VARCHAR(50),
  contact_email VARCHAR(255),
  branch_name VARCHAR(100),
  parent_organization_id INTEGER REFERENCES organizations(id) ON DELETE RESTRICT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  latitude NUMERIC(10, 7),
  longitude NUMERIC(10, 7),
  verification_status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (verification_status IN ('pending', 'approved', 'rejected')),
  verified_by INTEGER,
  verified_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
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
  is_bank_account BOOLEAN NOT NULL DEFAULT false,
  must_change_password BOOLEAN NOT NULL DEFAULT false,
  failed_login_attempts INTEGER NOT NULL DEFAULT 0,
  locked_until TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
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
  date_of_birth DATE,
  blood_group VARCHAR(5) CHECK (blood_group IN ('A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-')),
  is_available BOOLEAN NOT NULL DEFAULT true,
  latitude NUMERIC(10, 7),
  longitude NUMERIC(10, 7),
  last_donation_date DATE,
  next_eligible_date DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
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
  reviewed_at TIMESTAMPTZ,
  rejection_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
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
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
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
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
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
  responded_at TIMESTAMPTZ,
  sent_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
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
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
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
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- -----------------------------------------------------------------------------
-- 10. Password Reset Tokens (OTP-based Password Recovery)
-- -----------------------------------------------------------------------------
CREATE TABLE password_reset_tokens (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  otp_hash TEXT NOT NULL,
  attempts INTEGER NOT NULL DEFAULT 0,
  max_attempts INTEGER NOT NULL DEFAULT 5,
  expires_at TIMESTAMPTZ NOT NULL,
  used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for efficient lookup and cleanup
CREATE INDEX idx_password_reset_tokens_user_id ON password_reset_tokens(user_id);
CREATE INDEX idx_password_reset_tokens_expires_at ON password_reset_tokens(expires_at);

-- -----------------------------------------------------------------------------
-- 11. Refresh Tokens (Token Rotation & Blacklisting)
-- -----------------------------------------------------------------------------
CREATE TABLE refresh_tokens (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL UNIQUE,
  family_id VARCHAR(64) NOT NULL,
  is_revoked BOOLEAN NOT NULL DEFAULT false,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for efficient lookup and cleanup
CREATE INDEX idx_refresh_tokens_user_id ON refresh_tokens(user_id);
CREATE INDEX idx_refresh_tokens_family_id ON refresh_tokens(family_id);
CREATE INDEX idx_refresh_tokens_token_hash ON refresh_tokens(token_hash);

-- -----------------------------------------------------------------------------
-- 12. Registration OTPs (Phone/Email verification during signup)
-- -----------------------------------------------------------------------------
CREATE TABLE registration_otps (
  id SERIAL PRIMARY KEY,
  identifier VARCHAR(255) NOT NULL,
  identifier_type VARCHAR(10) NOT NULL CHECK (identifier_type IN ('email', 'phone')),
  otp_hash TEXT NOT NULL,
  attempts INTEGER NOT NULL DEFAULT 0,
  max_attempts INTEGER NOT NULL DEFAULT 5,
  expires_at TIMESTAMPTZ NOT NULL,
  verified_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_registration_otps_identifier ON registration_otps(identifier);
CREATE INDEX idx_registration_otps_expires_at ON registration_otps(expires_at);

-- Baseline hardening (also available as migration_002 for existing installs).
-- Apply transactionally; conflicting legacy records must be corrected first.
ALTER TABLE users ADD COLUMN IF NOT EXISTS token_version INTEGER NOT NULL DEFAULT 0;
ALTER TABLE registration_otps ADD COLUMN IF NOT EXISTS verification_token_hash TEXT;
ALTER TABLE password_reset_tokens ADD COLUMN IF NOT EXISTS verified_at TIMESTAMPTZ;
ALTER TABLE password_reset_tokens ADD COLUMN IF NOT EXISTS reset_token_hash TEXT;
ALTER TABLE donor_profiles ADD COLUMN IF NOT EXISTS blood_group_verified BOOLEAN NOT NULL DEFAULT false;

-- Old registration challenges never issued secure proofs; invalidate them on upgrade.
DELETE FROM registration_otps WHERE verification_token_hash IS NULL;

CREATE TABLE IF NOT EXISTS password_reset_email_jobs (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'sent', 'failed', 'cancelled')),
  attempts INTEGER NOT NULL DEFAULT 0 CHECK (attempts >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  next_attempt_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  lease_until TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS password_reset_email_jobs_pending ON password_reset_email_jobs (next_attempt_at) WHERE status IN ('pending', 'processing');

DO $$
DECLARE column_record RECORD;
BEGIN
  FOR column_record IN SELECT table_name, column_name FROM information_schema.columns
    WHERE table_schema = current_schema() AND data_type = 'timestamp without time zone'
      AND table_name IN ('users', 'organizations', 'donor_profiles', 'donor_verifications',
        'blood_stocks', 'blood_requests', 'notifications', 'donations', 'audit_logs',
        'registration_otps', 'password_reset_tokens', 'refresh_tokens')
  LOOP
    EXECUTE format('ALTER TABLE %I ALTER COLUMN %I TYPE TIMESTAMPTZ USING %I AT TIME ZONE ''UTC''',
      column_record.table_name, column_record.column_name, column_record.column_name);
  END LOOP;
END $$;

UPDATE users SET email = LOWER(BTRIM(email)) WHERE email <> LOWER(BTRIM(email));
UPDATE donor_profiles SET nic = UPPER(BTRIM(nic)) WHERE nic <> UPPER(BTRIM(nic));
UPDATE donor_profiles SET phone = regexp_replace(phone, '[[:space:]()\-]', '', 'g') WHERE phone IS NOT NULL;
UPDATE donor_profiles SET phone = '+94' || SUBSTRING(phone FROM 2) WHERE phone ~ '^0[0-9]{9}$';
UPDATE donor_profiles SET phone = '+' || phone WHERE phone ~ '^94[0-9]{9}$';

CREATE UNIQUE INDEX IF NOT EXISTS users_email_normalized_unique ON users (LOWER(BTRIM(email)));
CREATE UNIQUE INDEX IF NOT EXISTS donor_profiles_nic_unique ON donor_profiles (UPPER(BTRIM(nic))) WHERE nic IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS donor_profiles_phone_unique ON donor_profiles (phone) WHERE phone IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS donor_verifications_one_pending ON donor_verifications (donor_id) WHERE status = 'pending';
CREATE UNIQUE INDEX IF NOT EXISTS registration_otps_identifier_type_unique ON registration_otps (identifier, identifier_type);
CREATE UNIQUE INDEX IF NOT EXISTS registration_otps_proof_unique ON registration_otps (verification_token_hash) WHERE verification_token_hash IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS password_reset_proof_unique ON password_reset_tokens (reset_token_hash) WHERE reset_token_hash IS NOT NULL;
CREATE INDEX IF NOT EXISTS refresh_tokens_active_session ON refresh_tokens (user_id, family_id, expires_at) WHERE NOT is_revoked;
CREATE INDEX IF NOT EXISTS donor_verifications_status_created ON donor_verifications (status, created_at);
CREATE INDEX IF NOT EXISTS organizations_status_created ON organizations (verification_status, created_at);
CREATE INDEX IF NOT EXISTS users_organization_id ON users (organization_id);
CREATE INDEX IF NOT EXISTS audit_logs_actor_user_id ON audit_logs (actor_user_id);
CREATE INDEX IF NOT EXISTS audit_logs_created_at ON audit_logs (created_at);

DO $$
DECLARE item RECORD;
BEGIN
  FOR item IN SELECT * FROM (VALUES
    ('users', 'users_auth_counters_check', 'failed_login_attempts >= 0 AND token_version >= 0'),
    ('users', 'users_email_canonical_check', 'email = LOWER(BTRIM(email)) AND LENGTH(email) > 3'),
    ('donor_profiles', 'donor_profiles_latitude_check', 'latitude BETWEEN -90 AND 90'),
    ('donor_profiles', 'donor_profiles_longitude_check', 'longitude BETWEEN -180 AND 180'),
    ('donor_profiles', 'donor_profiles_eligibility_check', 'next_eligible_date IS NULL OR last_donation_date IS NULL OR next_eligible_date >= last_donation_date'),
    ('organizations', 'organizations_name_check', 'LENGTH(BTRIM(name)) > 0'),
    ('organizations', 'organizations_latitude_check', 'latitude BETWEEN -90 AND 90'),
    ('organizations', 'organizations_longitude_check', 'longitude BETWEEN -180 AND 180'),
    ('blood_requests', 'blood_requests_radius_check', 'radius_km > 0'),
    ('registration_otps', 'registration_otps_attempts_check', 'attempts >= 0 AND max_attempts > 0'),
    ('password_reset_tokens', 'password_reset_attempts_check', 'attempts >= 0 AND max_attempts > 0'),
    ('password_reset_tokens', 'password_reset_proof_check', 'reset_token_hash IS NULL OR verified_at IS NOT NULL')
  ) AS checks(table_name, constraint_name, expression)
  LOOP
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = item.constraint_name AND conrelid = to_regclass(item.table_name)) THEN
      EXECUTE format('ALTER TABLE %I ADD CONSTRAINT %I CHECK (%s)', item.table_name, item.constraint_name, item.expression);
    END IF;
  END LOOP;
END $$;

UPDATE donor_profiles dp SET blood_group_verified = true, blood_group = latest.claimed_blood_group
FROM (SELECT DISTINCT ON (donor_id) donor_id, claimed_blood_group, status
      FROM donor_verifications ORDER BY donor_id, id DESC) latest
WHERE dp.user_id = latest.donor_id AND latest.status = 'approved';

-- Invalidate insecure grants and sessions from the previous implementation.
UPDATE password_reset_tokens SET used_at = NOW() WHERE used_at IS NULL AND reset_token_hash IS NULL;
UPDATE refresh_tokens SET is_revoked = true;

ALTER TABLE organizations ADD CONSTRAINT organizations_not_own_parent CHECK (parent_organization_id IS NULL OR parent_organization_id <> id);
ALTER TABLE users ADD CONSTRAINT users_bank_account_role CHECK (NOT is_bank_account OR role = 'bloodbank_staff');
CREATE UNIQUE INDEX users_one_bank_account ON users(organization_id) WHERE is_bank_account;
CREATE INDEX organizations_parent ON organizations(parent_organization_id);
