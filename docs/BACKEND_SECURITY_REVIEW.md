# Backend and database security review

Reviewed on 2026-10-12. Scope: every backend controller, route, middleware, service,
database/seed/migration script, dependency manifest, and CI setup, plus the mobile
authentication API and screens required to preserve compatibility.

| Finding | Severity | Resolution |
| --- | --- | --- |
| Password reset accepted a predictable database ID without requiring OTP verification | Critical | Random 256-bit proof issued after OTP verification, hashed at rest, account-bound, expiring, and consumed once |
| Registration could bypass OTP verification | High | Registration requires single-use proof of recovery-email ownership |
| Concurrent OTP/reset/refresh requests could reuse grants or evade counters | High | Transactions, row/advisory locks, consistent lock ordering, and unique constraints |
| Suspended accounts and reset/logout sessions could retain access tokens | High | Current account/organization checks, session-family checks, and credential versions on every protected request |
| Client-supplied forwarding headers and varying identifiers could weaken throttling | High | Proxy trust opt-in; IP keys use the library's IPv6-aware behavior |
| Production email could silently log rather than deliver; OTPs appeared in API responses | High | Explicit console development mode; mandatory SMTP in production; no OTP API fields |
| Email delivery latency could reveal registered accounts | Medium | Durable PostgreSQL reset-mail queue; generic public response independent of SMTP delivery |
| Public staff registration lacked type/strength validation and role/organization consistency | Medium | Typed input checks, password policy, registration limits, role/type and approval checks |
| Registration committed before session creation; duplicates could leave partial records | Medium | User/profile/proof/session issuance in one transaction; normalized unique identities |
| Malformed bodies/dates/IDs could cause 500 responses or invalid persisted values | Medium | Object/type/length/date/ID validation and safe JSON errors |
| Donor document approval did not update the verified profile group | Medium | Atomic review/profile update with explicit verification flag |
| Seed scripts used known default credentials and printed passwords | High | Explicit admin credentials, no password logs, development-only demo accounts with random passwords |
| Audit queries dropped records whose actor had been deleted | Low | LEFT JOIN preserves historical logs |
| Migrations were not tracked transactionally; naive timestamp behavior varied | Medium | Transactional, checksum-tracked migrations and explicit UTC conversion |

The npm audit initially reported six advisories: proxy-addr (critical), qs (moderate),
and development-watcher dependencies (high). Compatible patches and removal of the
unused vulnerable watcher/crypto-random-string dependency produced an audit with no
reported vulnerabilities. The development server now uses Node's native watch mode.

Validation includes real disposable PostgreSQL databases, a legacy upgrade, fresh
schema creation, migration repeatability, real HTTP routes, crypto, and concurrent
operations. Tests capture email transport rather than sending mail to real recipients.
All 137 backend/database security and integration checks and seven mobile API tests
passed. Backend/mobile type checks, the backend build, the compiled server startup
smoke test, and the final npm audit passed; the audit reported zero vulnerabilities.
Client tests cover concurrent refresh, invalid refresh responses, rejected sessions,
and network/server outages.

The local database was backed up under ignored `.qa-private/` before migration.
Local development was explicitly configured to print OTP emails to the server terminal.
Existing JWT secrets were preserved. The migration revokes pre-upgrade sessions.

Operational limits:

- Live SMTP inbox delivery and physical-device UI behavior were not verified here.
- Multi-instance deployments need shared IP throttling; current IP stores are local to
  the process. Account lockout and OTP attempts/cooldowns are enforced in PostgreSQL.
- Document upload/storage and PostGIS matching are unfinished modules. Registration
  succeeds without inventing documents, leaving the donor's blood group unverified.
- Rotate credentials of any existing accounts created using the old public seed defaults.
  The upgrade intentionally preserves existing account passwords.
- Deployment TLS, least-privilege database grants, private document storage, retention,
  monitoring of failed email jobs, and regulatory compliance need environment-specific review.
- This review and passing tests reduce known risks; they do not prove the absence of
  every possible vulnerability or bug.

Reference guidance: [OWASP password recovery](https://cheatsheetseries.owasp.org/cheatsheets/Forgot_Password_Cheat_Sheet.html)
and [Express proxy trust configuration](https://expressjs.com/en/guide/behind-proxies/).
