# Bulletproof Sentinel AI

Autonomous AI Cyber Defense Copilot — Phase 1 (MVP Foundation).

Stack: **Next.js 15 (App Router) · TypeScript (strict) · Tailwind CSS · Firebase Auth + Firestore · Vercel**.

## Phase 1 Features

- Firebase Authentication (email + password) with secure HTTP-only **session cookies** (signed via Firebase Admin).
- **Security Dashboard** — overview, stats, recent events, active alerts.
- **Event Logging System** — every auth attempt and honeypot trigger is persisted to Firestore.
- **Basic Honeypot Engine** — fake admin portal, fake API endpoint, hidden WP login route. Hits are recorded and counted.
- **Alert Center** — high/critical events automatically generate alerts that can be acknowledged.
- Route protection via Next.js middleware.

## Project Structure

```
src/
  app/
    (auth)/login, (auth)/signup        # Auth pages (client)
    api/
      auth/session                     # POST: create session cookie, DELETE: sign out
      events                           # GET recent events
      alerts                           # GET / PATCH alerts
      honeypots                        # GET deployed traps
      honeypot/v1/users                # Decoy API endpoint
    honeypot/admin                     # Decoy admin login page
    honeypot/wp-login                  # Decoy WP login page
    dashboard/                         # Protected dashboard (overview, events, honeypots, alerts)
  lib/
    firebase/client.ts                 # Web SDK
    firebase/admin.ts                  # Admin SDK (server-only)
    server/session.ts                  # Session cookie helpers
    server/events.ts                   # Event + alert persistence
    server/honeypots.ts                # Trap registry + trigger recorder
    server/request.ts                  # IP / UA helpers
    types.ts                           # Shared TypeScript types
  middleware.ts                        # /dashboard auth gate
```

## Setup

1. Create a Firebase project. Enable **Authentication → Email/Password** and **Firestore**.
2. Copy `.env.example` to `.env.local` and fill in:
   - `NEXT_PUBLIC_FIREBASE_*` from your Firebase web app config.
   - `FIREBASE_SERVICE_ACCOUNT_JSON` — paste the entire service account JSON as a single line. The `private_key` newlines can stay as `\n` (the loader unescapes them).
3. Install deps and run dev:
   ```bash
   npm install
   npm run dev
   ```

## Firestore Collections (auto-created)

- `security_events` — `{ id, type, severity, ip, userAgent, route, message, metadata, createdAt, ownerUid }`
- `alerts` — `{ id, title, severity, source, createdAt, acknowledged, eventId }`
- `honeypots` — seeded on first read with three default traps.

## Suggested Firestore Rules

All writes happen via the Admin SDK in API routes, so client writes can be denied:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{db}/documents {
    match /{document=**} {
      allow read, write: if false;
    }
  }
}
```

## Vercel Deployment

1. Push to GitHub.
2. Import the repo on Vercel.
3. Add the same environment variables (mark `FIREBASE_SERVICE_ACCOUNT_JSON` as **Sensitive**).
4. Deploy. No additional firewall configuration required — Vercel handles TLS at the edge.

## Try the Honeypots

After signing in, visit any of these URLs (in another browser or while signed out) — each hit records a high-severity event and creates an alert:

- `/honeypot/admin`
- `/honeypot/wp-login`
- `/api/honeypot/v1/users`

Then return to the dashboard to see events and alerts populate.

## Next Phases

See `prd.md` for the full roadmap. Phase 2 introduces the Vulnerability Scanner, Security Header Analyzer, Threat Scoring Engine, and GeoIP tracking.
