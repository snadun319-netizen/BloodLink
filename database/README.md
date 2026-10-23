# Database (PostgreSQL + PostGIS)

The current schema uses PostgreSQL tables and numeric coordinates; the PostGIS matching
engine and its spatial indexes are not yet implemented.

For a new empty database, run `npm run db:init` from `backend`. For an existing database,
back it up and run `npm run migrate`. The runner serializes migrations with an advisory
lock, applies all pending SQL files in one transaction, and records file checksums in
`schema_migrations`. Re-running applied migrations does not repeat their side effects.

`migration_001_auth_tables.sql` adds auth tables/columns to older installations.
`migration_002_security_hardening.sql` adds secure proof hashes, session versions,
a durable reset-email queue, normalized identity indexes, a single pending donor review
per donor, coordinate/counter constraints, and timezone-aware timestamps.

`migration_003_admin_network.sql` adds institution district, contact email and an
`is_active` access switch for network administration. Existing institutions keep
access enabled; contact/location metadata is optional. Suspending an approved
institution is separate from rejecting its registration and revokes staff sessions.

`migration_004_bank_onboarding.sql` adds main-bank/branch relationships and a unique
primary account per blood bank or branch. New admin-provisioned bank accounts must
replace their temporary password. Existing accounts retain their passwords and do
not receive a forced reset. The migration runner accepts equivalent LF/CRLF SQL
checkouts while continuing to reject substantive changes to applied migrations.

The upgrade intentionally logs out pre-upgrade sessions, invalidates old registration
codes and insecure reset grants, and normalizes emails, NICs, and Sri Lankan phone formats.
It preserves users, password hashes, profiles, verification documents, and audit history.
Legacy naive timestamps are interpreted as UTC; installations that historically stored
another timezone must adapt that conversion before running the migration.

Duplicate normalized emails/NICs/phone numbers or duplicate pending donor reviews cause
the transaction to fail, preserving the existing database. Resolve those conflicts
explicitly; the migration does not guess which account/document to delete.

Donor blood groups remain unverified until an administrator approves an actual document.
Approval updates `blood_group` and `blood_group_verified` in the same transaction.
Future matching queries must require this flag alongside availability and eligibility.

Run the API with a limited database role, not a PostgreSQL superuser. Use a separate
migration owner and a separate CREATEDB-capable test account. Production backups, database
TLS, document access control, retention policies, and monitoring require deployment setup.

`migration_005_account_first_onboarding.sql` allows primary bank accounts to exist before a bank record is created. Unassigned accounts remain unable to authenticate. Registering a bank assigns one pre-created account atomically; the unique primary-account index continues to prevent duplicate bank links. Existing assignments and credentials are preserved.
