import { readBotState } from '@/lib/supabase/botState'

/**
 * Best-effort wake-up of the bot, fired right after a human sends a chat
 * message so the bot replies instantly instead of waiting for the scheduled
 * sweeps. Resolves `true` when the request was accepted (the route said it
 * will process — i.e. a reply is expected), `false` when the bot is currently
 * unavailable (free-tier cooldown active, provider missing, lock held, or the
 * request failed outright). Never throws to the caller.
 */
async function wakeBot(params?: { result?: string }): Promise<boolean> {
  try {
    const state = await readBotState()
    if (state.cooldown_until && new Date(state.cooldown_until).getTime() > Date.now()) return false
  } catch {
    // Bot-state row missing → still ping; the route handles it safely.
  }
  const qs = new URLSearchParams(params?.result ? { result: params.result } : undefined).toString()
  try {
    const res = await fetch(`/api/bot${qs ? `?${qs}` : ''}`, { method: 'GET', cache: 'no-store' })
    if (!res.ok) return false
    const data = (await res.json().catch(() => ({}))) as { skipped?: string }
    if (data.skipped) return false
    return true
  } catch {
    return false
  }
}

/** Wake the bot after a chat message (reactive reply). Returns false if the bot is unavailable now. */
export function pingBotNow(): Promise<boolean> {
  return wakeBot()
}

/**
 * Wake the bot after a match result is entered, passing the scoreline as a
 * hint (`?result=`) the route folds into the digest so the bot's first reactive
 * speech is about the match just recorded. Returns false if unavailable now.
 */
export function pingBotNowResult(result: string): Promise<boolean> {
  return wakeBot({ result })
}