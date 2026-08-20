import { fetchSetting, upsertSetting } from '@/lib/supabase/settings'
import { SETTINGS_KEY_BOT_STATE } from '@/lib/bot/constants'

export interface BotState {
  /** ISO timestamp of the last human message we already replied to. */
  last_msg_created_at: string | null
  /** ISO timestamp when the current tick started (simple overlap lock). */
  locked_at: string | null
  /** ISO timestamp until which the bot stays quiet (free-tier cooldown). */
  cooldown_until: string | null
  /** Signature of the last digest the bot saw, to detect "news". */
  last_digest_sig: string | null
  /** How many proactive replies already sent in the current UTC day. */
  proactive_count: number
  /** UTC day key (e.g. YYYY-MM-DD) the proactive budget applies to. */
  proactive_day: string | null
}

const DEFAULTS: BotState = {
  last_msg_created_at: null,
  locked_at: null,
  cooldown_until: null,
  last_digest_sig: null,
  proactive_count: 0,
  proactive_day: null,
}

export async function readBotState(): Promise<BotState> {
  const value = await fetchSetting(SETTINGS_KEY_BOT_STATE)
  return {
    last_msg_created_at: typeof value?.last_msg_created_at === 'string' ? value.last_msg_created_at : null,
    locked_at: typeof value?.locked_at === 'string' ? value.locked_at : null,
    cooldown_until: typeof value?.cooldown_until === 'string' ? value.cooldown_until : null,
    last_digest_sig: typeof value?.last_digest_sig === 'string' ? value.last_digest_sig : null,
    proactive_count: typeof value?.proactive_count === 'number' ? value.proactive_count : 0,
    proactive_day: typeof value?.proactive_day === 'string' ? value.proactive_day : null,
  }
}

export async function writeBotState(state: BotState): Promise<void> {
  const value: Record<string, unknown> = {
    last_msg_created_at: state.last_msg_created_at,
    locked_at: state.locked_at,
    cooldown_until: state.cooldown_until,
    last_digest_sig: state.last_digest_sig,
    proactive_count: state.proactive_count,
    proactive_day: state.proactive_day,
  }
  await upsertSetting(SETTINGS_KEY_BOT_STATE, value)
}

/**
 * Try to take the per-tick lock so two overlapping cron invocations don't
 * both reply to the same message. TTL is best-effort (Vercel crons can
 * overlap); the monotonic cursor is the real idempotency guarantee.
 */
export async function acquireBotLock(ttlMs = 120000): Promise<boolean> {
  const state = await readBotState()
  if (state.locked_at) {
    const age = Date.now() - new Date(state.locked_at).getTime()
    if (age < ttlMs) return false
  }
  await writeBotState({ ...state, locked_at: new Date().toISOString() })
  return true
}

export async function releaseBotLock(): Promise<void> {
  const state = await readBotState()
  await writeBotState({ ...state, locked_at: null })
}

/** Dev tool: clear the cursor so the next tick cold-starts (replies to nothing). */
export async function resetBotCursor(): Promise<void> {
  await writeBotState(DEFAULTS)
}
