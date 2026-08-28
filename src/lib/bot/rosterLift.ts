import { fetchSetting, upsertSetting } from '@/lib/supabase/settings'
import { fetchPlayers } from '@/lib/supabase/players'
import { fetchMatches } from '@/lib/supabase/matches'
import { computePlayerStats } from '@/lib/supabase/stats'
import { rosterFor } from '@/lib/data/roster'
import { BOT_NAME } from '@/lib/bot/constants'
import { buildSystemPrompt, loadBotConfig, sanitizeReply, buildBanterPool, isValidHebrewSentence } from '@/lib/bot/prompts'
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
 * Wipe-and-regenerate ("refresh the whole pool on the server") for the
 * bot's authored content. This is the hard reset the manual "רענן הכל" button
 * should run:
 *  1. Clears every bot-author jab in `roster_overrides` (nicknames kept).
 *  2. Drops every bot-authored banter line from `fun_sentences` (human lines
 *     — any author that isn't the bot — are always kept permanent).
 *  3. Regenerates a fresh jab for every active player.
 *  4. Generates `newBanter` brand-new bot banter lines.
 * Never touches nicknames or human-written sentences, so nothing of the group's
 * own voice is ever lost.
 */
export async function refreshAllContent(opts?: {
  newBanter?: number
}): Promise<{ jabs: { written: number; lines: string[] }; banter: { written: number; kept: number; lines: string[] } }> {
  const newBanter = Math.max(1, opts?.newBanter ?? 6)

  // 1) Wipe jabs, keeping nicknames.
  const overrides = ((await fetchSetting(OVERRIDES_KEY)) as Overrides | null) ?? {}
  const cleaned: Overrides = {}
  for (const [name, ov] of Object.entries(overrides)) {
    if (ov?.nickname) cleaned[name] = { nickname: ov.nickname }
    else if (ov && typeof ov === 'object') cleaned[name] = {}
  }
  await upsertSetting(OVERRIDES_KEY, cleaned)

  // 2) Drop bot-authored banter, keep human lines permanent.
  const pool = ((await fetchSetting(SENTENCES_KEY)) as BanterPool | null ?? [])
  const humanLines = pool.filter((x) => (x as { author?: string }).author !== BOT_NAME)
  await upsertSetting(SENTENCES_KEY, humanLines)

  // 3-4) Generate a fresh jab for every player + fresh banter lines, IN PARALLEL
  // (the player pool is small; sequential LLM round-trips blow the serverless
  // budget). Jabs reuse the same prompts liftRosterJabs builds.
  const allPlayers = await fetchPlayers()
  const activePlayers = allPlayers.filter((p) => p.is_active !== false)
  const digest = await buildBotDigest()
  const banterPool = await buildBanterPool()
  const config = await loadBotConfig()
  const system = buildSystemPrompt(digest, banterPool, config)

  // Build the jab job list: one per active player, prompted with their digest line.
  const jabJobs = activePlayers.map((p) => {
    const line = digest.split('\n').find((l) => l.includes(p.name)) ?? p.name
    return {
      name: p.name,
      system,
      prompt: `חבר "${p.name}". הנה השורה שלו מהדיגסט: "${line}". כתוב עקיצה חדשה (ג'אב) ב-8-15 מילה, בסגנון הקובה, מבוססת רק על הדיגסט. החזר רק את הג'אב בלי מראקות ובלי הסבר.`,
    } as const
  })

  // Run a bounded number of LLM calls concurrently so the whole refresh fits in
  // one function invocation (no sequential N× round-trips).
  const CHUNK = 5
  async function runChunks<T>(jobs: readonly T[], fn: (job: T) => Promise<string | null>): Promise<Array<string | null>> {
    const out: Array<string | null> = []
    for (let i = 0; i < jobs.length; i += CHUNK) {
      const chunk = jobs.slice(i, i + CHUNK)
      out.push(...(await Promise.all(chunk.map((j) => fn(j).catch(() => null)))))
    }
    return out
  }

  const jabLines = await runChunks(jabJobs, async (j) => {
    const raw = await generateReply({
      system: j.system,
      author: BOT_NAME,
      userText: j.prompt,
      history: [],
    })
    const jab = truncateAtWord(sanitizeReply(raw), 160)
    // Discard anything that isn't valid Hebrew — never store mangled output.
    return jab && isValidHebrewSentence(jab) ? jab : null
  })

  // Apply the regenerated jabs onto the (nickname-only) override map.
  const lifted: { name: string; jab: string }[] = []
  jabJobs.forEach((j, i) => {
    const jab = jabLines[i]
    if (jab) lifted.push({ name: j.name, jab })
  })
  const nextOverrides = applyLift(cleaned, lifted).next
  await upsertSetting(OVERRIDES_KEY, nextOverrides)

  // Fresh banter, also parallel, on top of the preserved human lines.
  const fresh: BanterPool = [...humanLines]
  const seen = new Set(humanLines.map((x) => x.text))
  const banterJobs = Array.from({ length: newBanter }, (_, i) => i) as number[]
  const banterLines = await runChunks(banterJobs, async () => {
    const raw = await generateReply({
      system,
      author: BOT_NAME,
      userText:
        'כתוב עקיצה קצרה אחת (10-20 מילה) בסגנון הקובה, מבוססת על הדיגסט ובטון הקבוצה. החזר רק את העקיצה בלי סימון והסבר.',
      history: [],
    })
    const line = truncateAtWord(sanitizeReply(raw), 140)
    // Only keep valid Hebrew banter — invalid/mangled output is dropped.
    return line && isValidHebrewSentence(line) ? line : null
  })
  let banterWritten = 0
  const freshBanter: string[] = []
  for (const line of banterLines) {
    if (line && !seen.has(line)) {
      fresh.push({ text: line, author: BOT_NAME })
      seen.add(line)
      banterWritten++
      freshBanter.push(line)
    }
  }
  await upsertSetting(SENTENCES_KEY, fresh)
  return {
    jabs: { written: lifted.length, lines: lifted.map((l) => l.jab) },
    banter: { written: banterWritten, kept: humanLines.length, lines: freshBanter },
  }
}