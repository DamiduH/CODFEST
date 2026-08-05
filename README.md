# CODFEST — Call of Duty 4 Tournament Platform

A single Next.js (App Router) project — frontend, API and Socket.IO server together — for running
a CoD4 Promod tournament where matches are played online on the players' own PCs.

Because there is no organizer-controlled game server (no RCON/logs/bots), **every result is
dual-verified**: both captains submit the final score with a screenshot. The server compares
the reports — a match confirms itself automatically, a conflict becomes a dispute for admins.
All of it propagates live over Socket.IO (bracket, leaderboard, match status, announcements).

## Stack

| Layer | Choice |
|---|---|
| Framework | Next.js 14 (App Router) + TypeScript |
| Styling | Tailwind CSS + Framer Motion |
| Database | Supabase (Postgres) — server-side access only |
| Auth | Auth.js (NextAuth) credentials provider, JWT sessions, roles: `admin` / `team_captain` / `player` |
| Realtime | Socket.IO on a custom Node server (`server.js`) |
| Images | Cloudinary (team logos + score-proof screenshots) |

## Setup

1. **Install**

   ```bash
   npm install
   ```

2. **Database** — open the Supabase SQL editor and run `supabase/schema.sql`.
   It creates all tables and enables RLS with no policies (the public anon key can touch
   nothing; the app talks to the DB server-side).

3. **Environment** — `.env.local` is pre-filled with the project credentials. Add your
   `SUPABASE_SERVICE_ROLE_KEY` (Dashboard → Settings → API) and set a strong
   `NEXTAUTH_SECRET` for production.

4. **Create the first admin**

   ```bash
   node scripts/seed-admin.js admin@codfest.gg "YourStrongPassword" "Tournament Admin"
   ```

5. **Run**

   ```bash
   npm run dev        # http://localhost:3000
   npm run build && npm start   # production
   ```

## Deployment

Socket.IO needs a persistent process, so **deploy the whole app to Railway/Render/Fly/VPS**
(build command `npm run build`, start command `npm start`). Vercel's serverless runtime cannot
hold the WebSocket server — if you must use Vercel for the pages, split `server.js` out to a
Node host and point the socket client at it.

## Tournament lifecycle

```
Captain registers account → registers team (roster + logo) → admin approves
→ admin generates bracket (Fixtures tab) → admin starts a match (goes Live)
→ both captains submit score + screenshot → equal? auto-confirmed : disputed
→ standings + bracket + leaderboard update in real time for everyone
→ disputed matches: admin reviews both screenshots side by side and sets the final score
```

Every submission, approval, resolution and override is written to `audit_logs` and visible
in the admin dashboard.

## API overview

Public: `GET /api/teams`, `/api/teams/:id`, `/api/matches?status=…`, `/api/matches/:id`,
`/api/bracket`, `/api/leaderboard`, `/api/announcements` and the rate-limited, PII-free
`/api/public/{leaderboard, matches/live, bracket}` for bots.

Captain: `POST /api/auth/register`, `POST /api/teams/register`, `PATCH /api/teams/:id`,
`POST /api/matches/:id/submit-score` (multipart: `score_own`, `score_opponent`, `screenshot`).

Admin: `PATCH /api/teams/:id/{approve, reject}`, `POST /api/matches`,
`PATCH /api/matches/:id/{start, resolve}`, `POST /api/bracket/generate`,
`POST /api/announcements`, `GET /api/audit-logs`, `GET /api/admin/teams`.

All role checks are enforced server-side; match confirmation is computed only on the server.

## Socket.IO events

`match:score_submitted`, `match:disputed`, `match:finished`, `match:live`,
`bracket:updated`, `leaderboard:updated`, `announcement:new`, plus the admin-room-only
`admin:dispute_alert` and `team:registered` (clients join via `join:admin`).

## Notes & known trade-offs

- Email verification is not wired up (no SMTP credentials were provided); the
  admin-approval step gates every team instead. Add a provider like Resend to
  `POST /api/auth/register` if needed.
- The pasted Firebase config was not used — the spec mandates Auth.js, and mixing both
  would add a second auth system for no benefit.
- The public-API rate limiter is in-memory, which is correct for this single-process
  deployment model.
