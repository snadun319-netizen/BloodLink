# BloodLink network administration

React + TypeScript portal for the existing `admin` role. Admins register blood banks and branches and provide each with a primary login account. Blood bank operations and teammate management belong to a separate bank dashboard.

## Run locally

```sh
cd web-dashboard
npm ci
npm run dev
```

Open the URL Vite prints (normally `http://localhost:5173`). Sign in with an active administrator email and password; there is no demo login.

1. Configure `backend/.env` using `backend/README.md`.
2. Run `npm run migrate` from `backend` (or `npm run db:init` for an empty database), then `npm run dev`. Migrations 004 and 005 add branches, primary accounts and account-first assignment. Existing accounts keep their passwords and permissions.
3. Use an existing active admin, or configure `ADMIN_EMAIL` and a strong `ADMIN_PASSWORD` in the backend environment and run `npm run seed`. There is no default password.
4. The frontend calls `http://localhost:4000/api`. Override with `VITE_API_URL` in `.env.local`, including `/api`.
5. Include the frontend's exact origin in backend `CORS_ORIGINS`. Staff and donor accounts cannot use this admin portal.

PowerShell can use `npm.cmd` instead of `npm`.

## Account-first bank setup

1. In **Bank accounts**, select **Create bank account** and enter the login email and temporary password. A bank record is not required. The account is listed as **Awaiting blood bank** and cannot sign in yet.
2. Open **Blood banks**, select **Add blood bank**, then select the account created in step 1. Only active, unassigned accounts appear. Enter the bank's name, district, address, contact details and map location. Select a main bank and enter a branch name to register a branch. BloodLink assigns a stable code such as `BL-0001`.
3. Saving creates the approved bank and links the selected account atomically. Each bank/branch has one primary account, and each account can belong to only one bank. Invalid or failed registration leaves the pre-created account available for retry.
4. Copy the handover credentials for the doctor or bank contact. Temporary credentials remain in this admin session between account creation and assignment, and are cleared when the final handover closes, on sign-out or on reload. They never enter browser storage or backend responses. Copy them before leaving; stored passwords cannot be retrieved later.

The **Add blood bank** shortcut after account creation preselects that account in registration. The manual two-tab flow works as well. Existing approved banks without a primary login can use **Assign bank account** in institution details to select a pre-created account.

**Bank accounts** lists both unassigned and assigned primary logins, password-change status, and suspension/reactivation. Unassigned accounts can be activated for assignment but cannot authenticate until linked to an approved, active bank. Ordinary teammates are excluded. Public blood bank/account registration is disabled.

The bank must replace its temporary password before protected operations. Its future dashboard should use `user.mustChangePassword` from login/current-user responses, then call `POST /api/auth/change-password` with `currentPassword`, `password`, and `confirmPassword`. Successful change revokes all sessions and requires a fresh login. Existing email/OTP recovery also clears the temporary-password requirement. The bank dashboard and teammate-management screens are not implemented in this portal.

## Google Maps

Copy `.env.example` to `.env.local` and configure:

```env
VITE_GOOGLE_MAPS_API_KEY=your_browser_maps_key
VITE_GOOGLE_MAPS_MAP_ID=your_map_id
```

Enable Maps JavaScript API and billing for the browser key, restrict it to your web origins and that API, and restart Vite. A map ID is optional locally (Google's demo map ID is used); supply your own for deployment. See [Google Maps setup](https://developers.google.com/maps/documentation/javascript/adding-a-google-map).

Click the map to select a bank location or drag its pin. Coordinates remain editable, and the form also supports current location and opening Google Maps. When no key is configured or Maps fails, use the Google Maps link and enter both coordinates. No server API keys are copied into frontend configuration.

## Other workflows

- Overview and aggregate stock at approved, active blood banks.
- Bank search by name, code, branch, contact details or primary email; district/status filters; filtered CSV export.
- Institution details, branch links, Google Maps location, stock, teammates and active requests.
- Donor document and legacy institution approvals.
- Institution access suspension revokes all its staff sessions; reactivation requires signing in again.

Activity log navigation, page and overview activity feed have been removed. Backend audit records remain enabled. Data loads on entry and explicit refresh. Tokens remain in memory; reloading requires signing in again.

## Checks

```sh
npm run build
npm run lint
npm test
```

Browser checks use an isolated Chromium profile and intercept HTTP requests with test-only fixtures. Google's SDK is simulated to test map click/drag callbacks without external requests or billing. They cover login, account creation before bank registration, account selection and credential handover, branches, existing-bank assignment, suspension/reactivation, donor rejection, CSV export, keyboard dialogs, mobile navigation and four routes at 320/390/768/1024/1440px. They do not contact the live API or validate a real Google Maps key.

```powershell
$env:CHROMIUM_PATH = 'C:\path\to\chrome.exe'
npm.cmd run build
npm.cmd run test:browser
```

Screenshots default to the ignored `.qa-private/super-admin-review` directory; override with `QA_OUTPUT`. Backend `npm test` exercises real HTTP, password hashing and PostgreSQL against disposable databases.

For deployment, build with the public API URL and browser Maps key and serve `dist/` with an `index.html` fallback for `/admin/*`. Configure HTTPS and backend CORS.
