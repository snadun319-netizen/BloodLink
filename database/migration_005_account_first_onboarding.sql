-- Primary bank accounts can be created before a blood bank is registered.
-- Unassigned staff accounts cannot authenticate: organization checks still apply.
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_bank_account_role;
ALTER TABLE users ADD CONSTRAINT users_bank_account_role CHECK (NOT is_bank_account OR role = 'bloodbank_staff');
-- The existing partial unique index keeps one primary account per assigned bank.
