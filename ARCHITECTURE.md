# קובה של שבת — Project Architecture

Long-lived architecture reference for the FIFA head-to-head tracker. Read this before diving into the code; it is the single source of truth for how the repo is organized and how the pieces connect. If you're new to the repo, start here and use **§9 Finding your way** to jump straight to the files you need — don't re-scan the whole codebase.

> Last verified against `main` (origin `HEAD`) in September 2026. If you change something structural (new table, new settings key, new API route, new bot content type), update the matching section here.

---

## 1. What this is

**קובה של שבת** — an open-access FC26 (FIFA) tournament tracker for a group of friends. Anyone can add players, log 1v1 / 2v2 matches, and watch live standings — **no authentication**. Hebrew RTL UI, PWA-ready.

The "product" is a **Saturday-night ritual**: the group plays, enters results, and the app crowns champions, taunts the loser (who owes the group a bottle of whisky — see `WHISKY_RULE` in `src/lib/data/roster.ts`), and a chat bot called **קובה בוט** live-commentates with data-grounded Hebrew banter.

High-level features:

| Feature | Where |
|---|---|
| Home — all-time board, player cards, odds card, bot talk, mini chat | `src/app/page.tsx` + `src/components/widgets/` |
| Tournament gate (open on Saturday, auto-closes) | `src/lib/supabase/tournamentGate.ts`, `TournamentGate.tsx` |
| Match entry 1v1/2v2 + soft-delete/restore | `MatchEntryForm.tsx`, `src/lib/supabase/matches.ts`, `HistoryTable` |
| Standings (weekly + all-time, from Postgres views) | `src/app/standings/page.tsx`, `src/lib/supabase/standings.ts` |
| Player profiles (stats, streaks, head-to-head) | `src/app/players/[id]/page.tsx`, `src/lib/supabase/stats.ts` |
| Records / career stats ("trophy cabinet") | `RecordsBoard.tsx`, `computeCareerRecords` in `stats.ts` |
| Whisky vote — who's buying this week (per device/week) | `WhiskeySurvey.tsx`, `src/lib/supabase/survey.ts` |
| Whisky odds card (who's *most likely* to lose) | `WeeklyOddsCard.tsx`, `src/lib/supabase/odds.ts` |
| Weekly recap (champion, loser, streaks…) | `WeekRecapCard.tsx`, `src/lib/supabase/recap.ts` |
| Chat + AI bot banter | `GroupChat.tsx` / `ChatBox.tsx`, `src/lib/bot/*` |

---

## 2. Stack

- **Next.js 16 (App Router)** + **React 19** + **TypeScript** (`strict`). Path alias `@/*` → `src/*`.
- **Tailwind CSS v4** — CSS-first theme entirely in `src/globals.css` (dark `.dark` class + light `:root`, warm "private club" palette, `color-mix` semantic tokens). **There is no `tailwind.config.ts`.** Fonts: Rubik (Hebrew) + JetBrains Mono via CSS vars.
- **Supabase** as the sole backend: anon-key client, **open RLS** (no auth), **Realtime** subscriptions, Storage (`avatars` bucket) for profile pictures.
- **Vitest** for unit tests (all tests live next to their module: `*.test.ts`).
- No ORM, no state-management library, no custom server backend.

**Deployment:** Vercel, git-integrated auto-deploy (push to `main` deploys). One scheduled job: `vercel.json` defines a **daily cron at `23 7 * * *` UTC** (`GET /api/bot?force=1&sweep=daily`) — that's the bot's daily sweep, ~10:23 Israel time.

---

## 3. Directory map

```
src/
├── app/                     Next App Router: pages + the only API routes
│   ├── layout.tsx            server component; RTL/theme; wraps app in providers
│   ├── page.tsx              home (client)
│   ├── chat/  tournament/  standings/  survey/  records/  history/
│   ├── players/[id]/         player profile
│   ├── admin/import/         WhatsApp-lore import + bot regen admin
│   └── api/
│       ├── bot/route.ts        GET batch/cron bot processing  (main handler)
│       ├── bot/stream/route.ts POST SSE streaming replies
│       ├── bot/live/route.ts   GET page-load banter
│       ├── players/[id]/route.ts   PATCH profile picture URL
│       └── admin/import-lore/route.ts  POST WhatsApp export → compacted lore
├── components/
│   ├── nav/                 Header (desktop), TabBar (mobile), nav.ts (single nav-source)
│   ├── ui/                  Button, Modal, Avatar, ThemeToggle, input, FAB…
│   ├── forms/               MatchEntryForm, AddPlayerForm
│   ├── cards/               PlayerCard
│   └── widgets/             feature cards (all 'use client')
├── lib/
│   ├── supabase/            client + data modules + hooks  ← the data layer
│   ├── bot/                 AI bot  ← the complex part, see §6
│   ├── data/roster.ts       static 8-man roster + power rank + whisky rule
│   ├── chat/identity.ts     localStorage chat identity
│   ├── types/database.ts    TS mirror of the Postgres schema
│   └── utils/               dateHelpers, sortHelpers, avatarHelpers
└── globals.css              the entire theme
```

---

## 4. Data layer & the "no backend" pattern

There is **no server-side data proxy**. Pages and hooks call Supabase **directly from the browser** with the anon key. The only API routes are the 5 in §3 — bot interaction, lore import, avatar patching — **not** general CRUD.

### 4.1 Database (`src/lib/types/database.ts`)

| Table | Notes |
|---|---|
| `players` | `id`, `name`, `profile_picture_url`, `is_active` |
| `matches` | 1v1 or 2v2; `week_start_date` anchors the week; `deleted_at` = **soft delete** |
| `chat_messages` | `author_name` (free text), `body`, `created_at` |
| `whiskey_votes` | `player_id` + `voter_token` + `week_start_date` (one vote/device/week) |
| `settings` | `key` (text) + `value` (jsonb) — **the config store** (see §4.3) |

Postgres **views**: `weekly_standings`, `all_time_standings` (schema in `supabase/schema.sql`) — standings are pre-computed by SQL, so week transitions need zero app code.

### 4.2 Client (`src/lib/supabase/client.ts`)

`getSupabase()` — lazy singleton, anon key from `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY`. `hasSupabaseConfig()` lets components degrade gracefully when env vars are absent (e.g., during build). **No service-role key anywhere.**

### 4.3 The `settings` table = the runtime config store

This is the most important data pattern to learn. Runtime overrides and all bot state live as JSON under named keys, upserted and watched via Realtime:

| Key | Holds |
|---|---|
| `roster_overrides` | human + bot-authored nicknames & jabs (edit in player profile / upload page) |
| `fun_sentences` | banter pool: built-in phrases + user-added sentences + **bot-authored banter** |
| `bot_system_prompt` | custom system prompt override |
| `bot_state` | bot cursor/lock/cooldown/proactive budget — see §6.7 |
| `tournament` | gate override: `'auto' | 'on' | 'off'` |
| `bot_memory` | rolling "what the bot remembers about the group" |
| `bot_lore_excerpt` | compacted WhatsApp group history (from admin import) |
| `bot_enable_lore` / `bot_history_window` | lore toggle / reply history window |
| `bot_regen_event` | written by manual "smart regen" so open clients toast a refresh notice |

When adding a new runtime configurable thing: **add a `settings` key, don't add a table.** (`upsertSetting` / `fetchSetting` in `src/lib/supabase/settings.ts`.)

### 4.4 Data access layering in `src/lib/supabase/`

- **Server/data modules** (plain async fns, call `getSupabase()`): `matches.ts`, `players.ts`, `chat.ts`, `settings.ts`, `standings.ts`, `survey.ts`.
- **Pure computation** (pure functions, no DB — unit-tested, pass data in): `stats.ts`, `odds.ts`, `recap.ts`. `botState.ts` and `tournamentGate.ts` are thin logic wrappers over `settings.ts`.
- **React hooks** (`'use client'`):
  - `useTournamentData.tsx` — **`TournamentDataProvider`**: central realtime store holding `players` + non-deleted `matches`, refreshed on any `players`/`matches` Postgres change. Wrapped once in `layout.tsx`; most pages read from it via `useTournamentData()`.
  - `useRosterSettings.tsx` — **`RosterSettingsProvider`**: `nicknameFor`, `jabFor`, `sentences`, `systemPrompt` from the settings keys above, live-updated via Realtime.
  - `useTournamentGate.ts` — reads the `tournament` key, exposes `open` / `ended` / `isSaturdayToday`, `setMode`/`cycle`.

### 4.5 How a page gets data

- **Home / players profile / records / history**: consume `useTournamentData` (and `useRosterSettings`) context — no direct fetches.
- **Standings / survey**: fetch directly (`fetchStandings`, `fetchPlayers`…) — these need data not in the context store.
- Match writes go straight through Supabase fns (`addMatch`, `submitVote`…) and Realtime pushes the update to every open client.

---

## 5. Weeks & timezone

Everything is anchored to **Israel Saturdays** in `Asia/Jerusalem` — a "week" runs **Saturday → Friday**. Utilities in `src/lib/utils/dateHelpers.ts` (unit-tested):

- `getSaturdayWeekKey(date)` / `getCurrentWeekKey()` → `YYYY-MM-DD` of the week's Saturday
- `isSaturday`, `getJerusalemHour`, `getRecentWeekKeys`, `formatWeekKey`

Every match is tagged `week_start_date`; standings views group by it.

---

## 6. The bot system (the complex part)

A chat bot (**קובה בוט**) that replies to group chat with **data-grounded Hebrew banter** — never hallucinated stats. It is deliberately kept from *ever sounding generic*: every surfaced sentence passes strict Hebrew + leak validation.

### 6.1 Provider & model

- **OpenRouter** (`https://openrouter.ai/api/v1/chat/completions`), **one paid model only**. Code default `deepseek/deepseek-v4-flash`, overridable via env `OPENROUTER_MODEL`. There is **no free tier and no fallback model** — if the paid call fails, the reply fails (never silently swaps to a cheaper provider). This invariant is pinned by `openrouter.test.ts` ("green-field lock").
- Rate limits handled with exponential backoff + jitter in `openrouter.ts` (3 retries → `OpenRouterRateLimitError`), then the bot falls into a cooldown.
- Server-only env vars: `OPENROUTER_API_KEY`, `OPENROUTER_MODEL` (never `NEXT_PUBLIC_`).

### 6.2 Module map (`src/lib/bot/`)

| Module | Role |
|---|---|
| `constants.ts` | `BOT_NAME = 'קובה בוט'`, `SETTINGS_KEY_BOT_STATE`, `MAX_REPLIES_PER_TICK = 5`. BOT_NAME is **not** in the roster so the bot never replies to itself. |
| `context.ts` | `buildBotDigest()` — the grounded stats "digest" the bot answers from (fetches players+matches, computes the same stats the UI shows, formats to Hebrew text). |
| `prompts.ts` | Prompt hub: `buildSystemPrompt(digest, banterPool, opts)` (identity + digest + whisky rule + memory + lore + 3 random banter lines), `loadBotConfig()`, `buildBanterPool()`, **`sanitizeReply()`** (strips markdown/URLs/CoT/instruction leaks, enforces ≤500 chars word-boundary), `isValidHebrewSentence()` gate, leak detectors. |
| `openrouter.ts` | The OpenRouter client: `generateReply()` (one-shot), `streamReply()` (SSE tokens). |
| `liveBanter.ts` | `getLiveBanter()` — home-page BotTalk card: one-liner + fresh jab per active player. Cached 60s by digest signature. |
| `rosterLift.ts` | Bot "deepens" the group over time: `liftRosterJabs()` (fresh jabs), `addBotBanter()` (new banter line), `refreshAllContent()` (wipe-and-regen, used by the admin "refresh all" button). **Invariant: never writes nickname fields** (`applyLift`). |
| `memory.ts` | `maybeUpdateBotMemory()` — periodically compresses recent chat into a 3-sentence "what the bot remembers" note in `bot_memory`. |
| `lore.ts` | `parseLore()` / `compactLore()` — WhatsApp export → bounded excerpt (`bot_lore_excerpt`), fed to prompts as group history. |
| `ping.ts` | `pingBotNow()` / `pingBotNowResult(scoreline)` — client-side wake-up calls to `/api/bot` after chat / match entry. |
| `useBotStream.ts` | Client hook `useBotStreaming()` — streams the bot reply into the chat box via `/api/bot/stream`. |
| `whatsappLore.generated.ts` | Compiled-in WhatsApp history string (fallback lore source; generated by `scripts/embed-lore.mjs`). |

### 6.3 Three trigger paths

| Path | When | What fires |
|---|---|---|
| **A. Reactive — chat message** | user sends chat | `pingBotNow()` → `GET /api/bot`; sender also streams via `/api/bot/stream` |
| **B. Reactive — match result** | result entered (gate open) | `pingBotNowResult("scoreline")` → `GET /api/bot?result=...` so the bot reacts to the score |
| **C. Scheduled — cron** | daily `23 7 * * *` UTC | `GET /api/bot?force=1&sweep=daily` — full pipeline + proactive notes + lifts |

### 6.4 `GET /api/bot` — the batch processor (main brain)

Two entry modes: **reactive** pings (`force` unset — an instant reply to a chat message or a just-entered result) and **cron** ticks (`force=1`). On cron there are two cadences (only `sweep=daily` is registered in `vercel.json` today): `sweep=daily` runs the full pipeline *plus* the once-a-day jab/banter enrichment; `sweep=live` (not yet scheduled) runs only the gate-gated proactive note. `?result=` (from a fresh match) folds the scoreline into the reply's prompt.

1. **Guard**: refuses to run without `OPENROUTER_API_KEY`. Optional `?regen=all&secret=BOT_REGEN_SECRET` → `refreshAllContent()` (+ `invalidateLiveBanter()` so the home card regenerates, and writes `bot_regen_event` so open clients toast the "smart refresh").
2. **Lock**: `acquireBotLock()` — TTL mutex in `bot_state`; an overlapping tick short-circuits with `skipped`.
3. **Cooldown** check (`cooldown_until`) — stay quiet while set.
4. **Cold-start anchor**: on first run ever, anchor the cursor to the second-newest message (or the epoch in an empty room) so the bot answers the very first real message but never replays all history.
5. **Cursor**: fetch human messages newer than `last_msg_created_at` (`author_name !== BOT_NAME` filters out the bot itself — the self-reply guard).
6. **Context**: `buildBotDigest()` → `buildBanterPool()` → `loadBotConfig()` → `buildSystemPrompt()`.
7. **Reply loop** (≤ `MAX_REPLIES_PER_TICK`, calls spaced ~1.2s so a burst doesn't pile into one rate-limit wall): per new message build history (≤ `historyWindow`, default 24), `generateReply()` → `sanitizeReply()` → `sendChatMessage(BOT_NAME, reply)`. **On provider failure**: cron sets a 3-min cooldown; reactive sends a friendly "הבוט נתקע בשנייה — נסו שוב" (bot got stuck, retry) fallback so the chat never goes silently mute.
8. **Memory**: `maybeUpdateBotMemory()` — eager on cron, time-budgeted otherwise.
9. **Proactive note** (cron only, gate-gated by `isTournamentOpen`): when the digest signature changed (600-char news check) or a player crossed `STREAK_MIN` = 3 consecutive wins (flare), fire one unprompted taunt. Budgeted `PROACTIVE_DAILY` (default 3/day) + respects the cooldown.
10. **Daily enrichment** (`sweep=daily` only, gate-gated): `liftRosterJabs()` + `addBotBanter()` — once a day.
11. **Persist cursor + state** (if more than `MAX_REPLIES_PER_TICK` messages arrived, the cursor rolls over so the remainder wait for the next tick), release lock.

### 6.5 `POST /api/bot/stream` — streaming reply (SSE)

`useBotStreaming().start(text)` → this route. POSTs the just-sent message, acquires a longer lock (90s — returns 409 if a tick/stream holds it), targets the newest human message matching the text, builds the same context, then `streamReply()` yields tokens as SSE (`data: {token}\n\n`). A **live leak-prefix guard** holds emission while the prefix still looks like model reasoning (THOUGHT/REASONING/CoT/instruction echo) and only starts emitting once real content begins. On completion: `sanitizeReplyOrNull()` the whole accumulated text — if it cleans to empty or is an instruction/CoT leak it is **discarded, not posted** (no fallback substituted); otherwise it's persisted + broadcast via the normal chat INSERT, the cursor advances past the answered message, `data: [DONE]`. On model failure it posts a generic "הבוט לא הצליח לחשוב עכשיו" (couldn't think right now) fallback — never a fake bot answer.

### 6.6 `GET /api/bot/live` — page-load banter

`getLiveBanter()` → `{ ok, line, jabs, headline }` for the home BotTalk card. Cached 60s by digest signature; every surfaced line passes the Hebrew gate.

### 6.7 `bot_state` — the bot's persistent state machine

Stored as JSON under the `bot_state` setting (see `src/lib/supabase/botState.ts`):

| Field | Purpose |
|---|---|
| `last_msg_created_at` | **The message cursor — primary idempotency guarantee.** Advances only after the bot answers. |
| `locked_at` | TTL lock against overlapping ticks/streams |
| `cooldown_until` | Silence window after provider failures |
| `last_digest_sig` | First-600-chars digest signature; change ⇒ "news" ⇒ proactive note |
| `proactive_count` / `proactive_day` | Daily budget for unprompted notes (`dayKey` = UTC date) |
| `last_streaks` | Per-player trailing win-streak lengths (crossing threshold ⇒ note). Only refreshed on cron |

### 6.8 Chat identity & bot authorship

`src/lib/chat/identity.ts` — chat identity is a self-chosen **roster player name** in `localStorage('fifa-chat-identity')`. Bot messages are authored as `BOT_NAME` (an author, not a roster entry). The bot-route's `author_name !== BOT_NAME` filter is the self-reply guard — **keep BOT_NAME out of the roster.**

### 6.9 Bot-authored scope (important boundary)

The bot may **author**: chat replies, live banter lines, jabs (via `rosterLift`), shared banter sentences, memory notes. It must **never**: write nicknames, impersonate a player, invent stats in chat (everything is digest-grounded), or spend beyond its budgets. Enforcement lives in `sanitizeReply` + `isValidHebrewSentence` + `applyLift` + `openrouter.test.ts`.

---

## 7. Conventions & invariants agents must respect

- **Git: push to `main` directly — no branches, no PRs** (repo owner's standing rule). ff-push local commits.
- The **`settings` table is the config store** — add keys, not tables, for new runtime config (§4.3). Keep the key list in this doc in sync.
- Matches are **soft-deleted** (`deleted_at`), never hard-deleted; players have an **`is_active`** flag (inactive players sort last and don't get bot jabs). Keep both behaviors when touching `matches.ts` / `players.ts`.
- **All bot output** goes through the Hebrew sentence gate + `sanitizeReply` before it touches the UI or DB.
- **Week math stays in `Asia/Jerusalem` via `dateHelpers.ts`** — never `new Date()` timezone math at call sites.
- **No auth.** Never introduce auth assumptions; identity is per-device/localStorage.
- The bot is a **single paid OpenRouter model** — don't add a free-tier fallback (test-locked).
- Pages that need live data use the existing context providers; standalone data (standings weeks, survey) fetches directly. Prefer adding to the stores over new fetch plumbing.

---

## 8. Tests (Vitest, `npm test`)

| File | Guards |
|---|---|
| `src/lib/supabase/odds.test.ts` | odds/form/whisky chance math, power-rank nudging |
| `src/lib/supabase/recap.test.ts` | week recap + career records + share-text builder |
| `src/lib/supabase/standings.test.ts` | tie-grouping for the standings table |
| `src/lib/utils/dateHelpers.test.ts` | Israel-Saturday week keys (rollovers, month boundaries) |
| `src/lib/bot/lore.test.ts` | WhatsApp parsing + compacting, dedup, bounds |
| `src/lib/bot/prompts.test.ts` | `sanitizeReply` (markdown/CoT/leaks/500-char boundary), system prompt assembly |
| `src/lib/bot/openrouter.test.ts` | **paid-model lock**: default stays a paid OpenRouter model, honors env override |
| `src/lib/bot/rosterLift.test.ts` | jab-lift invariants: no nickname writes, no emoji splitting, boilerplate detection |
| `src/lib/bot/lore.test.ts` | lore parse/compact (see above) |

---

## 9. Finding your way (symptom → file)

| I want to change… | Start here |
|---|---|
| Chat bot personality / system prompt | `src/lib/bot/prompts.ts` (or the `bot_system_prompt` setting) |
| Bot output looks broken / weird | `sanitizeReply` + `isValidHebrewSentence` in `prompts.ts`, `leak` guards |
| Bot not replying | `bot_state.cursor` + `cooldown_until` (`botState.ts`), lock in `/api/bot` |
| Bot's daily behavior (proactive/taunts/jab lift) | `/api/bot/route.ts` step 8-10 + `rosterLift.ts` |
| The BotTalk card on home | `BotTalk.tsx` + `/api/bot/live` + `liveBanter.ts` |
| Chat UI / streaming reply | `GroupChat.tsx`, `ChatBox.tsx`, `MessageBubble.tsx`, `useBotStream.ts` |
| Match entry / history | `MatchEntryForm.tsx`, `MatchHistoryTable.tsx`, `src/lib/supabase/matches.ts` |
| Standings ordering / ties | `src/lib/supabase/standings.ts` + `groupStandingsRows` |
| "Who owes whisky" odds | `WeeklyOddsCard.tsx` + `src/lib/supabase/odds.ts` |
| Whisky voting | `WhiskeySurvey.tsx` + `src/lib/supabase/survey.ts` |
| Weekly recap facts | `WeekRecapCard.tsx` + `src/lib/supabase/recap.ts` |
| Career records / badges | `RecordsBoard.tsx` + `computeCareerRecords` / `assignBadges` in `stats.ts` |
| Tournament gate open/close rules | `src/lib/supabase/tournamentGate.ts` + `useTournamentGate.ts` |
| Player stats formulas (form/streak) | `src/lib/supabase/stats.ts` |
| Roster names / jabs / nicknames / whisky rule | `src/lib/data/roster.ts` + `roster_overrides` setting |
| Week/key date logic | `src/lib/utils/dateHelpers.ts` |
| Nav / tabs | `src/components/nav/nav.ts` |
| Theme / colors | `src/globals.css` |
| Import WhatsApp history in admin | `/api/admin/import-lore` + `src/lib/bot/lore.ts` |
| "Refresh all bot content" button | `/api/bot?regen=all` + `refreshAllContent()` in `rosterLift.ts` |

---

## 10. End-to-end mental model (60 seconds)

```
[Browser — no auth]
  users enter matches / chat / vote
        │  supabase-js (anon key, direct)
        ▼
[Supabase]  players · matches(soft-delete) · chat_messages · whiskey_votes · settings(jsonb)
        │  views → standings       │ Realtime pushes
        ▼                          ▼
  [Context providers in layout]  [API routes]
   TournamentData (players+matches)   GET /api/bot        ← reactive pings + daily cron
   RosterSettings (jabs/sentences)    POST /api/bot/stream ← SSE chat streaming
   useTournamentGate (gate)           GET /api/bot/live    ← home banter
                                      POST /api/admin/import-lore
        │
        ▼
  [Bot, src/lib/bot/]
   context.buildBotDigest() ── the grounded facts
   prompts.buildSystemPrompt() ── identity + digest + memory + lore + banter
   openrouter.ts (OpenRouter, one paid DeepSeek model) ── generateReply / streamReply
   sanitizeReply() ── the output gate
   rosterLift / memory / liveBanter ── the enrichment loops
   bot_state cursor ── "what has the bot already answered"
```