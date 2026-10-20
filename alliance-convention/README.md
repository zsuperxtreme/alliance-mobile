# React + Vite

This template provides a minimal setup to get React working in Vite with HMR and some Oxlint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Uploading users to Firestore

Open `/admin` and select a CSV with the `Staff No`, `Name`, `Mobile Number`,
`Table Number`, `TnG`, `Redeem Code`, `Eligible`, and `Checked In` columns.
The importer also accepts the legacy `No` and `Prize` headers. These values are
saved as `staffNo`, `name`, `mobileNumber`, `tableNumber`, `tng`, `redeemCode`,
`eligible`, and `checkedIn` fields in Firestore. Malaysian mobile numbers are
normalized to `012-3456789` or `012-34567890`; that formatted value is saved in
`mobileNumber` and used as the Firestore document ID. Re-uploading a CSV with
the same phone number updates that document rather than creating a duplicate,
and records not present in the CSV are not deleted.
Rows with a missing required value or an invalid mobile number are skipped; the
upload summary shows how many rows were ignored.

Set `VITE_FIREBASE_API_KEY` in the app's environment before running or building.
The project ID defaults to `alliance-convention`; set `VITE_FIREBASE_PROJECT_ID`
to override it. Optionally set `VITE_FIREBASE_AUTH_DOMAIN`. Use the Firebase web
app configuration from the Firebase console.

The `/admin` route is not an authentication boundary. Restrict Firestore writes
with Firebase Authentication and Firestore security rules before deploying this
upload feature.
The admin page can permanently delete every document in the Firestore `users`
collection after confirmation, or download the current collection as
`firestore-users.csv`.

## Expanding the Oxlint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and Oxlint's TypeScript related rules in your project.
