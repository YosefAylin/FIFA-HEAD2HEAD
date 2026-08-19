#!/usr/bin/env node
/**
 * Embed the group's WhatsApp history into the bot bundle.
 *
 * Reads `whatsapp-group.txt` (the real group-chat export — gitignored) and
 * emits `src/lib/bot/whatsappLore.generated.ts` exporting a single
 * `WHATSAPP_LORE` string. Only authored `[date, time] author: message` lines
 * are kept (timestamps stripped); empty / system / status lines are dropped so
 * the ~416 KB export compresses to its real conversational content.
 *
 * The generated file is COMMITTED so the bot runs on Vercel serverless with no
 * runtime filesystem access. Regenerate whenever the export changes:
 *   node scripts/embed-lore.mjs
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const SRC = join(root, 'whatsapp-group.txt')
const OUT = join(root, 'src', 'lib', 'bot', 'whatsappLore.generated.ts')

// `[30.9.2024, 19:19:57] אברהם אחי: נכנסים בקו 11 שמעתי`
// WhatsApp exports prefix lines with RTL control marks (U+200F etc.) — strip them.
const LINE_RE = /^\[\d{1,2}\.\d{1,2}\.\d{4}, \d{1,2}:\d{2}(?::\d{2})?(?:\s?[AP]M)?\] (.+)$/
const RTL_MARKS = /^[‎‏‪-‮]+/
const DROP_CONTENT = /סטיקר הושמט|מדיה הושמט|הושמט|התקשר|זומבי הושמט|צפייה לא מוצגת/i

const raw = readFileSync(SRC, 'utf8')
const lines = raw.split(/\r?\n/)

const kept = []
for (const line of lines) {
  if (!line.trim()) continue
  const m = LINE_RE.exec(line.replace(RTL_MARKS, '').trim())
  if (!m) continue // WhatsApp system/status line (media, calls, join/leave) — drop
  const content = m[1].trim()
  if (!content) continue
  if (DROP_CONTENT.test(content)) continue // sticker/media/call notifications
  if (content.includes(':') && content.split(':')[0].includes('🍺')) continue // group-name system messages
  kept.push(content.replace(RTL_MARKS, '').trim())
}

const lore = kept.join('\n')
const literal = JSON.stringify(lore) // valid JS string literal, escapes everything

const out = `/* AUTO-GENERATED from whatsapp-group.txt by scripts/embed-lore.mjs — do not edit. */
export const WHATSAPP_LORE = ${literal};
`

mkdirSync(dirname(OUT), { recursive: true })
writeFileSync(OUT, out, 'utf8')
console.log(`wrote ${OUT} (${kept.length} messages, ${(lore.length / 1024).toFixed(0)} KB)`)
