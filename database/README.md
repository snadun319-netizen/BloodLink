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
