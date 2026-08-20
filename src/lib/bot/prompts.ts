import { BANTER_PHRASES } from '@/lib/supabase/stats'
import { fetchSetting } from '@/lib/supabase/settings'
import { BOT_NAME } from '@/lib/bot/constants'
import { WHATSAPP_LORE } from '@/lib/bot/whatsappLore.generated'
import type { BanterLine } from '@/lib/data/roster'

/** `settings` key holding the user-editable `fun_sentences` list. */
const SENTENCES_KEY = 'fun_sentences'

/** `settings` key holding the user-editable bot system prompt (text). */
const SYSTEM_PROMPT_KEY = 'bot_system_prompt'

/** `settings` key holding the bot's rolling long-term memory note (text). */
const MEMORY_KEY = 'bot_memory'

/** `settings` key toggling the WhatsApp-history lore block (default: on). */
const LORE_ENABLE_KEY = 'bot_enable_lore'

/** `settings` key holding the bounded (compacted) WhatsApp-history excerpt. */
const LORE_EXCERPT_KEY = 'bot_lore_excerpt'

/** `settings` key holding the prior-turn history window (number). */
const HISTORY_WINDOW_KEY = 'bot_history_window'

/**
 * Pool of banter lines available to the bot: the built-in phrases PLUS the
 * sentences stored in the app's `settings` table (the ones editable in the
 * "הוספת משפט" editor), so the bot stays in sync with what the group adds.
 * Falls back to built-ins only if the settings table is missing/unreachable.
 */
export async function buildBanterPool(): Promise<BanterLine[]> {
  const pool = [...BANTER_PHRASES]
  try {
    const sn = await fetchSetting(SENTENCES_KEY)
    if (Array.isArray(sn)) {
      for (const s of sn) {
        if (typeof s === 'string' && s.trim()) pool.push({ text: s.trim(), author: '' })
        else if (s && typeof s === 'object' && typeof (s as { text?: unknown }).text === 'string') {
          const o = s as { text: string; author?: unknown }
          pool.push({ text: o.text.trim(), author: typeof o.author === 'string' ? o.author : '' })
        }
      }
    }
  } catch {
    // settings table missing → authored lines only
  }
  return pool
}

/** Optional bot runtime knobs assembled from settings + env (defaults all off). */
export interface BotConfigOptions {
  /** Editable persona/instruction block (settings `bot_system_prompt` or `BOT_SYSTEM_PROMPT`). */
  systemPrompt?: string
  /** Full WhatsApp history of the group, embedded at build time. */
  lore?: string
  /** Bounded WhatsApp-history excerpt (settings `bot_lore_excerpt`) — preferred over `lore`. */
  loreExcerpt?: string
  /** Rolling long-term memory note (settings `bot_memory`). */
  memory?: string
  /** Prior chat turns the bot sees per reply (empty → route default). */
  historyWindow?: number
}

/**
 * Load the bot runtime config: custom system prompt (settings override wins
 * over the built-in default; `BOT_SYSTEM_PROMPT` env wins over both), rolling
 * memory note, and the embedded WhatsApp lore (toggled by `bot_enable_lore`).
 * Never throws — any missing/malformed setting quietly falls back to defaults.
 */
export async function loadBotConfig(): Promise<BotConfigOptions> {
  const cfg: BotConfigOptions = {}
  try {
    const sp = await fetchSetting(SYSTEM_PROMPT_KEY)
    if (sp && typeof sp === 'object' && typeof sp.text === 'string' && sp.text.trim()) {
      cfg.systemPrompt = sp.text
    }
    const mem = await fetchSetting(MEMORY_KEY)
    if (mem && typeof mem === 'object' && typeof mem.text === 'string' && mem.text.trim()) {
      cfg.memory = mem.text
    }
    const enable = await fetchSetting(LORE_ENABLE_KEY)
    const loreOn = !(enable && typeof enable === 'object' && enable.on === false)
    // A bounded excerpt (user-imported / compacted) wins over the giant
    // compile-time block — it slashes per-call token cost on the free tier.
    const excerpt = await fetchSetting(LORE_EXCERPT_KEY)
    const excerptText =
      excerpt && typeof excerpt === 'object' && typeof excerpt.text === 'string' && excerpt.text.trim()
        ? excerpt.text.trim()
        : ''
    if (loreOn) {
      if (excerptText) cfg.loreExcerpt = excerptText
      else cfg.lore = WHATSAPP_LORE
    }
    const hw = await fetchSetting(HISTORY_WINDOW_KEY)
    const hwNum = hw && typeof hw === 'object' ? Number(hw.value) : NaN
    if (Number.isFinite(hwNum) && hwNum > 0) cfg.historyWindow = Math.max(0, Math.min(40, Math.floor(hwNum)))
  } catch {
    // settings table missing → defaults only
  }
  if (!cfg.loreExcerpt && !cfg.lore) cfg.lore = WHATSAPP_LORE
  if (process.env.BOT_SYSTEM_PROMPT) cfg.systemPrompt = process.env.BOT_SYSTEM_PROMPT
  if (process.env.BOT_HISTORY_WINDOW) {
    const h = Number(process.env.BOT_HISTORY_WINDOW)
    if (Number.isFinite(h)) cfg.historyWindow = Math.max(0, Math.min(40, Math.floor(h)))
  }
  return cfg
}

