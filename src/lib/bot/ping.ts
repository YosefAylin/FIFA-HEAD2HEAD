import { readBotState } from '@/lib/supabase/botState'

/**
 * Best-effort wake-up of the bot, fired right after a human sends a chat
 * message so the bot replies instantly instead of waiting for the nightly
 * sweep. Skips the fetch when a free-tier cooldown is active (the route sets
 * one after exhausting a provider), so a rapid-fire burst doesn't pile pings
 * into the exact 429 wall. The cron route is lock-guarded + cursor-idempotent,
 * so concurrent pings and the daily sweep are safe. Never throws to the caller.
 */
export async function pingBotNow(): Promise<void> {
  try {
    const state = await readBotState()
    if (state.cooldown_until && new Date(state.cooldown_until).getTime() > Date.now()) return
  } catch {
    // Bot-state row missing → still ping; the route handles it safely.
  }
  void fetch('/api/bot', { method: 'GET', cache: 'no-store' }).catch(() => {})
}