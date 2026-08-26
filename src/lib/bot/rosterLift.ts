import { fetchSetting, upsertSetting } from '@/lib/supabase/settings'
import { fetchPlayers } from '@/lib/supabase/players'
import { fetchMatches } from '@/lib/supabase/matches'
import { computePlayerStats } from '@/lib/supabase/stats'
import { rosterFor } from '@/lib/data/roster'
import { BOT_NAME } from '@/lib/bot/constants'
import { buildSystemPrompt, loadBotConfig, sanitizeReply, buildBanterPool } from '@/lib/bot/prompts'
import { generateReply } from '@/lib/bot/gemini'
import { buildBotDigest } from '@/lib/bot/context'

/** `settings` key holding the `{ name: { nickname?, jab? } }` override map. */
const OVERRIDES_KEY = 'roster_overrides'
/** `settings` key holding the user-curated banter sentence pool. */
const SENTENCES_KEY = 'fun_sentences'
/** `settings` key recording per-player jab-proposal cadence. */
const JAB_LOG_KEY = 'bot_jab_log'

/** Default jab shown for a roster member with no override yet. */
const DEFAULT_JAB = 'חדש בקבוצה — בינתיים רק חטיפים.'

/**
 * Cap a jab/banter line to `max` chars WITHOUT cutting mid-word or mid-emoji:
 * slice to max, then back off to the last space (same rule `sanitizeReply`
 * applies). A hard `.slice(0, n)` would split a Hebrew/emoji token.
 */
export function truncateAtWord(text: string, max: number): string {
  const chars = [...text]
  if (chars.length <= max) return text.replace(/\s+/g, ' ').trim()
  const cut = chars.slice(0, max).join('')
  const lastSpace = cut.lastIndexOf(' ')
  return (lastSpace > 0 ? cut.slice(0, lastSpace) : cut).replace(/\s+/g, ' ').trim()
}

type Overrides = Record<string, { nickname?: string; jab?: string }>
type BanterPool = { text: string; author?: string }[]

/**
 * Pure: apply candidate jabs to the existing override map, WITHOUT ever
 * writing a nickname. Returns the next map + how many applied. `candidates`
 * is `{ name, jab }` — any nickname key on a candidate is ignored (so a future
 * caller can't sneak one through the type).
 */
export function applyLift(
  overrides: Overrides,
  candidates: { name: string; jab: string }[]
): { next: Overrides; applied: number } {
  const next: Overrides = {}
  let applied = 0
  for (const [name, cur] of Object.entries(overrides)) next[name] = { ...cur }
  for (const c of candidates) {
    if (!c.jab) continue
    applied++
    next[c.name] = {
      ...(next[c.name]?.nickname ? { nickname: next[c.name].nickname } : {}),
      jab: c.jab,
    }
  }
  return { next, applied }
}

/** Current jab for a player, override-aware (override → static roster → default). */
function currentJab(name: string, overrides: Overrides): string {
  const ov = overrides[name]?.jab?.trim()
  if (ov) return ov
  return rosterFor(name)?.jab ?? DEFAULT_JAB
}

function jabLogKey(name: string): string {
  return `jab:${name}`
}

/**
 * One sweep of "the bot deepens the group's jabs". Purely additive to
 * `roster_overrides` and ONLY touches the `jab` field — never nickname.
 *
 * Picks at most `max` players who (a) still show the default jab, or (b) hold
 * a jab old enough (≥ gapDays) to refresh. Records a probe timestamp so the
 * same player isn't re-asked every sweep. Budget-limited so a single sweep
 * never burns the provider budget.
 */
/**
 * True when a player's current jab is still boilerplate — either the unset
 * default or the original static roster jab — i.e. it has never been replaced
 * by a human edit or a prior bot lift. Used to scope a non-destructive regen.
 */
export function isBoilerplateJab(name: string, overrides: Overrides): boolean {
  const cur = overrides[name]?.jab?.trim()
  if (!cur) return true // never overridden → static roster jab or default
  return cur === DEFAULT_JAB || cur === rosterFor(name)?.jab
}

