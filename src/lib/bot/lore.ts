/**
 * Parse + compact a WhatsApp group export (.txt) into a bounded lore excerpt
 * the bot can live on. Mirrors `scripts/embed-lore.mjs`' parsing (timestamped
 * `[date, time] author: message` lines, system/sticker/media noise dropped),
 * then dedups exact repeats and hard-truncates so the free-tier prompt stays
 * cheap instead of re-sending the full 200KB+ history every call.
 */

/** Bounded target length (graphemes) of the excerpt. */
export const LORE_EXCERPT_CHARS = 3500

/** `[30.9.2024, 19:19:57] אברהם אחי: נכנסים בקו 11 שמעתי` */
const LINE_RE = /^\[\d{1,2}\.\d{1,2}\.\d{4}, \d{1,2}:\d{2}(?::\d{2})?(?:\s?[AP]M)?\] (.+)$/
const RTL_MARKS = /^[‎‏‪-‮]+/
const DROP_CONTENT = /סטיקר הושמט|מדיה הושמט|הושמט|התקשר|זומבי הושמט|צפייה לא מוצגת/i

/**
 * Parse raw WhatsApp export text into its authored `author: message` lines
 * (timestamps + RTL marks + noise dropped), oldest first.
 */
export function parseLore(raw: string): { author: string; content: string }[] {
  const out: { author: string; content: string }[] = []
  for (const line of raw.split(/\r?\n/)) {
    if (!line.trim()) continue
    const m = LINE_RE.exec(line.replace(RTL_MARKS, '').trim())
    if (!m) continue
    const content = m[1].replace(RTL_MARKS, '').trim()
    if (!content) continue
    if (DROP_CONTENT.test(content)) continue
    if (content.split(':')[0]?.includes('🍺')) continue // group-name system messages
    const colon = content.indexOf(':')
    const author = colon > 0 ? content.slice(0, colon).trim() : '?'
    const body = colon > 0 ? content.slice(colon + 1).trim() : content
    out.push({ author, content: body })
  }
  return out
}

/**
 * Compress parsed lore into a bounded, deduped excerpt — the block the bot's
 * system prompt actually receives. Reads as lines, so dedup can work per line
 * while the whole thing stays under `targetChars`.
 */
export function compactLore(raw: string, targetChars = LORE_EXCERPT_CHARS): string {
  const seen = new Set<string>()
  const lines: string[] = []
  let budget = targetChars

  for (const m of parseLore(raw)) {
    const line = `${m.author}: ${m.content}`.trim()
    if (!line) continue
    if (seen.has(line)) continue
    const size = line.length + 1 // + newline
    if (size > budget) continue
    seen.add(line)
    lines.push(line)
    budget -= size
  }
  return lines.join('\n')
}

/** Header distinguishing a hand-typed update from the dumped group history. */
const MANUAL_NOTE_HEADER = 'עדכון שדווח ידנית (מה קרה לאחרונה):'

/**
 * Append a free-text human note ("tell me what happened recently") to an
 * existing lore excerpt WITHOUT re-parsing WhatsApp timestamps. The base
 * history stays intact; the note is kept whole and appended under its own
 * header. If the combined block would pass `targetChars`, only the oldest
 * tail of the *base* is trimmed to make room — the new note is never cut.
 */
export function appendLoreNote(existing: string, note: string, targetChars = LORE_EXCERPT_CHARS): string {
  const clean = note.trim()
  if (!clean) return existing || ''
  const base = (existing || '').trim()

  const section = `${MANUAL_NOTE_HEADER}\n${clean}`
  const sectionSize = [...section].length + 1 // + trailing newline

  let head = ''
  if (base) {
    const room = Math.max(0, targetChars - sectionSize)
    head = base.length <= room ? base : [...base].slice(base.length - room).join('')
  }
  return (head ? head + '\n' : '') + section
}
