import { fetchChatMessages } from '@/lib/supabase/chat'
import { fetchPlayers } from '@/lib/supabase/players'
import { fetchMatches } from '@/lib/supabase/matches'
import { fetchSetting } from '@/lib/supabase/settings'
import { computePlayerStats, assignBadges } from '@/lib/supabase/stats'
import { buildBotDigest } from '@/lib/bot/context'
import { generateReply } from '@/lib/bot/gemini'
import { sanitizeReply, isLeakedInstructions, isCoTLeak } from '@/lib/bot/prompts'
import { buildBanterPool, loadBotConfig, buildSystemPrompt, isValidHebrewSentence } from '@/lib/bot/prompts'
import { BOT_NAME } from '@/lib/bot/constants'

/** `settings` key holding the bot rolling memory note. */
const MEMORY_KEY = 'bot_memory'

export interface LiveBanter {
  /** The home/card one-liner grounded in the current data. */
  line: string
  /** Per-player fresh jab (complete Hebrew sentence). */
  jabs: Record<string, string>
  /** "Loser / winner / tightest" headline fact for fallback. */
  headline: string
}

const TTL_MS = 60_000

let cache: { key: string; at: number; value: LiveBanter } | null = null

/** Force the next `/api/bot/live` call to regenerate from scratch. */
export function invalidateLiveBanter(): void {
  cache = null
}

function digestSig(digest: string): string {
  return digest.slice(0, 400)
}

/** Pick the most "newsworthy" headline fact from the live digest text. */
function headlineFromDigest(digest: string): string {
  // Prefer the current-week standings stanza (recent = newsy).
  const week = digest.match(/השבוע הנוכחי:[\s\S]*?(?=\n\n|$)/)?.[0]
  if (week) return week.trim()
  const table = digest.match(/טבלת כל הזמנים \(טופ 5\):[\s\S]*?(?=\n\n|$)/)?.[0]
  return (table ?? digest).trim()
}

