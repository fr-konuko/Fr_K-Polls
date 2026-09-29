# Security Policy

## Supported versions

This project is currently maintained as a static front-end application for internal or low-risk public use. Security updates are applied as needed for the actively maintained code in this repository.

## Reporting a vulnerability

Please report security issues privately and responsibly. Do not open public issues for vulnerabilities until the maintainers have had an opportunity to assess and address the issue.

Send details to the project maintainer or responsible technical owner. Include:

- a summary of the vulnerability
- affected files or URLs
- reproduction steps or proof of concept
- severity and likely impact
- any suggested remediation or mitigation

## Security expectations

This project may contain client-side configuration and static site code. It should not be treated as a hardened production security boundary without additional backend controls.

The following practices are strongly recommended before production use:

- use Firebase Authentication for admin access
- restrict Firestore rules to the minimum allowed access
- keep secrets and production credentials out of version control
- use HTTPS-only hosting
- rate-limit public form submissions and vote actions
- validate and sanitize all user-submitted content

## Responsible disclosure

We ask that reporters:

- provide a clear description of the issue
- avoid accessing or modifying unrelated data
- allow a reasonable time for the issue to be confirmed and remediated
- refrain from public disclosure until a fix is available or a remediation plan is in place

## Security posture

The project is intended for demonstration, stakeholder research, or low-risk opinion polling. For sensitive or official polling, it should be upgraded with stronger authentication, server-side validation, and strict Firestore security controls before launch.
