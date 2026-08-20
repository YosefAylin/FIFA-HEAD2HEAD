import { NextResponse } from 'next/server'
import { compactLore } from '@/lib/bot/lore'
import { upsertSetting } from '@/lib/supabase/settings'

/** `settings` key holding the bounded WhatsApp-history excerpt. */
const LORE_EXCERPT_KEY = 'bot_lore_excerpt'

export const dynamic = 'force-dynamic'

/**
 * Admin ingest: upload a fresh WhatsApp group export (.txt) and have it
 * compacted into the `bot_lore_excerpt` setting, so the group's lore updates
 * WITHOUT a code redeploy. No secret required — this is a closed friends app
 * and the route just compacts whatever body it receives.
 *
 *   curl -X POST --data-binary @whatsapp-group.txt \
 *     https://<host>/api/admin/import-lore
 */
export async function POST(request: Request): Promise<NextResponse> {
  const raw = (await request.text()).slice(0, 400_000) // hard cap on payload
  const excerpt = compactLore(raw)
  if (!excerpt) {
    return NextResponse.json({ ok: false, error: 'no authored messages parsed' }, { status: 400 })
  }

  await upsertSetting(LORE_EXCERPT_KEY, { text: excerpt, imported_at: new Date().toISOString() })
  return NextResponse.json({ ok: true, chars: excerpt.length, messages: countLines(excerpt) })
}

function countLines(s: string): number {
  return s ? s.split('\n').length : 0
}