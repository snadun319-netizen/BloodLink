-- Blood banks are standalone organizations. Keep the former branch label only
-- as a hospital department, and remove bank hierarchy data from the model.
DROP INDEX IF EXISTS organizations_parent;
ALTER TABLE organizations DROP CONSTRAINT IF EXISTS organizations_not_own_parent;
ALTER TABLE organizations RENAME COLUMN branch_name TO department;
UPDATE organizations SET department = NULL WHERE type = 'bloodbank';
ALTER TABLE organizations DROP COLUMN parent_organization_id;
