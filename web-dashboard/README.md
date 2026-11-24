# BloodLink administration workspaces

React + TypeScript portal with role-based workspaces. Super admins (`admin`) manage the network, bank accounts and blood request approvals. Blood bank and hospital accounts (`bloodbank_staff` / `hospital_staff`) automatically open their own institution dashboard. Banks in the same district have independent records and logins.

## Run locally

```sh
cd web-dashboard
npm ci
npm run dev
```

Open the URL Vite prints (normally `http://localhost:5173`). Use an active super admin, blood bank or hospital login; there is no demo login or role switcher.

1. Configure `backend/.env` using `backend/README.md`.
2. Run `npm run migrate` from `backend` (or `npm run db:init` for an empty database), then `npm run dev`. Migration 008 adds request review and private health messages. Existing open requests enter the approval queue; their old missions and queued push jobs are closed until review. Accounts, stock and donation history are preserved.
3. Use an existing active admin, or configure `ADMIN_EMAIL` and a strong `ADMIN_PASSWORD` in the backend environment and run `npm run seed`. There is no default password.
4. The frontend calls `http://localhost:4000/api`. Override with `VITE_API_URL` in `.env.local`, including `/api`.
5. Include the frontend's exact origin in backend `CORS_ORIGINS`. Donors use the mobile app; they cannot open either administrative workspace.

PowerShell can use `npm.cmd` instead of `npm`.

## Account-first bank setup

1. In **Bank accounts**, select **Create bank account** and enter the login email and temporary password. A bank record is not required. The account is listed as **Awaiting blood bank** and cannot sign in yet.
2. Open **Blood banks**, select **Add blood bank**, then select the account created in step 1. Only active, unassigned accounts appear. Enter the bank's name, district, address, contact details and map location. BloodLink assigns a stable code such as `BL-0001`.
3. Saving creates the approved bank and links the selected account atomically. Each bank has one primary account, and each account can belong to only one bank. Invalid or failed registration leaves the pre-created account available for retry.
4. Copy the handover credentials for the doctor or bank contact. Temporary credentials remain in this admin session between account creation and assignment, and are cleared when the final handover closes, on sign-out or on reload. They never enter browser storage or backend responses. Copy them before leaving; stored passwords cannot be retrieved later.

The **Add blood bank** shortcut after account creation preselects that account in registration. The manual two-tab flow works as well. Existing approved banks without a primary login can use **Assign bank account** in institution details to select a pre-created account.

**Bank accounts** lists both unassigned and assigned primary logins, password-change status, and suspension/reactivation. Unassigned accounts can be activated for assignment but cannot authenticate until linked to an approved, active bank. Ordinary teammates are excluded. Public blood bank/account registration is disabled.

Share the same portal URL with the bank contact. Their account opens the institution workspace automatically. First sign-in requires replacing the temporary password; successful replacement revokes sessions and returns to sign-in. Existing email/OTP recovery also clears the temporary-password requirement.

## Institution workspace

- **Dashboard:** actual stock totals, low/critical groups, approved active requests and an embedded request form.
- **Blood stock:** all eight groups, server-derived levels and updates protected against concurrent changes. Levels are Normal at 10+ units, Low at 3–9 and Critical at 0–2. Expiry/batch data is not collected and is not fabricated.
- **Blood requests:** submit a blood group, units, priority, radius, reason and optional department. Submissions remain Pending until the super admin approves them. Filter by approval/lifecycle state, inspect donor responses and coordinator messages, notify new matches, cancel requests and confirm collections after clinical screening. Collection records one unit per donor and updates stock, history and the donation interval.
- **Health alerts:** send private follow-up messages only to donors with a recorded donation at that institution. Other institutions and super admins have no access to this endpoint. The donor inbox and lock screen use generic previews; an authenticated donor opens the actual message from Notifications in the mobile app.
- **Team:** primary blood bank accounts create and suspend their own teammates. Primary accounts are managed by the super admin. Hospital accounts can view their team; teammate creation is restricted to primary blood bank logins.

The UI refreshes every 30 seconds while visible and supports explicit refresh. Sri Lanka time is used throughout. Both workspaces retain sessions in memory; reloading requires sign-in.

## Request approval

1. A bank submits a request from its dashboard or Blood requests page. No donor notification is created yet.
2. The super admin opens **Request approvals**, reviews the institution, reason, group, units, radius and department, then approves or rejects it. Rejection requires a reason visible to the bank. Cancelled and already-reviewed requests cannot be approved.
3. Approval atomically records the reviewer and creates notifications for eligible nearby donors. The mobile request/home feeds, donor responses, redispatch, donation confirmation and push worker all enforce approval. A bank cannot approve its own request by adding approval fields to the submission.
4. The bank coordinates accepted donors and confirms collections. Rejected requests can be replaced by a corrected new submission; closed requests do not reopen.

