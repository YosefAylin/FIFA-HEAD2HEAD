# קובה של שבת ⚽

Open-access FC 26 tournament tracker for a group of friends. Anyone can add players, log 1v1 / 2v2 matches, and follow live standings — no authentication needed.

## Stack

- Next.js 16 (App Router) + React 19 + TypeScript
- Tailwind CSS v4 (CSS-first theme in `src/globals.css`)
- Supabase (Postgres views for standings, open RLS policies, realtime subscriptions, storage for avatars)
- Vitest for unit tests

## Local development

```bash
npm install
# .env.local
NEXT_PUBLIC_SUPABASE_URL=https://<project>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon key>
npm run dev
```

## Database

Apply in order via the Supabase SQL editor (or a migration tool):

1. `supabase/schema.sql` — tables, views (`weekly_standings`, `all_time_standings`), indexes, open RLS
2. `supabase/storage.sql` — public `avatars` bucket
3. `supabase/seed.sql` — optional starter players + sample matches

## Features

- Home: big player cards with rank medals (🥇🥈🥉), weekly stats and humor badges
- Match entry: 1v1 / 2v2, duplicate-player guard, score steppers, soft-delete + restore
- Standings: weekly & all-time from Postgres views, week selector
- Player profiles: serious stats, form/streaks, head-to-head, match history
- Whiskey survey: one vote per device per week (changeable), realtime results
- PWA-ready, RTL Hebrew UI

## Deployment (Vercel)

Set `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` in the Vercel project settings for Production + Preview. The build is client-side-fetched, so it never needs database access at build time.

## Tests

```bash
npm test
```

## AI Bot (לא חובה) — free Gemini-powered chat bot

A cron-pinged bot that reads new messages in the in-app group chat, builds a
real tournament "digest" from the database (all-time + current-week standings,
per-player stats, head-to-head), and replies to **every** new human message with
a grounded answer in Hebrew — plus a home-page chat box that syncs into the same
chat. Uses the **free** Google Gemini Flash tier, so it costs $0.

### Env vars (server-only — never `NEXT_PUBLIC_`)

```bash
# Get a free key: https://aistudio.google.com/apikey
GEMINI_API_KEY=...
GEMINI_MODEL=gemini-2.5-flash        # or gemini-flash-latest (auto-current)
# Optional — OpenRouter free models instead of Gemini:
# BOT_PROVIDER=openrouter
# OPENROUTER_API_KEY=sk-or-...
# OPENROUTER_MODEL=meta-llama/llama-3.3-70b-instruct:free
# Optional — require ?secret=... on GET /api/bot:
# BOT_CRON_SECRET=...
```

### Deploy

1. Set the same vars in Vercel → Project → Settings → Environment Variables.
2. Push this repo — `vercel.json` registers the `*/5 * * * *` cron automatically.
3. Verify: Vercel → Cron Jobs shows one run, and the chat page shows bot replies.

Free-tier Gemini caps at ~15 requests/min and ~1500/day — far beyond a Shabbat
group chat. The bot answers at most 5 messages per tick and always advances its
cursor, so a spent quota never blocks the schedule.

No database schema change is required: the bot's progress cursor lives in the
existing `settings` table, and bot messages use the free-form `author_name`
"קובה בוט" (kept out of the roster so nobody can impersonate it).
