# קובה של שבת ⚽

Open-access FC 26 tournament tracker for a group of friends. Anyone can add players, log 1v1 / 2v2 matches, and follow live standings — no authentication needed.

> 🧭 **For agents:** [`ARCHITECTURE.md`](./ARCHITECTURE.md) is the single source of truth for how this repo is structured (data layer, AI bot, conventions) and how the pieces connect. Read it before diving into the code.

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

1. `supabase/schema.sql` — tables (`players`, `matches`, `whiskey_votes`, `chat_messages`, `settings`), views (`weekly_standings`, `all_time_standings`), indexes, open RLS, and realtime publication. This single file is self-contained and idempotent.
2. `supabase/storage.sql` — public `avatars` bucket
3. `supabase/seed.sql` — optional starter players + sample matches

The older `player-guest.sql` / `players-inactive.sql` / `chat-settings.sql` files are now folded into `schema.sql` and kept only for historical databases.

## Features

- Home: big player cards with rank medals (🥇🥈🥉), weekly stats and humor badges
- Match entry: 1v1 / 2v2, duplicate-player guard, score steppers, soft-delete + restore
- Standings: weekly & all-time from Postgres views, week selector
- Player profiles: serious stats, form/streaks, head-to-head, match history
- Whiskey survey: one vote per device per week (changeable), realtime results
- PWA-ready, RTL Hebrew UI

## Deployment (Vercel)

Set `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` in the Vercel project settings for Production + Preview. The build is client-side-fetched, so it never needs database access at build time.

## Tests & lint

```bash
npm test        # Vitest unit tests
npm run lint    # oxlint (TS/TSX-aware; see .oxlintrc.json)
```

## AI Bot (קובה בוט) — paid OpenRouter-powered chat bot

A chat bot that reads new messages in the in-app group chat, builds a real
tournament "digest" from the database (all-time + current-week standings,
per-player stats, head-to-head), and replies to new human messages with a
grounded answer in Hebrew — plus live banter on the home page (BotTalk card).

- **One paid model, no free tier:** OpenRouter, default `deepseek/deepseek-v4-flash`
  (override with `OPENROUTER_MODEL`). If the call fails, the reply fails — the bot
  never silently swaps to a free/cheaper model.
- **Triggered two ways:** (1) reactively — after a chat message or match result the
  client pings `GET /api/bot`; (2) a daily Vercel cron (`23 7 * * *` UTC) runs the
  full sweep (catch-up replies, memory refresh, proactive taunts, jab/banter
  enrichment). Chat replies can also stream live via `POST /api/bot/stream`.
- Answers at most 5 messages per tick and always advances its cursor, so a failed
  call never blocks the schedule. Every surfaced sentence passes strict Hebrew +
  prompt-leak validation.

### Env vars (server-only — never `NEXT_PUBLIC_`)

```bash
OPENROUTER_API_KEY=sk-or-...
OPENROUTER_MODEL=deepseek/deepseek-v4-flash   # optional override
```

### Deploy

1. Set the same vars in Vercel → Project → Settings → Environment Variables.
2. Push this repo — `vercel.json` registers the daily cron automatically.
3. Verify: Vercel → Cron Jobs shows the daily run, and the chat page shows bot replies.

No database schema change is required: the bot's progress cursor and state live in
the existing `settings` table (`bot_state`), and bot messages use the free-form
`author_name` "קובה בוט" (kept out of the roster so the bot never answers itself).

The full bot architecture is documented in [`ARCHITECTURE.md`](./ARCHITECTURE.md) §6.
