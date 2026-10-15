# Backend API (Node.js + Express + TypeScript)

Use Node.js 20.13+ and PostgreSQL 15+. Copy `.env.example` to `.env`, configure the database,
and generate two independent JWT secrets with `node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"`.
JWT secrets must be different, at least 32 characters long, and must not use example placeholders.

```sh
npm ci
npm run db:init     # empty database only
# OR npm run migrate for an existing database
npm run dev
```

For local testing, `NODE_ENV=development` and `EMAIL_TRANSPORT=console` print OTP emails to
the server terminal. OTPs are never returned by the HTTP API. For actual delivery, remove
`EMAIL_TRANSPORT=console` and set `SMTP_HOST`, `SMTP_PORT`, `SMTP_FROM`, and, if required,
`SMTP_USER` and `SMTP_PASS`. Port 465 uses TLS; other ports require STARTTLS. Production
startup fails if email transport is missing or configured as console.

Registration currently verifies the recovery **email**. The mobile app collects both
email and mobile number in Personal Details, then sends an email code automatically
when the verification step opens. The mobile number is saved but remains unverified;
SMS delivery and phone OTP verification are deferred until an SMS provider is added.
No SMS provider is configured and signup currently requires only email OTP.

The registration API flow is:

1. `POST /api/auth/send-otp` with `{ "identifier": "donor@example.com", "type": "email" }`.
2. `POST /api/auth/verify-otp` with the same identifier/type and the six-digit `otp`.
   Keep the returned opaque `registrationToken` in memory.
3. `POST /api/auth/register` with `email`, `password`, `fullName`, `phone`, `nic`,
   `bloodGroup`, and `registrationToken`. Optional `dob` uses `YYYY-MM-DD`.
   Optional `documentUrl` references an actual HTTPS document or managed upload path.
   The proof expires in 15 minutes, is tied to the email, and is consumed once.
   Omitting a document leaves the blood group unverified and creates no review request.

Passwords require 8–128 characters, uppercase and lowercase letters, a number, and a
special character. Login accepts `email`, `phone`, or a generic `identifier`, plus
`password`. Sri Lankan local phone numbers normalize to `+94`. Five incorrect logins
lock an account for 30 minutes; the attempt window resets after lockout expiry.

Password recovery:

1. `POST /api/auth/forgot-password` with `email`. The generic response is the same for
   known and unknown accounts. Email delivery is queued durably in PostgreSQL; the
   server worker sends the OTP without SMTP latency affecting the public response.
2. `POST /api/auth/verify-reset-otp` with `email` and `otp`; save the opaque `resetToken`.
3. `POST /api/auth/reset-password` with `resetToken`, `password`, optional `email`, and
   optional `confirmPassword`. Numeric reset IDs are rejected. Successful resets
   consume proof atomically, reset lockout counters, and revoke all access/refresh sessions.

Delivery jobs retry up to three times, one minute apart. A two-minute lease recovers jobs
after a worker crash. Monitor jobs with `status = 'failed'`; no plaintext OTP is stored
in the queue. The worker also cleans expired auth records every minute. If embedding
`createApp()` in another process, start and stop `startPasswordResetWorker()` explicitly.

Refresh tokens rotate once per use. Reusing a rotated token revokes its entire session
family. Logout invalidates the session's access and refresh tokens. Authentication
checks current database roles, account status, organization approval/type, token version,
and session state. Clients must coalesce simultaneous refresh requests.

Set `CORS_ORIGINS` to the permitted web origins and `TRUST_PROXY` to actual proxy
IPs/CIDRs only. IP limiters use memory and apply to one process; multi-instance
deployments need a shared rate-limit store or an ingress limiter. Database lockout,
OTP limits, cooldowns, and proof consumption apply across processes.

```sh
npm run type-check
npm test
npm run build
npm start
```

Tests use `TEST_DATABASE_URL` (or a localhost `DATABASE_URL`) with CREATEDB permission.
They create randomly named disposable databases and remove them in `finally`; they do
not run test cases against existing application tables. HTTP, PostgreSQL, transactions,
password hashing, JWTs, and middleware are real; only email delivery is captured. Seven
additional tests exercise the actual mobile API module with mocked network responses.
CI provisions PostgreSQL automatically. SMTP inbox delivery and device UI testing require
their actual external environments.

`npm run seed` requires explicit `ADMIN_EMAIL` and a strong `ADMIN_PASSWORD`; it preserves
existing passwords and never logs credentials. `SEED_DEMO_DATA=true` works only with
`NODE_ENV=development` and creates demo accounts with random unknown passwords.

See [the security review](../docs/BACKEND_SECURITY_REVIEW.md) and [migration notes](../database/README.md).
