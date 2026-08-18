import { BANTER_PHRASES } from '@/lib/supabase/stats'
import { BOT_NAME } from '@/lib/bot/constants'

/**
 * System prompt for the bot: Hebrew "קובה של שבת" group persona, told to
 * be short and to answer only from the provided (real) stats digest — never
 * hallucinate. A couple of banter lines are mixed in to match the group tone.
 */
export function buildSystemPrompt(digest: string): string {
  const banter = [...BANTER_PHRASES].sort(() => Math.random() - 0.5).slice(0, 3).join(' | ')
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
