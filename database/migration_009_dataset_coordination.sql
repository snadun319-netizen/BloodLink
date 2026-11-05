-- Keep source facts separate from operational outreach state.
ALTER TABLE donor_profiles ADD COLUMN IF NOT EXISTS consent_status TEXT NOT NULL DEFAULT 'not_provided'
  CHECK (consent_status IN ('granted','withdrawn','not_provided'));
ALTER TABLE donor_profiles ADD COLUMN IF NOT EXISTS consent_recorded_at TIMESTAMPTZ;
ALTER TABLE donor_profiles ADD COLUMN IF NOT EXISTS availability_updated_at TIMESTAMPTZ;
ALTER TABLE donor_profiles ADD COLUMN IF NOT EXISTS city TEXT;
ALTER TABLE donor_profiles ADD COLUMN IF NOT EXISTS province TEXT;
ALTER TABLE donor_profiles ADD COLUMN IF NOT EXISTS source_verification_status TEXT;
ALTER TABLE donor_profiles ADD COLUMN IF NOT EXISTS is_simulated BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS is_simulated BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE blood_requests ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ;
ALTER TABLE blood_requests ADD COLUMN IF NOT EXISTS outreach_target INTEGER CHECK (outreach_target > 0);
ALTER TABLE blood_requests ADD COLUMN IF NOT EXISTS source_status TEXT;
ALTER TABLE blood_requests ADD COLUMN IF NOT EXISTS is_simulated BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE donations ADD COLUMN IF NOT EXISTS is_simulated BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE donations ADD COLUMN IF NOT EXISTS interval_policy_review_required BOOLEAN NOT NULL DEFAULT false;
CREATE INDEX IF NOT EXISTS requests_expiry ON blood_requests(expires_at) WHERE status='Active';
CREATE INDEX IF NOT EXISTS donors_consent_freshness ON donor_profiles(availability_updated_at)
  WHERE consent_status='granted' AND is_available AND blood_group_verified;
