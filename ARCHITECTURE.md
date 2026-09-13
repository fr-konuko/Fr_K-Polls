# Architecture

## Purpose

Frk Polls is a server-mediated opinion-polling application. The public experience
supports poll discovery, one anonymous browser vote per position, and aggregated
results. A separate authenticated workspace lets approved administrators create,
close, reopen, and archive polls and add aspirants.

The system deliberately does not claim to provide verified voter identity, ballot
secrecy suitable for a public election, or protection against a person clearing
browser state and voting again.

## System context

~~~mermaid
flowchart LR
    V[Voter browser] -->|HTTPS| N[Next.js application]
    A[Administrator browser] -->|Firebase sign-in| FA[Firebase Authentication]
    A -->|ID token, then HTTP-only session| N
    N -->|Verify identity and admin claim| FA
    N -->|Admin SDK| FS[(Cloud Firestore)]
    CI[GitHub Actions] -->|Type-check, lint, test, build| N
~~~

The browser never connects directly to Firestore. All reads and writes pass
through Next.js route handlers or Server Actions. The Firebase Admin SDK is
available only in the Node.js server runtime.

## Repository layout

| Path | Responsibility |
| --- | --- |
| **app/** | Next.js App Router pages, route handlers, and Server Actions |
| **components/** | Reusable React user-interface components |
| **lib/firebase/** | Browser Authentication client and server Admin SDK setup |
| **lib/** | Types, validation, serialization, authentication, and voter helpers |
| **scripts/** | Explicit operator tasks such as granting an admin claim |
| **firestore.rules** | Deny-by-default browser access policy |
| **legacy-static/** | Unsupported pre-rewrite application; never deploy |

## Public surface

| Route | Access | Purpose |
| --- | --- | --- |
| **/** | Public | Product overview |
| **/vote** | Public | Active polls and position-grouped ballots |
| **/results** | Public | Active and closed aggregate results |
| **/api/polls** | Public, read-only | Bounded poll metadata |
| **/api/results/[pollId]** | Public, read-only | Bounded aggregate results |
| **/api/votes** | Public, same-origin POST | Validated vote transaction |
| **/api/votes/status** | Public, read-only | Positions voted by the current browser |
| **/api/contact** | Public, same-origin POST | Validates and relays contact messages through Resend |

## Administrative surface

| Route | Access | Purpose |
| --- | --- | --- |
| **/admin-login** | Unlinked | Firebase email/password sign-in |
| **/admin** | Admin session required | Server-rendered management workspace |
| **/api/auth/session** | Same-origin POST | Exchanges an admin ID token for a session |
| **/api/auth/logout** | Same-origin POST | Clears the server session |
| **/api/admin/** | Admin session required | Validated administrative API operations |

Removing administrative links from public navigation is a user-experience
decision. Authorization is enforced independently on every protected page and
mutation.

## Authentication and authorization

1. An administrator signs in with Firebase Authentication on **/admin-login**.
2. The browser sends the fresh Firebase ID token to **/api/auth/session**.
3. The server verifies token validity, revocation status, recent authentication,
   and the boolean custom claim **admin: true**.
4. The server issues a Secure, SameSite=Strict, HTTP-only session cookie.
5. The protected admin layout and all admin APIs verify that cookie again.

Granting the custom claim is an explicit operator action performed with
**scripts/grant-admin.mjs**. Route secrecy and client-side state are never used as
authorization.

## Vote transaction

~~~mermaid
sequenceDiagram
    participant B as Browser
    participant R as POST /api/votes
    participant F as Firestore

    B->>R: pollId and aspirantId
    R->>R: Validate schema, origin, and signed voter cookie
    R->>F: Begin transaction
    F-->>R: Poll and aspirant documents
    R->>R: Require active poll and matching pollId
    R->>F: Read deterministic ballot document
    alt ballot exists for position
        R-->>B: 409 Already voted
    else ballot is absent
        R->>F: Create ballot and increment aspirant counter
        F-->>R: Commit atomically
        R-->>B: 201 Vote recorded
    end
~~~

The ballot document ID is a SHA-256 digest of poll ID, position, and the verified
voter-cookie identifier. The raw identifier is never written to Firestore. This
provides atomic uniqueness per browser and position without exposing a reusable
token in the database.

## Data model

### polls

| Field | Type | Notes |
| --- | --- | --- |
| name | string | Required; maximum 120 characters |
| description | string | Maximum 500 characters |
| status | active, closed, or archived | Only active polls accept votes |
| createdAt | server timestamp | Used for ordering |
| closedAt | server timestamp or null | Set when closed |
| archivedAt | server timestamp or null | Set when archived |

### aspirants

| Field | Type | Notes |
| --- | --- | --- |
| pollId | document ID string | Parent poll relationship |
| name | string | Required; maximum 120 characters |
| position | controlled string | One of the values in **lib/types.ts** |
| imageUrl | HTTPS URL or empty string | Rendered through React |
| votes | non-negative integer | Transactionally maintained aggregate |
| createdAt | server timestamp | Audit and ordering metadata |

### votes

| Field | Type | Notes |
| --- | --- | --- |
| pollId | document ID string | Poll scope |
| aspirantId | document ID string | Selected aspirant |
| position | controlled string | Uniqueness scope |
| createdAt | server timestamp | Commit time |

Polls are archived instead of deleted so aspirants and ballot history are not
orphaned. Aggregate counters should be reconciled against vote documents before a
legacy migration or after any manual database maintenance.

## Trust boundaries

- Browser input is untrusted and parsed with Zod at server boundaries.
- Firestore content is serialized into explicit response shapes.
- React performs output escaping; the new application does not construct HTML from
  database strings.
- Firestore rules reject all browser SDK operations.
- Service-account credentials and cookie secrets exist only in server environment
  variables or the hosting secret manager.
- Security headers prevent framing, MIME sniffing, and broad browser capabilities.
- Public endpoints use query limits, but platform-level rate limiting and billing
  alerts remain deployment responsibilities.
- Contact messages are validated, throttled, checked with a honeypot, and relayed
  directly to the configured inbox without being stored in Firestore.

## Availability and consistency

- Vote creation and result-counter updates commit atomically.
- Poll status is read inside the transaction, so an already-open page cannot vote
  after a poll closes.
- Results refresh every ten seconds and may be briefly stale.
- Firestore remains the system of record. The current application has no offline
  write queue.
- The application should be deployed as a Node.js server or serverless runtime,
  not as a static export.

## Known limitations and future work

Before using the system beyond low-risk opinion polling:

1. Introduce verified voter identity and an eligibility register.
2. Define whether administrators may correlate ballots with identities.
3. Add managed, distributed rate limiting and Firebase App Check.
4. Add tamper-evident audit events for administrative actions.
5. Add scheduled aggregate reconciliation and backup verification.
6. Define retention and deletion policies with the data owner.
7. Conduct an independent penetration test and privacy review.

Deployment instructions are in [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md), security
reporting is in [SECURITY.md](SECURITY.md), and contribution guidance is in
[CONTRIBUTING.md](CONTRIBUTING.md).
