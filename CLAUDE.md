# CLAUDE.md

**קובה של שבת** — open-access FC26 (FIFA) tournament tracker for a friend group. Hebrew RTL UI, no auth, Supabase as the sole backend, and a Hebrew-banter AI chat bot (קובה בוט).

## Read this first

**Read [`ARCHITECTURE.md`](./ARCHITECTURE.md) before exploring the code.** It is the single source of truth for the project structure, data flow, bot system, and conventions. Use its §9 "Finding your way" table to jump straight to the relevant files — don't re-scan the whole repo.

Key pointers that save the most time:
- Data layer: `src/lib/supabase/` — direct anon-key Supabase calls; the `settings` table (jsonb) is the runtime config store (more keys listed in ARCHITECTURE §4.3).
- Bot system: `src/lib/bot/` — see ARCHITECTURE §6 before touching any bot code. One paid OpenRouter model (`deepseek-v4-flash` default, `OPENROUTER_MODEL` override), no free tier.
- Bot-authored scope is **jabs + banter only** — never nicknames, never invented stats. Output gates: `sanitizeReply` + `isValidHebrewSentence`.
- Weeks run Sat→Fri in `Asia/Jerusalem` via `src/lib/utils/dateHelpers.ts`.

## Rules

- **Git: push to `main` directly — no branches, no PRs (repo owner's standing rule).** ff-push local commits.
- Matches are soft-deleted (`deleted_at`); standings come from Postgres views; matches/players updates reach clients via Supabase Realtime.
- BOT_NAME (`קובה בוט`) must stay out of the roster so the bot never replies to itself.
- Tests: Vitest, `npm test`. Pure-computation modules (`stats`, `odds`, `recap`, bot helpers) are unit-tested — keep it that way when you change them.