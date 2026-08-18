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