export async function liftRosterJabs(opts?: {
  max?: number
  gapDays?: number
  regenAll?: boolean
}): Promise<{ requested: number; written: number; errors: number }> {
  const max = Math.max(0, Math.min(5, opts?.max ?? Number(process.env.BOT_JAB_MAX ?? 2)))
  const gapDays = Math.max(1, opts?.gapDays ?? Number(process.env.BOT_JAB_COOLDOWN_DAYS ?? 7))

  const overrides = ((await fetchSetting(OVERRIDES_KEY)) as Overrides | null) ?? {}
  const log = ((await fetchSetting(JAB_LOG_KEY)) as Record<string, string> | null) ?? {}
  const now = Date.now()

  const players = await fetchPlayers()
  const candidates = players.filter((p) => p.is_active !== false)
  // Everyday lift: fresh jab iff default OR last probe is old enough to refresh.
  // regenAll ("change all the jabs with the new model"): EVERY still-boilerplate
  // jab (untouched by a human) is regenerated in one shot — human hand-edits on
  // the player page are always preserved.
  const eligible = candidates.filter((p) => {
    if (opts?.regenAll) return isBoilerplateJab(p.name, overrides)
    const isDefault = currentJab(p.name, overrides) === DEFAULT_JAB
    const last = log[jabLogKey(p.name)]
    const due = !last || now - new Date(last).getTime() > gapDays * 24 * 60 * 60 * 1000
    return isDefault || due
  })
  const picked = opts?.regenAll ? eligible : eligible.slice(0, max)

  let requested = 0
  let written = 0
  let errors = 0
  if (picked.length === 0) return { requested, written, errors }

  const digest = await buildBotDigest()
  const banterPool = await buildBanterPool()
  const config = await loadBotConfig()

  const nextOverrides: Overrides = { ...overrides }
  const nextLog = { ...log }
  const lifted: { name: string; jab: string }[] = []
  for (const p of picked) {
    requested++
    const line = digest.split('\n').find((l) => l.includes(p.name)) ?? p.name
    try {
      const raw = await generateReply({
        system: buildSystemPrompt(digest, banterPool, config),
        author: BOT_NAME,
        userText: `חבר "${p.name}". הנה השורה שלו מהדיגסט: "${line}". כתוב עקיצה חדשה (ג'אב) ב-8-15 מילה, בסגנון הקובה, מבוססת רק על הדיגסט. החזר רק את הג'אב בלי מראקות ובלי הסבר.`,
        history: [],
      })
      const jab = truncateAtWord(sanitizeReply(raw), 160)
      if (jab) lifted.push({ name: p.name, jab })
      else errors++
    } catch {
      errors++
    } finally {
      nextLog[jabLogKey(p.name)] = new Date().toISOString()
    }
  }
  const { next, applied } = applyLift(nextOverrides, lifted)
  await upsertSetting(OVERRIDES_KEY, next)
  await upsertSetting(JAB_LOG_KEY, nextLog)
  return { requested, written: applied, errors }
}

/**
 * One bot-authored banter line appended to the shared `fun_sentences` pool
 * (author = BOT_NAME, so the BotTalk chip already marks it). Cheap: generates
 * a single topical line, never touches other entries.
 */
export async function addBotBanter(): Promise<{ added: boolean; line: string }> {
  const pool = (await fetchSetting(SENTENCES_KEY)) as BanterPool | null ?? []
  const digest = await buildBotDigest()
  const config = await loadBotConfig()
  const banterPool = await buildBanterPool()
  const raw = await generateReply({
    system: buildSystemPrompt(digest, banterPool, config),
    author: BOT_NAME,
    userText: 'כתוב עקיצה קצרה אחת (במסגרת 10-20 מילה) בסגנון הקובה, מבוססת על הדיגסט ובטון הקבוצה. החזר רק את העקיצה בלי סימון והסבר.',
  })
  const text = truncateAtWord(sanitizeReply(raw), 140)
  if (!text) return { added: false, line: '' }
  const next = [...pool.filter((x) => x?.text !== text), { text, author: BOT_NAME }]
  await upsertSetting(SENTENCES_KEY, next)
  return { added: true, line: text }
}

/**
 * One-shot "change all the sentences with the new model" for the banter pool:
 * every existing bot-authored line (author === BOT_NAME, the AI-written ones) is
 * regenerated with the paid model. USER-authored lines (no bot author) are
 * always kept untouched. Replaces the old bot lines in place, de-dup'd.
 */
export async function regenerateBotBanter(): Promise<{ written: number; replaced: number }> {
  const pool = ((await fetchSetting(SENTENCES_KEY)) as BanterPool | null ?? [])
  const userLines = pool.filter((x) => (x as { author?: string }).author !== BOT_NAME)
  const botLines = pool.filter((x) => (x as { author?: string }).author === BOT_NAME)

  // Nothing bot-authored to refresh → nothing to do.
  if (botLines.length === 0) return { written: 0, replaced: 0 }

  const digest = await buildBotDigest()
  const banterPool = await buildBanterPool()
  const config = await loadBotConfig()
  const system = buildSystemPrompt(digest, banterPool, config)

  let written = 0
  let replaced = 0
  // User-authored lines are kept verbatim; every bot line gets regenerated.
  const fresh: BanterPool = [...userLines]
  const seen = new Set(userLines.map((x) => x.text))
  for (const _old of botLines) {
    try {
      const raw = await generateReply({
        system,
        author: BOT_NAME,
        userText: `כתוב עקיצה קצרה אחת (10-20 מילה) בסגנון הקובה, מבוססת על הדיגסט ובטון הקבוצה. החזר רק את העקיצה בלי סימון והסבר.`,
      })
      const line = truncateAtWord(sanitizeReply(raw), 140)
      if (line && !seen.has(line)) {
        fresh.push({ text: line, author: BOT_NAME })
        seen.add(line)
        replaced++
      }
    } catch {
      // keep the existing bot line
    }
    written++
  }
  await upsertSetting(SENTENCES_KEY, fresh)
  return { written, replaced }
}