# CODFEST — Call of Duty 4 Tournament Platform

A single Next.js (App Router) project — frontend, API and Socket.IO server together — for running
a CoD4 Promod tournament where matches are played online on the players' own PCs.

Because there is no organizer-controlled game server (no RCON/logs/bots), **every result is
dual-verified**: both captains submit the final score with a screenshot. The server compares
the reports — a match confirms itself automatically, a conflict becomes a dispute for admins.
All of it propagates live over Socket.IO (bracket, leaderboard, match status, announcements).

A **live kill-feed scoreboard** (`/scoreboard`) streams CoD4 kill events in real-time from the
game server's `games_mp.log` file via a local bridge script (`pusher.js`) and Pusher Channels.

---

## Stack

| Layer | Choice |
|---|---|
| Framework | Next.js 14 (App Router) + TypeScript |
| Styling | Tailwind CSS + Framer Motion |
| Database | Supabase (Postgres) — server-side access only |
| Auth | Auth.js (NextAuth) credentials provider, JWT sessions, roles: `admin` / `team_captain` |
| Realtime (tournament) | Socket.IO on a custom Node server (`server.js`) |
| Realtime (kill-feed) | Pusher Channels + local `pusher.js` log-parser bridge |
| Images | Cloudinary (team logos + score-proof screenshots) |
| Email OTP | Resend |

---

## Prerequisites

