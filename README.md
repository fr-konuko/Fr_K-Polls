# JOPA Research Africa — Next.js Polling & Research Platform

A modern, secure web application for **JOPA Research Africa** combining an executive consultancy brand experience with a live, fraud-resistant opinion polling and insights platform. Rebuilt in **Next.js 15 (App Router)** and **TypeScript** with modular Firebase Firestore integration.

---

## Key Highlights

- **Complete Public / Admin Separation**: The public-facing experience (*Home*, *Services*, *Sectors*, *Results*, *Contact*, and *Vote Now*) contains **zero links, buttons, or triggers** to administrative capabilities.
- **Isolated Admin Control Center**: Administrative capabilities are sequestered behind a protected route (`/portal`), safeguarded by server-side HMAC session cookies and environment passcode verification.
- **True Multi-Position Voting Ballot**: Voters can participate across each contest in a multi-position poll (President, Governor, Senator, Women Rep, Member of Parliament, MCA) with position-specific ballot tracking.
- **Audited Security & Reliability**:
  - Production `firestore.rules` preventing unauthorized writes, data tampering, or quota denial of service.
  - Honeypot anti-bot filtering on public inquiries.
  - Cascade deletion on poll removal (deleting all associated candidates and votes cleanly).
  - High-contrast, WCAG 2.1 AA compliant design system.

---

## Project Structure

```text
FRK_Polls_Redesign/
├── src/
│   ├── app/
│   │   ├── layout.tsx             # Root layout with SEO metadata and public layout
│   │   ├── page.tsx               # Public landing page (Hero, Services, Sectors, Methodology, Active Polls)
│   │   ├── vote/
│   │   │   └── page.tsx           # Multi-position voting ballot with per-contest verification
│   │   ├── results/
│   │   │   └── page.tsx           # Verified live analytics dashboard with position chart and rankings
│   │   ├── contact/
│   │   │   └── page.tsx           # Strategic project inquiry form with anti-bot honeypot
│   │   ├── portal/
│   │   │   ├── layout.tsx         # Isolated Admin Portal shell (internal navigation & logout)
│   │   │   ├── page.tsx           # Admin Control Center (Polls, Aspirants, Inquiries Inbox, Share Links)
│   │   │   └── login/
│   │   │       └── page.tsx       # Isolated administrative sign-in screen
│   │   └── api/
│   │       └── portal/
│   │           ├── login/route.ts # Server-side authentication & HTTP-only session cookie issuer
│   │           └── logout/route.ts# Session invalidation endpoint
│   ├── components/
│   │   └── layout/
│   │       ├── Navbar.tsx         # Public navigation (Zero admin links)
│   │       └── Footer.tsx         # Public footer (Zero admin links)
│   ├── lib/
│   │   ├── firebase.ts            # Modular Firebase v10 SDK client
│   │   ├── auth.ts                # Server-side HMAC session signing & verification
│   │   └── types.ts               # Strict TypeScript interfaces
│   ├── middleware.ts              # Edge middleware protecting /portal/* routes
│   └── styles/
│       └── globals.css            # Custom tokens, glassmorphism, responsive utilities, WCAG AA compliance
├── public/
│   └── assets/                    # Optimized SVG vectors, favicon, brand marks
├── firestore.rules                # Production Firestore security rules
├── next.config.ts                 # Next.js configuration with security headers & remote images
├── package.json                   # Project dependencies and run scripts
├── tsconfig.json                  # TypeScript compiler settings with path alias @/*
├── .env.example                   # Environment variable template
└── .env.local                     # Local environment secrets (ignored from git)
```

---

## Local Development & Setup

### Prerequisites

- **Node.js**: v18.17+ or v20+ LTS
- **Firebase Project**: Firestore database configured with `firestore.rules`

### 1. Environment Configuration

Copy the example configuration to `.env.local`:

```bash
cp .env.example .env.local
```

Populate `.env.local` with your Firebase web configuration and a strong administrative passcode:

```ini
NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project.firebasestorage.app
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id
NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=your_measurement_id

# Server-Side Isolated Admin Security
ADMIN_PORTAL_PASSCODE=your_secure_admin_passcode
ADMIN_SECRET_KEY=generate_a_random_32_char_secret_key
ADMIN_SESSION_COOKIE=jopa_admin_auth
```

### 2. Start the Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

- **Public Site**: [http://localhost:3000](http://localhost:3000)
- **Voting Ballot**: [http://localhost:3000/vote](http://localhost:3000/vote)
- **Live Results Dashboard**: [http://localhost:3000/results](http://localhost:3000/results)
- **Contact Inquiries**: [http://localhost:3000/contact](http://localhost:3000/contact)
- **Isolated Admin Portal**: [http://localhost:3000/portal](http://localhost:3000/portal)

### 3. Production Build & Verification

```bash
npm run build
npm run start
```

---

## Security Architecture

1. **Admin Isolation**: Public routes contain no traces of administrative functionality. Direct access to `/portal` automatically redirects unauthenticated users to `/portal/login` via Next.js Middleware.
2. **Server-Side Session Cookies**: The administrative passcode is verified exclusively on the server. Upon authentication, a cryptographically signed HMAC token is set as an `HTTP-only`, `SameSite=Lax` cookie.
3. **Database Rules**: `firestore.rules` enforces create-only permissions on public submissions (`votes`, `contactMessages`) and restricts document updates/deletes to verified administrative sessions.
4. **Cascade Deletion**: When a poll is removed from the Admin Control Center, Firestore batch writes ensure all associated candidates and votes are cleanly deleted.

---

## License

This project is licensed under the MIT License.
