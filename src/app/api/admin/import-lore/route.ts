import { NextResponse } from 'next/server'
import { compactLore } from '@/lib/bot/lore'
import { upsertSetting } from '@/lib/supabase/settings'

/** `settings` key holding the bounded WhatsApp-history excerpt. */
const LORE_EXCERPT_KEY = 'bot_lore_excerpt'

export const dynamic = 'force-dynamic'

/**
 * Admin-only ingest: upload a fresh WhatsApp group export (.txt) and have it
 * compacted into the `bot_lore_excerpt` setting, so the group's lore updates
 * WITHOUT a code redeploy. Guarded by `BOT_ADMIN_SECRET` (returned via a
 * `?secret=` query param or `x-admin-secret` header); 401 when absent/mismatched.
 *
 *   curl -X POST -H "x-admin-secret: $BOT_ADMIN_SECRET" \
 *     --data-binary @whatsapp-group.txt \
 *     https://<host>/api/admin/import-lore
 */
export async function POST(request: Request): Promise<NextResponse> {
  const secret = process.env.BOT_ADMIN_SECRET
  const given =
    new URL(request.url).searchParams.get('secret') ?? request.headers.get('x-admin-secret')
  if (!secret || given !== secret) {
    return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 })
  }

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