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
- Whiskey survey: one vote per device per day, realtime results
- PWA-ready, RTL Hebrew UI

## Deployment (Vercel)

Set `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` in the Vercel project settings for Production + Preview. The build is client-side-fetched, so it never needs database access at build time.

## Tests

```bash
npm test
```
