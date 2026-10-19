-- Network administration metadata and an access switch independent of verification.
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS district VARCHAR(50);
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS contact_email VARCHAR(255);
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT true;
CREATE INDEX IF NOT EXISTS organizations_type_district ON organizations (type, district);
