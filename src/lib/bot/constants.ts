/**
 * Bot identity — single source of truth, imported by the server cron route
 * and the client chat UI. Deliberately NOT in the ROSTER: a roster entry
 * would let humans impersonate the bot via the identity picker and defeat
 * the self-reply guard.
 */
export const BOT_NAME = 'קובה בוט'

/** `settings` key holding the bot's progress cursor + tick lock. */
export const SETTINGS_KEY_BOT_STATE = 'bot_state'

/** Max bot replies per cron tick (leftover messages roll to the next tick). */
export const MAX_REPLIES_PER_TICK = 5

/**
 * Canned, user-facing line shown in the chat (client-side only, never persisted)
 * when the bot definitively failed to answer — busy/dropped stream, unreachable
 * provider, or a reply discarded by the output gates. The human message is
 * already saved, so this only tells the sender to retry.
 */
export const BOT_ERROR_MESSAGE = '⚠️ הבוט לא הצליח לענות כרגע — ההודעה נשמרה, נסו שוב בעוד רגע 🙏'

/** Exhausted provider credits (e.g. OpenRouter/DeepSeek 402) — tell the group to top up. */
export const BOT_OUT_OF_CREDITS_MESSAGE = '💳 אזלו הקרדיטים של הבוט אצל ספק ה-AI — הוסיפו יתרה והוא יחזור לענות 🙏'

/** Missing/invalid/forbidden API key. */
export const BOT_API_KEY_MESSAGE = '🔑 מפתח ה-API של הבוט לא תקין או חסר הרשאה — בדקו את משתני הסביבה'

/** Provider rate limit (HTTP 429). */
export const BOT_RATE_LIMIT_MESSAGE = '⏳ הבוט חטף מגבלת קצב מספק ה-AI — נסו שוב בעוד רגע'

/** Configured model missing / no endpoints (HTTP 404). */
export const BOT_MODEL_MESSAGE = '🤖 המודל שהוגדר לבוט לא זמין כרגע — בדקו את משתני הסביבה'

/** Provider/network outage (5xx, fetch failure). */
export const BOT_PROVIDER_DOWN_MESSAGE = '📡 ספק ה-AI לא זמין כרגע — נסו שוב בעוד רגע'
