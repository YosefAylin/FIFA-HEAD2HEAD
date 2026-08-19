import { fetchSetting, upsertSetting } from '@/lib/supabase/settings'
import { fetchChatMessages } from '@/lib/supabase/chat'
import { generateReply } from '@/lib/bot/gemini'
import { buildBotDigest } from '@/lib/bot/context'
import { BOT_NAME } from '@/lib/bot/constants'

/** `settings` key holding the bot's rolling long-term memory note. */
const MEMORY_KEY = 'bot_memory'

/** How many recent messages we summarize into the memory note. */
const WINDOW = 60

/**
 * Rolling long-term memory for the bot. Reads the recent chat (persisted in
 * `chat_messages`), asks the model to compress it into a short "what the bot
 * remembers about the group" note (who's who, current streaks, running jokes),
 * and stores it under the `bot_memory` setting so it survives across sessions
 * and is injected into every future system prompt.
 *
 * Runs ONCE per daily cron tick (not per message) to protect the free tier.
 * Never throws — a quota/network flake keeps the previous memory note intact.
 */
export async function updateBotMemory(): Promise<void> {
  try {
    const [messages, digest, prev] = await Promise.all([
      fetchChatMessages(),
      buildBotDigest(),
      fetchSetting(MEMORY_KEY),
    ])
    const prevText =
      prev && typeof prev === 'object' && typeof prev.text === 'string' ? prev.text : ''

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
      userText: `הערה קודמת (אם יש):\n${prevText || '(אין)'}\n\nהשיחה האחרונה:\n${recent}\n\nדיגסט:\n${digest}`,
    })

    const note = raw.replace(/\s+/g, ' ').trim().slice(0, 500)
    if (note) await upsertSetting(MEMORY_KEY, { text: note })
  } catch {
    // Quota/network flake → keep the previous memory; the cron retries tomorrow.
  }
}