/**
 * System prompt for the bot. The header is the configurable persona block —
 * the DB/system-prompt override when set, otherwise the built-in "קובה של
 * שבת" identity. The real stats digest, the rolling memory note, the full
 * WhatsApp history (lore) and a couple of banter lines are always appended
 * underneath so custom prompts never lose grounding.
 *
 * `banterPool` and `opts` are optional so the prompt stays pure/sync for tests;
 * the cron route passes the DB-backed pool and the config from `loadBotConfig()`.
 */
export function buildSystemPrompt(
  digest: string,
  banterPool: BanterLine[] = BANTER_PHRASES,
  opts: BotConfigOptions = {}
): string {
  const banter = [...banterPool]
    .sort(() => Math.random() - 0.5)
    .slice(0, 3)
    .map((b) => b.text)
    .join(' | ')

  const header = opts.systemPrompt?.trim()
    ? opts.systemPrompt.trim()
    : [
        `אתה ${BOT_NAME} — חבר מס' 9 בקבוצת ה-FIFA וקובה של שבת. קבוצת חברים שמשחקת כל שבת, רושמת תוצאות, ומתבלטת בטראש-טוק בוואטסאפ.`,
        'אתה עונה בעברית, קצר ובועט — בלי פרטים מיותרים, בלי נאומים. עד 500 תווים. תמיד סיים את המשפט — אסור לקטוע באמצע הודעה.',
      ].join('\n')

  const parts = [
    header,
    'כל הנתונים האמיתיים על הטורניר נמצאים ב"דיגסט" למטה. ענה רק על סמך הדיגסט, ההיסטוריה וההודעות הקודמות — אל תמציא מספרים, מקומות או תוצאות. אם אין לך נתון — אמור זאת בגלוי.',
    '',
    'דיגסט נוכחי (יחיד, מעודכן):',
    digest,
  ]

  if (opts.memory?.trim()) {
    parts.push('', 'מה שאתה זוכר על הקבוצה (זיכרון מצטבר):', opts.memory.trim())
  }

  if (opts.loreExcerpt?.trim()) {
    parts.push(
      '',
      'תמצית היסטוריית הקבוצה (סגנון + בדיחות פנים, אל תצטט מילה במילה):',
      opts.loreExcerpt.trim()
    )
  } else if (opts.lore?.trim()) {
    parts.push(
      '',
      'היסטוריית הוואטסאפ של הקבוצה (שיחה אמיתית, תפנה אליה בשביל הסגנון והבדיחות הפנימיות — אל תצטט מילה במילה):',
      opts.lore.trim()
    )
  }

  parts.push('', 'טון הקבוצה (לערבב מדי פעם):', banter)
  return parts.join('\n')
}

/**
 * Clean an LLM reply before inserting into `chat_messages`: strip markdown
 * and URLs, collapse whitespace, and hard-enforce the 500-char `body` CHECK
 * using grapheme-safe slicing so Hebrew/emoji never get broken mid-cluster.
 */
const MAX_BODY = 500

export function sanitizeReply(raw: string): string {
  let text = raw
    .replace(/```[\s\S]*?```/g, ' ') // code fences
    .replace(/[*_`>#]+/g, '') // markdown emphasis
    .replace(/https?:\/\/\S+/g, '') // URLs
    .replace(/\s+/g, ' ')
    .trim()
  if (text.length > MAX_BODY) {
    text = [...text].slice(0, MAX_BODY).join('').trimEnd()
  }
  return text || 'סבבה, הבנתי 🤷'
}