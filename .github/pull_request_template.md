## Outcome

Describe the user or operator outcome of this change.

## Changes

- <!-- Summarize the implementation. -->

## Security and privacy

- [ ] Firestore remains server-only and deny-by-default.
- [ ] Protected pages and mutations verify the admin session.
- [ ] External input is validated at the server boundary.
- [ ] No credentials, tokens, voter data, or production exports are included.
- [ ] Security and privacy trade-offs are documented below.

## Data and deployment

- [ ] No schema, rule, index, environment, or migration change.
- [ ] Relevant schema, rule, index, environment, or migration changes are
      documented.

Details:

## Verification

- [ ] Type checking passes.
- [ ] Linting passes.
- [ ] Tests pass.
- [ ] Production build passes.
- [ ] Production dependency audit has no unresolved high-severity finding.
- [ ] Visible changes include screenshots or recordings.

## Rollback

Describe how this change can be safely rolled back, especially if it writes data.
