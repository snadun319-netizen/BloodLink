ALTER TABLE organizations ADD COLUMN IF NOT EXISTS branch_name VARCHAR(100);
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS parent_organization_id INTEGER REFERENCES organizations(id) ON DELETE RESTRICT;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'organizations'::regclass AND conname = 'organizations_not_own_parent') THEN
    ALTER TABLE organizations ADD CONSTRAINT organizations_not_own_parent CHECK (parent_organization_id IS NULL OR parent_organization_id <> id);
  END IF;
END $$;
CREATE INDEX IF NOT EXISTS organizations_parent ON organizations(parent_organization_id);
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_bank_account BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE users ADD COLUMN IF NOT EXISTS must_change_password BOOLEAN NOT NULL DEFAULT false;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'users'::regclass AND conname = 'users_bank_account_role') THEN
    ALTER TABLE users ADD CONSTRAINT users_bank_account_role CHECK (NOT is_bank_account OR (role = 'bloodbank_staff' AND organization_id IS NOT NULL));
  END IF;
END $$;
CREATE UNIQUE INDEX IF NOT EXISTS users_one_bank_account ON users(organization_id) WHERE is_bank_account;
