# JOPA Research Africa

A static web application for JOPA Research Africa that combines a consultancy-style landing page with a live polling and research platform. The app supports public voting, results dashboards, contact submissions, and an admin interface for managing polls and aspirants.

## Overview

This project is designed to modernize the public-facing brand of JOPA Research Africa while preserving a Firebase-backed polling workflow. It is built as a front-end application with Firebase Firestore used for live data storage and retrieval. The site delivers a marketing-focused homepage, an active polling experience, a results dashboard, and an admin area for data management.

It is intended for stakeholder research, opinion polling, and campaign feedback scenarios. The code is static and easy to deploy on GitHub Pages, Netlify, Vercel, or any static web server.

## Application features

### Public-facing experience

- responsive consulting-style landing page
- active polls with candidate/aspirant selection
- browser-based vote tracking to reduce duplicate submissions
- live results dashboard with rankings, counts, and percentages
- contact form for general inquiries and follow-up
- mobile-friendly responsive layout

### Admin experience

- admin login using a passcode
- create and update polls
- add and remove aspirants
- close or delete polls
- review and manage contact messages
- view result summaries and live polling data

### Technical capabilities

- HTML5, CSS3, and vanilla JavaScript
- Firebase Firestore integration
- static site hosting compatibility
- local browser token generation for vote de-duplication
- lightweight implementation without a backend framework

## Project structure

```text
JOPA_Research_Africa_Website/
+-- admin.html               # admin login and management interface
+-- app.js                   # application logic, poll data logic, admin logic
+-- contact.html             # contact form page
+-- dashboard.html           # public results dashboard
+-- firebase-config.js       # Firebase config loader
+-- index.html               # landing page and home content
+-- local-config.js          # local runtime config placeholder
+-- styles.css               # all site styling and layout
+-- vote.html                # public voting page
+-- easychatwidget.js        # chatbot widget client
+-- assets/                  # graphics, icons, placeholders, media
+-- LAYOUT-ASSESSMENT.md     # design review notes
+-- README.md                # project overview and setup documentation
+-- LICENSE                  # MIT licensing terms
+-- SECURITY.md              # security policy and reporting guidance
+-- .env.example             # example env template
+-- .gitignore               # local secret exclusions
```

## Technology stack

- HTML5
- CSS3
- JavaScript (vanilla ES6+)
- Firebase JavaScript SDK
- Firestore database
- static site hosting via GitHub Pages or similar

## Local development

### Prerequisites

- modern web browser
- Firebase project with Firestore enabled
- local static web server or deployment platform

### Recommended setup

1. Open the project in your editor.
2. Create a local config file with the Firebase values and admin passcode.
3. Ensure any stored secrets are kept outside of source control.
4. Run a local static server.
5. Open the homepage in the browser.

### Local deployment commands

#### Option 1: Python (most portable)

```bash
cd JOPA_Research_Africa_Website
python -m http.server 8000
```

Then open:

```text
http://localhost:8000/
```

#### Option 2: Node.js with npx serve

```bash
cd JOPA_Research_Africa_Website
npx serve . -l 8000
```

Then open:

```text
http://localhost:8000/
```

#### Option 3: Windows PowerShell (no server package needed)

```powershell
cd "C:\path\to\FRK_Polls_Redesign\JOPA_Research_Africa_Website"
python -m http.server 8000
```

Then open:

```text
http://localhost:8000/
```

### Quick-start example

```bash
cd JOPA_Research_Africa_Website
python -m http.server 8000
```

Example runtime config:

```js
window.__APP_CONFIG__ = {
  adminPasscode: "YOUR_ADMIN_PASSCODE",
  firebase: {
    apiKey: "YOUR_API_KEY",
    authDomain: "YOUR_AUTH_DOMAIN",
    projectId: "YOUR_PROJECT_ID",
    storageBucket: "YOUR_STORAGE_BUCKET",
    messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
    appId: "YOUR_APP_ID",
    measurementId: "YOUR_MEASUREMENT_ID"
  }
};
```

### Security note for local work

Do not commit production credentials. Use local-only config files or secret management tooling. The app should not store live admin credentials or Firebase keys in tracked script files.

## Firebase and data model

The app depends on Firebase Firestore for live polling data. Typical collections include:

- polls
- aspirants
- votes
- contactMessages

These collections must be configured in Firestore with appropriate security rules to support the app safely in production.

## Security considerations

This project is a front-end application, which means it depends on browser-based behavior and client-side security assumptions. It is appropriate for demonstration, internal, or low-risk polling scenarios, but it is not a hardened enterprise system by default.

### Risks to be aware of

- admin passcodes stored in client-side JavaScript are not secure
- browser-side vote checks can be bypassed without server-side enforcement
- public Firestore data access must be restricted by rules
- contact form data may require additional validation and bot protection

### Recommended security posture for production

- use Firebase Authentication for admin access
- enforce strict Firestore rules
- validate all writes on the server or through secure backend logic
- keep secrets out of source control
- prefer HTTPS everywhere
- add rate limiting for forms and vote submissions
- review privacy implications before publishing voter or contact data

## Deployment

The app can be deployed to any static hosting platform, including:

- GitHub Pages
- Netlify
- Vercel
- any standard static hosting environment

Before publishing to production:

- verify the Firebase configuration is valid
- configure strict Firestore rules
- ensure admin access is protected by a stronger mechanism than a browser-visible passcode
- confirm that all site assets and references resolve correctly

## Known limitations

- this is not a full backend system
- the admin login is not enterprise-grade authentication by itself
- vote tracking in the browser is a convenience feature and should not be treated as a fraud-proof mechanism
- data sensitivity should be reviewed before public release

## Contribution guide

If you contribute to this project:

- do not commit secrets or environment credentials
- keep changes scoped and well documented
- validate admin and voting flows before deployment
- update the project documentation for new features or architectural changes

## License

This project is licensed under the MIT License. See the LICENSE file for details.

## Security policy

If you discover a security issue, follow the instructions in SECURITY.md before creating a public report. Please do not disclose a vulnerability until it has been assessed and addressed.

## Contact

For project support, deployment questions, or vulnerability reporting, contact the appropriate technical owner for the JOPA Research Africa website or project maintainer.
