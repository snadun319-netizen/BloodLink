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
