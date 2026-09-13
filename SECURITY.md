# Security policy

## Supported versions

| Version | Supported |
| --- | --- |
| 2.x (Next.js) | Yes |
| 1.x (legacy static app) | No |

The files under **legacy-static/** are retained only as migration reference. They
must not be deployed.

## Reporting a vulnerability

Please report vulnerabilities through GitHub's private vulnerability reporting
form in the repository's **Security** tab.

Do not include exploit details, credentials, voter identifiers, or personal data
in a public issue. If private reporting is unavailable, open a minimal public
issue requesting a private contact channel without describing the vulnerability.

Include:

- Affected route, component, or commit.
- Reproduction steps and required conditions.
- Expected and observed behaviour.
- Potential impact and affected data.
- A proof of concept that avoids modifying production data.
- Suggested remediation, if known.

Maintainers should acknowledge a report within three business days and provide an
initial assessment within seven business days. These are response targets rather
than guaranteed resolution times. Please allow a reasonable remediation window
before public disclosure.

## Security boundaries

- Firestore client access is denied by **firestore.rules**. The Next.js server is
  the only application database client.
- Administrative access requires a valid Firebase session whose ID token contains
  the boolean custom claim **admin: true**.
- Administrative pages are intentionally absent from public navigation, but
  unlisted routes are not considered a security control.
- All administrative mutations must verify the server session. Browser checks are
  only user-interface conveniences.
- Vote creation revalidates poll state, candidate membership, and position
  uniqueness in one Firestore transaction.
- The browser voter cookie is an anonymous rate-limiting mechanism, not verified
  identity. Clearing browser state or changing devices can produce another vote.

This application is suitable for opinion polling. It is not suitable for a
binding or official election without verified eligibility, independent security
review, ballot-secrecy controls, abuse prevention, tamper-evident audit logs, and
an incident-response plan.

## Secrets and sensitive data

- Never commit **.env.local**, service-account JSON, private keys, session cookies,
  Firebase ID tokens, or voter exports.
- Public Firebase web configuration is an application identifier, not an
  authorization control. Restrict the key in Google Cloud and enforce
  authorization on the server.
- Use Application Default Credentials in managed hosting where possible.
- Rotate credentials immediately if they are exposed, then review authentication
  and Firestore audit logs.
- Store only the minimum data necessary for a poll and define a retention period
  before collection begins.
- Keep contact recipients and mail-provider credentials in server-only environment
  variables. Contact submissions are sent directly and are not stored by the app.

## Deployment hardening checklist

Before production deployment:

1. Deploy the committed deny-by-default Firestore rules.
2. Enable only required Firebase Authentication providers.
3. Grant administrator claims to named, least-privileged accounts.
4. Configure a strong voter-cookie secret in the hosting secret manager.
5. Add platform rate limiting, Firebase App Check where applicable, billing
   alerts, and log monitoring.
6. Confirm security headers on the deployed domain.
7. Run dependency auditing, linting, tests, type checking, and the production
   build.
8. Test backup, recovery, poll closure, and administrator revocation.

## Safe harbour

Good-faith research that avoids privacy violations, service disruption, social
engineering, data destruction, and unnecessary access to other people's data will
be treated as authorized security research. Stop testing and report immediately
if sensitive data is encountered.
