# Super admin dashboard requirements

## Purpose and source

The platform administrator manages the BloodLink network across institutions. An institution's doctor/coordinator continues to manage that institution's stock, blood requests and confidential health alerts in its own dashboard. This portal uses the existing `admin` role; it does not introduce a second privileged database role.

Requirements derive from `PROJECT_OVERVIEW.md` sections 4.2, 4.4, 7 and 8, the existing organization/staff/donor-review APIs, and the supplied dashboard screenshots. The screenshots establish the BloodLink red, pale lavender surfaces, left navigation, summary cards and compact tables.

## Accepted scope

| Area | Required behavior |
| --- | --- |
| Authentication | Existing email/password login, admin-only access, rotating refresh tokens, logout. Tokens remain in memory, never browser storage. Reload requires signing in again. |
| Overview | Blood-bank count, approved/active banks, pending bank registrations, critical stock entries, aggregate units by blood group, recent bank registrations, approvals and audit activity. All operational totals derive from database records. |
| Blood-bank directory | Search by name/address/contact, district and lifecycle filters, pagination, create bank, edit contact/location/evidence details, inspect bank-specific stock, staff and active requests. |
| Institution lifecycle | New banks start pending. Review pending banks/hospitals, approve or reject. Suspend/reactivate approved institutions separately from verification. Suspension immediately blocks institution staff access and revokes their sessions. No destructive institution deletion. |
| Staff accounts | Provision an active institution account with a strong initial password for an approved, active institution; show assigned institution and role; activate/suspend accounts. Existing self-registrations appear as inactive/awaiting approval because the current schema represents both with `suspended`. No role escalation or super-admin creation through the UI. |
| Approvals | Review pending institutions and donor blood-group documents. Show document references and HTTPS evidence links; support approval and rejection, with a reason for donor rejection. Managed upload references are displayed, not treated as publicly downloadable URLs. |
| Activity | Search recent audit entries, show actor, event, target and time in Asia/Colombo. New institution create/edit/access and staff-provisioning endpoints persist audit records in the same transaction. Approval and individual user-status changes reuse the existing audited endpoints. |
| UX | Responsive desktop/tablet/mobile layouts, keyboard-accessible dialogs, labelled controls, loading/empty/error states, refresh/retry, confirmation before access changes, CSV export of the current directory filter. |
| Demo | Explicit opt-in demo from login, clearly marked throughout. Synthetic in-memory data supports the same management interactions and resets on leaving demo/reload. Never silently substitute demo data for a failed live API request. |

## Boundaries

Stock and active requests are read-only oversight. Stock updates, emergency broadcasts, donor matching, health alerts and clinical decisions remain institution workflows. Do not expose confidential donor health findings, exact donor coordinates, passwords, tokens or hashes in the portal. Do not claim real-time synchronization: live data loads on entry and explicit refresh.

District, contact email and institution access status require `migration_003_admin_network.sql`. Existing records keep access enabled; missing contact/location details appear as not provided. The new admin API paths are protected by the existing database-backed RBAC middleware.

## Acceptance checks

1. Donors/staff cannot call the network administration endpoints; anonymous requests fail authentication.
2. An admin can create a pending blood bank, edit it, approve it and provision its staff account.
3. An unapproved or suspended bank cannot receive a new staff account or authenticate/refresh existing staff sessions. Reactivation does not restore revoked sessions.
4. Directory search, filters, pagination, export and bank details work for empty and populated data.
5. Approval and access changes refresh affected totals and activity; errors remain visible and do not show false success.
6. Admin login rejects non-admin accounts; concurrent API requests share one refresh operation.
7. Backend integration tests run against disposable databases, including fresh-schema and upgrade coverage. Frontend production compilation and browser interaction checks cover the portal.

## Local setup

See `web-dashboard/README.md`. Run the migration explicitly before starting the updated backend. No hosted deployment or production database changes are part of this implementation.

## Verified implementation

- Backend production build and 172 security/integration checks passed against disposable PostgreSQL databases, including migration 003, directory aggregation, admin/staff RBAC, suspension, refresh revocation and audit-failure rollback. Seven existing mobile API client tests also passed.
- Frontend production build and five API client tests passed, including non-admin rejection, concurrent refresh, temporary outage retry and malformed response handling.
- Chromium checks passed for bank create/edit/approval/access, staff provisioning/access, donor rejection, filtered CSV export, audit records, modal keyboard behavior, sign-out/demo reset and all five routes at 320, 390, 768, 1024 and 1440 pixels.
- Live browser-to-production-server deployment was not performed. Browser workflows use explicit synthetic demo records; HTTP/PostgreSQL integration is covered separately by the backend suite.
