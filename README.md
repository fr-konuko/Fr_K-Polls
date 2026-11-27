# JR Africa

A TypeScript polling application built with Next.js 16, React 19, and Firebase.

## What changed in version 2

- Public pages, poll results, and reports can be viewed without signing in.
- Administration moved to the unlinked, protected `/admin` route.
- Admins authenticate with Firebase Authentication and a server-verified `admin`
  custom claim; no passcode is shipped to the browser.
- Browsers do not access Firestore directly. Next.js route handlers and Server
  Actions validate and authorize all database operations.
- Voting rechecks poll status and aspirant membership inside a Firestore
  transaction.
- Voting requires a server-verified Google session and permits one vote per
  Firebase account for each position in each poll, across browsers and devices.
- Voter and administrator sessions use separate cookies and client auth apps.
- React rendering, schema validation, security headers, and deny-by-default
  Firestore rules address the injection and authorization issues in the legacy app.

The original static files remain in the repository as migration reference only.
They are not served by Next.js and should not be copied into a deployment's public
directory.

## Requirements

- Node.js 20.9 or newer
- A Firebase project with Authentication and Firestore enabled
- Firebase Admin credentials locally, or Application Default Credentials in
  managed hosting

## Local setup

1. Copy `.env.example` to `.env.local`.
2. Fill in the Firebase web values and `FIREBASE_PROJECT_ID`.
3. Enable Google sign-in in Firebase Authentication and choose a support email.
4. Configure `RESEND_API_KEY`, `CONTACT_FROM_EMAIL`, and `CONTACT_TO_EMAIL` for
   server-side contact-form delivery. The sender must use a domain verified by
   Resend.
5. For local development, set `FIREBASE_SERVICE_ACCOUNT_KEY` to a one-line
   service-account JSON value. Do not commit it.
6. Administrators can use Google sign-in or Email/Password (enable it for password
   accounts). In Authentication settings, add `localhost` and your production domain to Authorized domains. Voters use
   Google; email/password login does not grant voter access.
7. Install and start the app:

   ```powershell
   npm install
   npm run dev
   ```

Open http://localhost:3000 for the public site.

## Voter sign-in

The public `/login` page uses Firebase Google sign-in. After the Google popup
returns, the browser sends its ID token to `/api/voter/session`. The server checks
the token signature, revocation, provider, verified email, and recent sign-in,
then issues an HTTP-only `jr_voter_session` cookie valid for five days. Client
Firebase tokens are kept only in memory and cleared after creating the session.

Selecting a candidate while signed out preserves the poll and candidate in the
login URL. After sign-in the voter returns to review the selection; login never
submits a vote automatically. Sign-out clears only the voter cookie.

`POST /api/votes` verifies the voter session itself and derives the ballot ID
from the verified Firebase UID, poll, and position. Client-supplied identity is
ignored. The duplicate check and vote increment run in one Firestore transaction.
`GET /api/votes/status` reads only the signed-in account's ballots, with no-store
responses. Names and emails are not included in vote documents or public results.

## Create an administrator

Have the user sign in with Google, or create an Email/Password user in Firebase
Authentication. Copy their UID, then run
the following with Firebase Admin credentials available. The command loads
`.env.local`, including `FIREBASE_SERVICE_ACCOUNT_KEY`, automatically:

```powershell
npm run grant-admin -- FIREBASE_USER_UID
```

The user can then sign in at `/admin-login` with their Google account or their
existing email/password credentials. Google sign-in alone does not grant admin
access; the server requires the `admin` claim. Neither the login URL nor the
dashboard is linked from the public interface. Route secrecy is not treated as
authorization; every admin page and mutation verifies the server session.

## Firestore rules

Deploy the committed deny-by-default rules:

```powershell
firebase deploy --only firestore:rules
```

The Admin SDK bypasses Firestore Security Rules after the server has performed
authorization and validation. Never restore the legacy `allow read, write: if
true` rules.

## Verification

```powershell
npm run typecheck
npm run lint
npm test
npm run build
```

## Voting identity and existing polls

The limit is one vote per account, not one vote per person: a person may hold
multiple Google accounts. This is opinion polling, not verified election voting.
An operator with account access may associate account-based ballot identifiers
with users; public results do not expose this association.

Existing anonymous vote records and candidate totals remain unchanged. New
account ballots use a separate `firebase:` identity namespace and are tagged with
`identityVersion: firebase-v1`. Earlier browser votes cannot reliably be linked
to Google users; existing polls can therefore contain both kinds of participation.
Start a new poll when a clean account-only baseline is required. The legacy
`VOTER_COOKIE_SECRET` is no longer required for current voting endpoints.

## Legacy data

Existing polls and aspirants can be read by the new app if their schema matches.
The old value `Senetor` should be migrated to `Senator`, and existing result
counters should be reconciled against vote records before launch.

## Project documentation

- [Architecture](ARCHITECTURE.md)
- [Deployment and rollback](docs/DEPLOYMENT.md)
- [Security policy](SECURITY.md)
- [Contribution guide](CONTRIBUTING.md)
- [Continuous integration](.github/workflows/ci.yml)

## License

JR Africa is available under the [MIT License](LICENSE).
