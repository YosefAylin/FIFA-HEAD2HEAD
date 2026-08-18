/**
 * Best-effort wake-up of the bot, fired right after a human sends a chat
 * message so the bot replies instantly instead of waiting for the nightly
 * sweep. The cron route is lock-guarded + cursor-idempotent, so concurrent
 * pings and the daily sweep are safe. Never throws to the caller.
 */
export function pingBotNow(): void {
  void fetch('/api/bot', { method: 'GET', cache: 'no-store' }).catch(() => {})
}