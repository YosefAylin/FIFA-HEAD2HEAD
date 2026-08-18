import { BANTER_PHRASES } from '@/lib/supabase/stats'
import { fetchSetting } from '@/lib/supabase/settings'
import { BOT_NAME } from '@/lib/bot/constants'

/** `settings` key holding the user-editable `fun_sentences` list. */
const SENTENCES_KEY = 'fun_sentences'

/**
 * Pool of banter lines available to the bot: the built-in phrases PLUS the
 * sentences stored in the app's `settings` table (the ones editable in the
 * "הוספת משפט" editor), so the bot stays in sync with what the group adds.
 * Falls back to built-ins only if the settings table is missing/unreachable.
 */
export async function buildBanterPool(): Promise<string[]> {
  const pool = [...BANTER_PHRASES]
  try {
    const sn = await fetchSetting(SENTENCES_KEY)
    if (Array.isArray(sn)) {
      for (const s of sn) {
        if (typeof s === 'string' && s.trim()) pool.push(s.trim())
      }
    }
  } catch {
    // settings table missing → built-in phrases only
  }
  return pool
}

/**
 * System prompt for the bot: Hebrew "קובה של שבת" group persona, told to
 * be short and to answer only from the provided (real) stats digest — never
 * hallucinate. A couple of banter lines are mixed in to match the group tone.
 *
 * `banterPool` is optional so the prompt stays pure/sync for tests; the cron
 * route passes the DB-backed pool built by `buildBanterPool()`.
 */
export function buildSystemPrompt(digest: string, banterPool: string[] = BANTER_PHRASES): string {
  const banter = [...banterPool].sort(() => Math.random() - 0.5).slice(0, 3).join(' | ')
  return [
    `אתה ${BOT_NAME} — חבר מס' 9 בקבוצת ה-fIFA וקובה של שבת. קבוצת חברים שמשחקת כל שבת, רושמת תוצאות, ומתבלטת בטראש-טוק בוואטסאפ.`,
    'אתה עונה בעברית, קצר ובועט — בלי פרטים מיותרים, בלי נאומים. עד 500 תווים.',
    'כל הנתונים האמיתיים על הטורניר נמצאים ב"דיגסט" למטה. ענה רק על סמך הדיגסט וההודעה האחרונה — אל תמציא מספרים, מקומות או תוצאות. אם אין לך נתון — אמור זאת בגלוי.',
    '',
    'דיגסט נוכחי (יחיד, מעודכן):',
    digest,
    '',
    'טון הקבוצה (לערבב מדי פעם):',
    banter,
  ].join('\n')
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
