# Frk Polls

A TypeScript polling application built with Next.js 16, React 19, and Firebase.

## What changed in version 2

- The public navigation contains only Home, Vote, and Results.
- Administration moved to the unlinked, protected `/admin` route.
- Admins authenticate with Firebase Authentication and a server-verified `admin`
  custom claim; no passcode is shipped to the browser.
- Browsers do not access Firestore directly. Next.js route handlers and Server
  Actions validate and authorize all database operations.
- Voting rechecks poll status and aspirant membership inside a Firestore
  transaction.
- Multi-position polls allow one vote per browser cookie for each position.
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
3. Set `VOTER_COOKIE_SECRET` to at least 32 random characters.
4. Configure `RESEND_API_KEY`, `CONTACT_FROM_EMAIL`, and `CONTACT_TO_EMAIL` for
   server-side contact-form delivery. The sender must use a domain verified by
   Resend.
5. For local development, set `FIREBASE_SERVICE_ACCOUNT_KEY` to a one-line
   service-account JSON value. Do not commit it.
6. Enable Email/Password sign-in in Firebase Authentication.
7. Install and start the app:

   ```powershell
   npm install
   npm run dev
   ```

Open http://localhost:3000 for the public site.

## Create an administrator

Create an Email/Password user in Firebase Authentication, copy their UID, then run
the following with Firebase Admin credentials available. The command loads
`.env.local`, including `FIREBASE_SERVICE_ACCOUNT_KEY`, automatically:

```powershell
npm run grant-admin -- FIREBASE_USER_UID
```

The user can then sign in at `/admin-login`. Neither the login URL nor the
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

## Important voting limitation

The included voter limit uses a signed, HTTP-only browser cookie. It is stronger
than the legacy editable local-storage token, but a person can still vote again by
clearing browser data or using another device. For official elections, add verified
voter identity, an eligibility register, audit logging, rate limiting, App Check,
and a documented ballot-secrecy model.

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

Frk Polls is available under the [MIT License](LICENSE).
