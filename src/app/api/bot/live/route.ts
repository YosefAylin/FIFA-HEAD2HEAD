import { NextResponse } from 'next/server'
import { getLiveBanter } from '@/lib/bot/liveBanter'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

/**
 * Live, data-grounded banter for a page load: the BotTalk card one-liner plus a
 * fresh jab per active player, generated from the REAL current data (table/stats/
 * streaks/this week/head-to-head + recent chat) by the paid model. Falls back to
 * the existing digest-derived line if generation fails or no key is present.
 *
 * The internal cache (digest-signature keyed, short TTL) means repeated loads
 * reuse the last good generation until the underlying data actually changes.
 */
export async function GET(): Promise<Response> {
  const banter = await getLiveBanter()
  return NextResponse.json({ ok: true, ...banter })
}