Matching uses the donor's verified blood group, availability, donation interval and chosen matching location. Donors without a matching location are excluded. Native push still requires the FCM and native-device configuration described in the backend handoff; persisted in-app notifications work independently.

## Google Maps

Copy `.env.example` to `.env.local` and configure:

```env
VITE_GOOGLE_MAPS_API_KEY=your_browser_maps_key
VITE_GOOGLE_MAPS_MAP_ID=your_map_id
```

For local prototyping, a [Maps Demo Key](https://developers.google.com/maps/demo-key)
supports maps, place search/details and Geocoding v4 without billing. Demo keys have
daily usage limits and are not intended for production. Keep the key in ignored
`.env.local`; never paste it into source code. Restart Vite after changing it.
For production, configure a billing-enabled browser key with Maps JavaScript API,
Places API (New), and Geocoding API v4, restricted to your web origins and those APIs.
A map ID is optional locally (Google's demo map ID is used); supply your own for deployment.
See [Google Maps setup](https://developers.google.com/maps/documentation/javascript/adding-a-google-map).

In the bank form, search for the bank or hospital, select a result, review the name,
address and pin, then click **Confirm this location**. Confirmation stores the bank
address automatically, saves the coordinates in hidden form fields and closes the map
panel. The address appears in the selected-location summary; there is no separate
address entry field in the bank details form.
**Change location** reopens it. Clicking a place label retrieves its details; clicking
an unlabelled point or dragging the marker looks up its address with Geocoding v4.
Move the pin to the entrance donors should use. If address lookup fails, enter the
address in the confirmation panel. Cancelling preserves the original address/pin;
unconfirmed changes cannot be submitted with the bank form. Searches are submitted
explicitly, not on every keystroke. Coordinates no longer require manual entry.

The donor's active mission receives the bank's stored address and coordinates from
the API. **Directions** opens Google Maps navigation to this exact destination;
an institution name search or a default hospital is never substituted for a missing
pin. If the bank has no coordinates, the donor is asked to contact the coordinator.
This navigation link needs no additional key or routing API integration.

## Other workflows

- Overview and aggregate stock at approved, active blood banks.
- Bank search by name, code, contact details or primary email; district/status filters; filtered CSV export.
- Institution details, Google Maps location, stock, teammates and active requests.
- Donor document and legacy institution approvals.
- Institution access suspension revokes all its staff sessions; reactivation requires signing in again.

Activity log navigation, page and overview activity feed have been removed. Backend audit records remain enabled. Data loads on entry and explicit refresh. Tokens remain in memory; reloading requires signing in again.

## Checks

```sh
npm run build
npm run lint
npm test
npm run test:browser
npm run test:institution-browser
```

Browser scripts accept `CHROMIUM_PATH` pointing to an installed Chrome/Chromium executable; the institution suite also detects common Chrome/Edge installation paths. Run backend and frontend builds first. The institution suite uses `TEST_DATABASE_URL`, or a local `MIGRATION_DATABASE_URL`/`DATABASE_URL` from `backend/.env`, with permission to create disposable databases. Remote connections require explicit `TEST_DATABASE_URL`. It exercises the real API/PostgreSQL through Chrome and deletes its test database afterward. Application tables are untouched. Screenshots are written under ignored `.qa-private/bank-dashboard-review`.

The institution tabs include stock status filters, group search and stock sorting; request collection progress; private message history; and team search, access filters and account setup status. Their styles are scoped to the operational tabs so the dashboard overview keeps its existing appearance. On narrow screens, table rows become labeled records. The institution browser suite checks these controls, persisted writes, teammate suspension/reactivation, and layouts from 320px through desktop widths.

Browser checks use an isolated Chromium profile and intercept HTTP requests with test-only fixtures. Google's SDK is simulated to test map click/drag callbacks without external requests or billing. They cover login, account creation before bank registration, account selection and credential handover, standalone bank registration, existing-bank assignment, suspension/reactivation, donor rejection, CSV export, keyboard dialogs, mobile navigation and four routes at 320/390/768/1024/1440px. They do not contact the live API or validate a real Google Maps key.

```powershell
$env:CHROMIUM_PATH = 'C:\path\to\chrome.exe'
npm.cmd run build
npm.cmd run test:browser
```

Screenshots default to the ignored `.qa-private/super-admin-review` directory; override with `QA_OUTPUT`. Backend `npm test` exercises real HTTP, password hashing and PostgreSQL against disposable databases.

For deployment, build with the public API URL and browser Maps key and serve `dist/` with an `index.html` fallback for `/admin/*`. Configure HTTPS and backend CORS.
