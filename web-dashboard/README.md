# BloodLink network administration

React + TypeScript portal for the platform's existing `admin` role. This is the super admin workspace across all blood banks, separate from an institution's stock/request/health-alert dashboard.

## Run locally

```sh
cd web-dashboard
npm ci
npm run dev
```

Open the URL Vite prints (normally `http://localhost:5173`). Select **Open demo dashboard** to explore with synthetic data. Demo edits, approvals and account changes are in memory and reset when you exit demo or reload. Demo never calls the real backend.

For real data:

1. Configure `backend/.env` as described in `backend/README.md`.
2. From `backend`, run `npm run migrate` against your intended database, then start the backend with `npm run dev`. For a new empty database, use `npm run db:init` instead of `migrate`.
3. Use an existing active admin account, or set your own `ADMIN_EMAIL` and strong `ADMIN_PASSWORD` in the backend environment and run `npm run seed`. Existing account passwords are preserved; there is no default admin password.
4. The frontend calls `http://localhost:4000/api` by default. To override it, copy `.env.example` to `.env.local` and set `VITE_API_URL` to the API base URL including `/api`. Restart Vite after changing it.
5. Include the frontend's exact origin in backend `CORS_ORIGINS`. Sign in using the admin email/password. Institution staff and donors cannot use this portal.

PowerShell installations that block `npm.ps1` can use `npm.cmd` for the commands above.

## Included workflows

- Network overview and aggregate blood stock at approved, active blood banks.
- Search/filter/paginate the blood-bank directory; export the current filter as CSV.
- Add a bank in pending state; edit district, contact details, institution coordinates and evidence references.
- Review bank/hospital registrations and donor blood-group submissions.
- View institution stock, assigned staff and active requests without modifying clinical operations.
- Suspend/reactivate institution access. Suspension revokes all institution staff sessions; reactivation requires a fresh sign-in.
- Provision institution staff; activate or suspend individual accounts.
- Search/filter the latest 100 audit entries. Times display in Asia/Colombo.

Institution verification and access status are distinct. Existing self-registered staff use `status = 'suspended'`, so the UI calls that state **Inactive / awaiting approval** rather than assuming all suspended accounts are new applications.

Authentication tokens stay in memory. Reloading requires signing in again. Requests share a refresh operation; a temporary network/API outage preserves the session for retry. No production data is replaced with demo records when requests fail. Live records update on entry and explicit refresh, not through a live subscription.

## Checks

```sh
npm run build
npm run type-check
npm test
```

The browser checks use installed Chromium through the Chrome DevTools Protocol. They create an isolated temporary browser profile, serve the production build on loopback port 5187 and stop the browser/server on completion. They do not use your normal browser profile or contact the live API.

```powershell
$env:CHROMIUM_PATH = 'C:\path\to\chrome.exe'
npm.cmd run build
npm.cmd run test:browser
```

`QA_OUTPUT` optionally selects the screenshot directory; it defaults to the ignored `.qa-private/super-admin-review` directory in the repository. Coverage includes bank create/edit/approval/access, staff provision/activation/suspension, donor rejection, CSV filtering, audit updates, modal keyboard behavior, mobile navigation and all five routes at 320/390/768/1024/1440px. Backend `npm test` separately exercises live HTTP/PostgreSQL workflows in disposable databases.

For deployment, build the frontend with its public API URL and serve `dist/` with a fallback to `index.html` for `/admin/*` routes. Use HTTPS and configure backend CORS for the deployed origin. No hosting deployment is included here.

See [finalized requirements](../docs/SUPER_ADMIN_DASHBOARD.md).
