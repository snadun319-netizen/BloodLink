# Mobile App (React Native + TypeScript)

Run commands from `mobile-app`, with the backend running in a separate terminal
on port 4000. There is no npm application at the repository root.

```sh
npm ci
npm run type-check
npm start
```

Scan the QR code with a compatible Expo Go app on a phone connected to the same
network as your computer. The API client uses the Expo development host on port
4000 automatically. To override it, set `EXPO_PUBLIC_API_URL` in a local `.env`
file, for example `http://192.168.1.10:4000/api`, and restart Expo.

If Windows PowerShell reports that `npm.ps1` cannot run because scripts are
disabled, use `npm.cmd` instead:

```powershell
npm.cmd ci
npm.cmd run type-check
npm.cmd start -- --clear
```

After pulling dependency changes, install again before starting Expo. Missing
`expo-document-picker` or `react-native-safe-area-context` prevents bundling,
even when the Profile screen is not open, because it is imported at startup.

The Profile screen and Home feed currently use mock data. Authentication uses
the backend API; profile editing and document uploads still need backend
integration. The separate `web-dashboard` application currently shows the Vite
starter page.

## UI preview

`npm run web` opens a browser preview of the donor app. Home and Profile retain
the approved red emergency card, dark eligibility panel, paired statistics,
verification cards, and bottom navigation. Typography, text wrapping, contrast,
and touch targets are refined within that design. The Profile theme control
supports both light and dark appearances.

The development screen switcher is visible by default in Expo development mode.
Tap the **Screens** button near the bottom-right corner and select any screen
to preview it without completing preceding forms. This changes the displayed
screen; real sign-in, registration, and verification still use the backend.
For unobstructed screenshots, set `EXPO_PUBLIC_SHOW_SCREEN_PICKER=false` in the
mobile app's local `.env` and restart Expo. The switcher is hidden in production.