/** Strictly trimmed, markdown-stripped, leak-checked, word-safe text. */
function clean(t: string): string {
  return t.replace(/```[\s\S]*?```/g, ' ').replace(/[*_`>#]+/g, '').replace(/https?:\/\/\S+/g, '').replace(/\s+/g, ' ').trim()
}
function isLeak(t: string): boolean {
  return isLeakedInstructions(t) || isCoTLeak(t) || /^\s*(THOUGHT|THINK|REASONING|Confidence|Final)\b/i.test(t)
}
function clampWords(t: string, max = 16): string {
  const words = t.split(/\s+/).filter(Boolean)
  return words.slice(0, max).join(' ')
}
function clampChars(t: string, max = 160): string {
  const chars = [...t]
  if (chars.length <= max) return t
  let cut = chars.slice(0, max).join('')
  const sp = cut.lastIndexOf(' ')
  return (sp > 0 ? cut.slice(0, sp) : cut).trimEnd()
}

/**
 * Generate the group's live banter: the card one-liner + a fresh jab per player,
 * grounded in the REAL current data (digest: table/streaks/this week/head-to-head,
 * plus here the winner/loser badges) AND the recent group chat. Paid model only.
 *
 * Cached by digest signature (short TTL) so frequent page loads reuse the last
 * generation until the underlying data actually changes — then the words move.
 */
export async function getLiveBanter(): Promise<LiveBanter> {
  const [players, matches, digest] = await Promise.all([fetchPlayers(), fetchMatches(), buildBotDigest()])
  const sig = digestSig(digest)
  if (cache && cache.key === sig && Date.now() - cache.at < TTL_MS) return cache.value

  const [messages, memory, config, banterPool] = await Promise.all([
    fetchChatMessages(),
    fetchSetting(MEMORY_KEY),
    loadBotConfig(),
    buildBanterPool(),
  ])

  const active = players.filter((p) => p.is_active !== false)
  const stats = new Map(active.map((p) => [p.id, computePlayerStats(matches, p.id)]))
  const badges = assignBadges(active, stats)

  // Winner / loser line from the live badges (matched by emoji; BADGES isn't exported).
  const winnerName = players.find((p) => badges.get(p.id)?.emoji === '👑')?.name
  const loserName = players.find((p) => badges.get(p.id)?.emoji === '😅')?.name
  const headline = [
    winnerName ? `מלך: ${winnerName}` : '',
    loserName ? `קורבן: ${loserName}` : '',
    `השבוע: ${(digest.match(/השבוע הנוכחי:[\s\S]*?(?=\n\n|$)/)?.[0] ?? '').replace('השבוע הנוכחי:', '').trim() || 'אין עדיין משחקים'}`,
  ].filter(Boolean).join(' • ')

  const memoryText = memory && typeof memory === 'object' && typeof (memory as { text?: unknown }).text === 'string'
    ? (memory as { text: string }).text
    : ''
  const recent = messages.slice(-12).map((m) => `${m.author_name}: ${m.body}`).join('\n')

  const system = buildSystemPrompt(digest, banterPool, config)

  // Per-player fresh jab, grounded in their live stats + badge.
  const jabs: Record<string, string> = {}
  for (const p of active) {
    const s = stats.get(p.id)
    if (!s || s.matches === 0) {
      jabs[p.name] = `${p.name} — עדיין לא שיחק, אבל כבר מדבר. 👀`
      continue
    }
    const badge = badges.get(p.id)?.emoji ?? ''
    try {
      const raw = await generateReply({
        system,
        author: BOT_NAME,
        userText:
          `חבר "${p.name}" (תג ${badge}). נתונים אמיתיים (אל תמציא, אל תני ציטוט): ${s.matches} משחקים, ${s.wins}-${s.draws}-${s.losses} (נ-ת-ה), ${s.goalsFor} שערים, ${s.points} נק', פורם ${s.form ?? '?'}${s.currentStreak ? `, רצף ${s.currentStreak}` : ''}${s.currentGoalDrought > 0 ? `, בלי גול ${s.currentGoalDrought} משחקים` : ''}.` +
          `\nכתוב עקיצה קצרה (עד 12 מילה) בעברית בסגנון הקובה, על המקום הנוכחי של ${p.name} בטבלה ובתוצאות. החזר רק את המשפט, בלי כותרת, בלי הסבר.`
      })
      const jab = clean(sanitizeReply(raw))
      if (jab && !isLeak(jab) && isValidHebrewSentence(jab)) jabs[p.name] = clampChars(clampWords(jab, 14), 140)
      else jabs[p.name] = `${p.name} — בצב מוזר היום. 🤔`
    } catch {
      jabs[p.name] = `${p.name} — בצב מוזר היום. 🤔`
    }
  }

  // The card one-liner: grounded in headline + digest + recent chat.
  let line = ''
  try {
    const raw = await generateReply({
      system,
      author: BOT_NAME,
      userText:
        `אתה קובה בוט. כתוב שורת "משפט התור" אחת — חדה, מצחיקה, קובית — על-סמך הנתונים האמיתיים שבדיגסט והשיחה האחרונה, בלי להמציא.\n` +
        `עובדה בולטת: ${headline}\n\nשיחה אחרונה (7 שורות):\n${recent}\n\n` +
        `החזר שורה אחת (max 15 מילה) בעברית, בסגנון הקובה. בלי כותרת, בלי הסבר, בלי ציטוט.`
    })
    const c = clean(sanitizeReply(raw))
    if (c && !isLeak(c) && isValidHebrewSentence(c)) line = clampWords(c, 15)
  } catch { /* fall through */ }
  if (!line) line = clampWords(headlineFromDigest(digest), 15) || `הקובה מחכה לוויסקי של המפסיד. 🥃`

  const value: LiveBanter = { line, jabs, headline }
  cache = { key: sig, at: Date.now(), value }
  return value
}
