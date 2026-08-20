import { fetchSetting, upsertSetting } from '@/lib/supabase/settings'
import { fetchChatMessages } from '@/lib/supabase/chat'
import { generateReply } from '@/lib/bot/gemini'
import { buildBotDigest } from '@/lib/bot/context'
import { BOT_NAME } from '@/lib/bot/constants'

/** `settings` key holding the bot's rolling long-term memory note. */
const MEMORY_KEY = 'bot_memory'

/** How many recent messages we summarize into the memory note. */
const WINDOW = Number(process.env.BOT_MEMORY_WINDOW ?? 60)

/** Min minutes between rolling-memory refreshes (default 6h). */
const REFRESH_MIN = Number(process.env.BOT_MEMORY_REFRESH_MIN ?? 360)

interface MemoryNote {
  text: string
  /** ISO timestamp of the last refresh. */
  refreshed_at?: string | null
  /** created_at of the newest message folded into the last refresh. */
  last_msg_id?: string | null
}

function readNote(value: unknown): MemoryNote {
  const v = (value ?? {}) as Record<string, unknown>
  return {
    text: typeof v.text === 'string' ? v.text : '',
    refreshed_at: typeof v.refreshed_at === 'string' ? v.refreshed_at : null,
    last_msg_id: typeof v.last_msg_id === 'string' ? v.last_msg_id : null,
  }
}

/**
 * Rolling long-term memory for the bot. Reads the recent chat (persisted in
 * `chat_messages`), asks the model to compress it into a short "what the bot
 * remembers about the group" note (who's who, current streaks, running jokes),
 * and stores it under the `bot_memory` setting so it survives across sessions
 * and is injected into every future system prompt.
 *
 * Runs on ANY tick that sees new human lines, but only re-summarizes once
 * `BOT_MEMORY_REFRESH_MIN` (default 360) has passed since the last refresh, so
 * a chatty week keeps the memory current without spending free-tier tokens on
 * every message. The daily cron passes `force` to bypass the cooldown. Never
 * throws — a quota/network flake keeps the previous memory note intact.
 */
export async function maybeUpdateBotMemory(opts: { force?: boolean } = {}): Promise<void> {
  try {
    const [messages, digest, prev] = await Promise.all([
      fetchChatMessages(),
      buildBotDigest(),
      fetchSetting(MEMORY_KEY),
    ])
    const note = readNote(prev)

    if (!opts.force && note.refreshed_at) {
      const ageMin = (Date.now() - new Date(note.refreshed_at).getTime()) / 60000
      if (ageMin < REFRESH_MIN) return // too soon; keep the previous note
    }

    const recent = messages
      .slice(-WINDOW)
      .map((m) => `${m.author_name}: ${m.body}`)
      .join('\n')

    const system = [
      `אתה ${BOT_NAME}, וזה התרגיל: קראת את השיחה האחרונה של הקבוצה והדיגסט.`,
      'כתוב הערת זיכרון אחת קצרה (עד 3 משפטים, בעברית) עם מה שחשוב לזכור על הקבוצה עכשיו: מי הדוברי המרכזיים, מאבקים/שיאים נוכחיים, ובדיחות פנימיות רצות.',
      'זה מצטבר — שלב את ההערה הקודמת אם היא עדיין רלוונטית. אל תמציא, אל תמנה את כל ההיסטוריה.',
    ].join('\n')

    const raw = await generateReply({
      system,
      author: 'מערכת',
      userText: `הערה קודמת (אם יש):\n${note.text || '(אין)'}\n\nהשיחה האחרונה:\n${recent}\n\nדיגסט:\n${digest}`,
    })

    const text = raw.replace(/\s+/g, ' ').trim().slice(0, 500)
    if (!text) return
    const newest = messages[messages.length - 1]
    await upsertSetting(MEMORY_KEY, {
      text,
      refreshed_at: new Date().toISOString(),
      last_msg_id: newest?.id ?? null,
    })
  } catch {
    // Quota/network flake → keep the previous memory; the next tick retries.
  }
}