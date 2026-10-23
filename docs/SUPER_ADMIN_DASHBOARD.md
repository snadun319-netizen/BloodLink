# Super admin dashboard requirements

The platform administrator manages institutions across BloodLink using the existing `admin` role. Blood bank operations and teammate management remain in a separate institution dashboard.

## Current workflows

- Admin email/password login, rotating refresh tokens and logout. Tokens remain in memory. No demo entry or public admin registration.
- Mobile app logo reused in the login screen, sidebar and favicon.
- Overview with institution counts, stock totals and a bank-account handover guide. No activity log tab, page, feed or audit-history request.
- Register a main blood bank or branch, with name, automatic stable BloodLink code, district, address, contact details and coordinates. Branches reference a main bank; nested or cyclic branch hierarchies are rejected.
- Select coordinates by clicking Google Maps or dragging the pin. Allow direct coordinate entry and a Google Maps link if a browser API key is unavailable. Browser Maps configuration is documented in `web-dashboard/README.md`.
- Admin first creates an email/password account in Bank accounts, then selects it in Blood banks > Add blood bank and completes institution details. Account creation does not create a placeholder bank. Registration links the existing account to the new approved bank atomically. Each bank has one primary account and accounts cannot be reused across banks.
- Keep new credentials in this admin session until assignment and handover, with copy support for the doctor or bank contact. Clear them after final handover or session exit. Never include plaintext passwords/hashes in backend responses, audit records, browser storage or exports.
- Bank accounts list both unassigned and assigned primary logins, password-change requirement and access status. Unassigned accounts cannot sign in. Existing approved banks can select a pre-created account through institution details. Exclude ordinary teammates.
- Temporary-password login exposes `mustChangePassword`. Protected APIs require a password change; authenticated change and email recovery clear the requirement and revoke old sessions. The separate bank dashboard consumes these endpoints.
- Public blood bank and blood-bank staff registration is blocked. Existing hospital registration behavior remains.
- Maintain search/filter/pagination/CSV export, bank editing, branch details, map links and read-only stock/team/request oversight.
- Retain donor/legacy institution approvals and institution/account suspension. Suspending an institution revokes its staff sessions.
- Preserve backend auditing despite removing activity-log UI.

## Validation

Frontend API tests cover email/password authentication, admin-only access, logout, refresh rotation and transient failures. Chromium checks use isolated HTTP fixtures and a Maps SDK stand-in to exercise onboarding, credential handover, map callbacks, branches, legacy account creation, access status, keyboard focus and responsive layouts.

Backend integration tests use disposable PostgreSQL databases and real HTTP/crypto. Coverage includes migration upgrade/repeatability, RBAC, branch validation, duplicate-account races, atomic rollback, temporary-password restrictions, password changes, recovery and session revocation. A real Google Maps key, billing and external email delivery require their configured services.

## Setup

Apply migrations through 005 before running the updated backend. Existing account credentials remain unchanged. See `web-dashboard/README.md` and `backend/README.md` for environment configuration.
