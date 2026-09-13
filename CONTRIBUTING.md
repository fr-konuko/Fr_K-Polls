# Contributing

Thank you for improving Frk Polls. Changes should preserve the server-side trust
boundary and keep administration out of the public user experience.

## Development setup

1. Install Node.js 20.9 or newer.
2. Copy **.env.example** to **.env.local** and use a non-production Firebase
   project.
3. Install locked dependencies with **npm ci**.
4. Start the development server with **npm run dev**.

Never use production credentials or production voter data during development.

## Required checks

Run these before opening a pull request:

~~~powershell
npm run typecheck
npm run lint
npm test
npm run build
npm audit --omit=dev --audit-level=high
~~~

The same checks run in GitHub Actions.

## Engineering rules

- Keep Firestore access in the server runtime. Do not import the Firestore client
  SDK into public components.
- Verify an admin session in every protected page, Server Action, and API mutation.
- Validate external input at the server boundary with Zod.
- Recheck poll and aspirant invariants inside the vote transaction.
- Render user and database content through React; do not use
  **dangerouslySetInnerHTML**.
- Keep query limits explicit and consider Firestore read cost in new views.
- Do not log credentials, session tokens, signed voter cookies, or ballot data.
- Use archival workflows instead of deleting records that have dependent ballots.
- Keep Home, Vote, and Results as the only public navigation destinations.
- Add or update tests when validation, authorization, ballot uniqueness, or
  serialization changes.

## Pull requests

Keep each change focused. Explain:

- The user or operator outcome.
- Security and privacy impact.
- Schema, rule, environment, or migration changes.
- Verification performed.
- Screenshots for visible user-interface changes.
- Rollback considerations for stateful changes.

Do not include generated build output, **node_modules**, local environment files,
service-account files, or production exports.

## Dependencies

Dependency changes must update **package-lock.json**. Prefer direct, reviewed
upgrades over forced audit resolutions. Explain any new package's purpose and
browser or server placement.

## Security reports

Do not open a public pull request for an unpatched vulnerability. Follow
[SECURITY.md](SECURITY.md) for private reporting and coordinated disclosure.