- **Node.js** v18 or later
- **npm** v9 or later
- A **Supabase** project — [supabase.com](https://supabase.com)
- A **Pusher Channels** app (free) — [dashboard.pusher.com](https://dashboard.pusher.com)
- A **Resend** account + verified domain — [resend.com](https://resend.com)
- A **Cloudinary** account (free) — [cloudinary.com](https://cloudinary.com)
- CoD4 multiplayer installed locally (for the live kill-feed feature)

---

## 1 — Clone & Install

```bash
git clone https://github.com/your-org/codfest.git
cd codfest
npm install
```

---

## 2 — Environment Variables

Copy the example file and fill in your credentials:

```bash
cp .env.example .env.local
```

Open `.env.local` and set every value:

```env
# ── Supabase ──────────────────────────────────────────────────────────────────
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
SUPABASE_SERVICE_ROLE_KEY=eyJ...          # Dashboard → Settings → API → service_role

# ── Auth.js ───────────────────────────────────────────────────────────────────
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=generate-with-openssl-rand-base64-32

# ── Resend (email OTP) ────────────────────────────────────────────────────────
RESEND_API_KEY=re_...
EMAIL_FROM=noreply@yourdomain.com         # must be from a verified Resend domain

# set to true for local dev — skips real emails, OTP 000000 always works
OTP_TEST_MODE=true
NEXT_PUBLIC_OTP_TEST_MODE=true

# ── Cloudinary (team logos / screenshots) ─────────────────────────────────────
CLOUDINARY_URL=cloudinary://api_key:api_secret@cloud_name
NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME=your_cloud_name

# ── Tournament settings ───────────────────────────────────────────────────────
NEXT_PUBLIC_TOURNAMENT_START=2026-09-01T18:00:00+05:30
NEXT_PUBLIC_REGISTRATION_OPEN=true
NEXT_PUBLIC_PRIZE_POOL=₹50,000

# ── Pusher — Client (Next.js browser, scoreboard page) ────────────────────────
NEXT_PUBLIC_PUSHER_KEY=your_pusher_key
NEXT_PUBLIC_PUSHER_CLUSTER=ap1

# ── Pusher — Server (pusher.js bridge script, runs on game-server PC) ─────────
PUSHER_APP_ID=your_app_id
PUSHER_KEY=your_pusher_key               # same as NEXT_PUBLIC_PUSHER_KEY
PUSHER_SECRET=your_pusher_secret
PUSHER_CLUSTER=ap1

# ── CoD4 log path (used only by pusher.js bridge) ─────────────────────────────
LOG_PATH=F:/mycod/Call of duty 4 Multiplayer/main/games_mp.log
```

> **How to get Pusher credentials:**
> 1. Go to [dashboard.pusher.com](https://dashboard.pusher.com) → Create app
> 2. Choose cluster **ap1** (Mumbai)
> 3. Open **App Keys** tab → copy `app_id`, `key`, `secret`

---

## 3 — Database Setup

Open your **Supabase SQL Editor** (Dashboard → SQL Editor → New query) and run these in order:

```bash
# 1. Create all tables, indexes and RLS
supabase/schema.sql

# 2. Add email verification columns (if upgrading an existing DB)
supabase/migration-email-verification.sql

# 3. Add live-score columns to matches
supabase/migration-live-score.sql

# 4. Add email + phone columns to players
supabase/migration-player-contact.sql
```

> Paste each file's content into the SQL editor and click **Run**.

---

## 4 — Create the First Admin Account

```bash
node scripts/seed-admin.js admin@codfest.gg "YourStrongPassword" "Tournament Admin"
```

Admins sign in at `/login` (not linked from the public navbar).

---

## 5 — Running the App

### Development

```bash
npm run dev
```

Opens at **http://localhost:3000**

### Production

```bash
npm run build
npm start
```

> ⚠️ Socket.IO requires a persistent Node process.
> Deploy to **Railway / Render / Fly.io / VPS** — not Vercel serverless.

---

## 6 — Live Kill-Feed (Scoreboard)

The `/scoreboard` page shows CoD4 kill events in real-time.
This requires the `pusher.js` bridge script running on the **same PC as the CoD4 server**.

### How it works

```
CoD4 Server writes kills → games_mp.log
       ↓  (tail watches file)
  pusher.js parses K; lines
       ↓  (Pusher Channels API)
  /scoreboard page receives events live
```

### Running the bridge

Open a **second terminal** (keep `npm run dev` running in the first):

```bash
node pusher.js
```

Expected output:
```
[CoD4 Bridge] Watching: F:\mycod\Call of duty 4 Multiplayer\main\games_mp.log
[CoD4 Bridge] Pushing to Pusher channel: cod4-server / score-update
────────────────────────────────────────────────────────────
[KILL] PlayerOne → PlayerTwo (AK-47) at 17:45:30
[KILL] PlayerTwo → PlayerOne (M40A3) at 17:45:42
```

### About `games_mp.log`

- **Plain text file** — CoD4 appends to it in real-time during any multiplayer game
- Located at: `<CoD4 install>/main/games_mp.log`
- Kill lines start with `K;` and contain: attacker, victim, weapon, damage, means of death
- The bridge filters only `K;` lines — chat, connects, map changes are ignored

---

## Tournament Lifecycle

```
Leader registers (OTP email) → fills team details (members + phones)
→ admin approves team
→ admin generates bracket (Fixtures tab) → admin starts a match (goes Live)
→ both captains submit score + screenshot
→ scores match? auto-confirmed : flagged as dispute
→ standings + bracket + leaderboard update live for everyone
→ disputes: admin reviews both screenshots side-by-side and sets final score
```

---

## API Overview

**Public**
```
GET  /api/teams
GET  /api/teams/:id
GET  /api/matches?status=…
GET  /api/bracket
GET  /api/leaderboard
GET  /api/announcements
```

**Captain** (OTP-verified session required)
```
POST /api/auth/register          — start OTP flow
POST /api/teams/register         — submit team (multipart: payload + logo)
POST /api/matches/:id/submit-score
```

**Admin** (password session required)
```
PATCH /api/teams/:id/approve
PATCH /api/teams/:id/reject
POST  /api/matches
PATCH /api/matches/:id/start
PATCH /api/matches/:id/resolve
POST  /api/bracket/generate
POST  /api/announcements
GET   /api/audit-logs
```

---

## Socket.IO Events

| Event | Direction | Description |
|---|---|---|
| `match:score_submitted` | Server → clients | A captain submitted a score |
| `match:disputed` | Server → clients | Scores don't match |
| `match:finished` | Server → clients | Match confirmed / resolved |
| `match:live` | Server → clients | Match started |
| `bracket:updated` | Server → clients | Bracket regenerated |
| `leaderboard:updated` | Server → clients | Standings changed |
| `announcement:new` | Server → clients | New announcement posted |
| `admin:dispute_alert` | Server → admin room | Dispute needs attention |
| `team:registered` | Server → admin room | New team submitted |

---

## Notes & Known Trade-offs

- **OTP test mode**: Set `OTP_TEST_MODE=true` locally — emails are skipped and OTP `000000`
  always works. **Disable both flags in production.**
- **Socket.IO**: In-memory, single-process — correct for Railway/Render/VPS deployments.
  Vercel serverless cannot hold WebSocket connections.
- **Pusher bridge**: `pusher.js` uses `useWatchFile: true` for reliable file watching on
  Windows (NTFS). It must run on the same machine as the CoD4 dedicated server.
- **Email sender**: `onboarding@resend.dev` can only deliver to your own Resend account email.
  Verify a real domain at [resend.com/domains](https://resend.com/domains) for production.
