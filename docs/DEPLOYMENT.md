# Deployment guide

## Deployment model

Frk Polls requires a Next.js-compatible Node.js or serverless runtime because
authentication, Firestore access, Server Actions, and vote transactions execute
on the server. Do not configure the project as a static export and do not publish
**legacy-static/**.

Suitable targets include Firebase App Hosting, Google Cloud Run, and hosting
platforms with full Next.js App Router support.

## 1. Prepare Firebase

1. Create or select a dedicated Firebase project for the environment.
2. Enable Cloud Firestore in the required region.
3. Enable Email/Password in Firebase Authentication.
4. Register a Firebase web application for administrator sign-in.
5. Restrict the public web API key to the expected APIs and deployed domains.
6. Configure budget alerts, audit-log retention, and operational contacts.

Use separate Firebase projects for development, staging, and production. Never
test migrations or rules against production first.

## 2. Configure environment variables

| Variable | Visibility | Purpose |
| --- | --- | --- |
| NEXT_PUBLIC_FIREBASE_API_KEY | Browser | Firebase Authentication web client |
| NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN | Browser | Firebase Authentication domain |
| NEXT_PUBLIC_FIREBASE_PROJECT_ID | Browser | Firebase web project |
| NEXT_PUBLIC_FIREBASE_APP_ID | Browser | Firebase web application |
| FIREBASE_PROJECT_ID | Server | Admin SDK project |
| FIREBASE_SERVICE_ACCOUNT_KEY | Server secret | Local or unsupported-host credential |
| VOTER_COOKIE_SECRET | Server secret | Signs anonymous voter cookies |
| RESEND_API_KEY | Server secret | Authorizes contact-form email delivery |
| CONTACT_FROM_EMAIL | Server | Sender on a Resend-verified domain |
| CONTACT_TO_EMAIL | Server secret | Private recipient for contact messages |

Generate **VOTER_COOKIE_SECRET** with a cryptographically secure generator and use
at least 32 random bytes. Store it in the platform's secret manager. Rotating it
invalidates existing anonymous voter cookies.

Prefer Application Default Credentials on Google-managed hosting. If a
service-account JSON value is required, provide it as a one-line secret and grant
only the permissions needed by the application. Never prefix it with
**NEXT_PUBLIC_**.

Create a Resend API key with sending-only access where available. Verify the
domain used by **CONTACT_FROM_EMAIL**, and keep both the key and private recipient
server-side. The contact endpoint does not persist submissions in Firestore.

## 3. Deploy Firestore rules

Authenticate the Firebase CLI against the intended project, inspect the active
project, then deploy the committed rules:

~~~powershell
firebase use YOUR_PROJECT_ID
firebase deploy --only firestore:rules
~~~

Confirm that direct browser reads and writes are denied. The application server
uses the Admin SDK after performing its own validation and authorization.

## 4. Build and deploy

The deployment pipeline should run:

~~~powershell
npm ci
npm audit --omit=dev --audit-level=high
npm run typecheck
npm run lint
npm test
npm run build
~~~

The start command for a persistent Node.js host is:

~~~powershell
npm start
~~~

Do not expose service-account files through the application image, build output,
logs, or platform previews. Preview deployments should use a non-production
Firebase project.

## 5. Bootstrap an administrator

Create an Email/Password user in Firebase Authentication and grant their UID the
admin custom claim from a trusted operator environment. Locally, the grant
command loads `.env.local`; provide `FIREBASE_SERVICE_ACCOUNT_KEY` there, or
configure Application Default Credentials before running it:

~~~powershell
npm run grant-admin -- FIREBASE_USER_UID
~~~

The user must sign in again after the claim is changed. Access the unlinked
**/admin-login** route, then verify that **/admin** loads. A user without the
claim must be rejected even if they know both URLs.

To revoke access, remove the custom claim, revoke the user's refresh tokens, and
disable the account if appropriate. Existing session cookies are checked for
revocation on protected requests.

## 6. Production verification

After deployment:

1. Confirm **/**, **/vote**, and **/results** load over HTTPS.
2. Confirm public navigation contains no administrator link.
3. Confirm unauthenticated **/admin** requests redirect to **/admin-login**.
4. Confirm a non-admin Firebase user cannot obtain an admin session.
5. Create a staging poll and candidates in two positions.
6. Confirm one browser can vote once in each position but not twice in one
   position.
7. Close the poll while another browser has it open and confirm voting is rejected.
8. Confirm results update and archived polls disappear from public routes.
9. Inspect Content-Security-Policy, X-Frame-Options, Referrer-Policy, and
   Permissions-Policy response headers.
10. Confirm direct Firestore client reads and writes are denied.
11. Confirm secrets are absent from browser bundles and build logs.
12. Review error logs, Firestore usage, and billing alerts.

## Migration from the static application

Before using existing data:

1. Back up Firestore.
2. Change the legacy position value **Senetor** to **Senator**.
3. Validate poll statuses and required timestamps.
4. Reconcile every aspirant vote counter against vote documents.
5. Remove or quarantine orphaned aspirants and votes.
6. Deploy restrictive rules before exposing the new application.
7. Preserve the backup until the new release has completed its retention window.

## Rollback

- Keep the previously known-good application artifact available.
- Roll back application code without restoring permissive Firestore rules.
- Do not redeploy the unsupported static client as a recovery measure.
- If vote integrity is in doubt, close affected polls first, preserve logs and
  database snapshots, and investigate before reopening.
- Record the incident, scope, remediation, and any required voter communication.
