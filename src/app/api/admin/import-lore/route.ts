import { NextResponse } from 'next/server'
import { appendLoreNote } from '@/lib/bot/lore'
import { fetchSetting, upsertSetting } from '@/lib/supabase/settings'

/** `settings` key holding the bounded WhatsApp-history excerpt + manual notes. */
const LORE_EXCERPT_KEY = 'bot_lore_excerpt'

export const dynamic = 'force-dynamic'

/**
 * Admin ingest: add a short free-text note ("tell me what happened recently —
 * I'll update how I respond") on top of the EXISTING lore excerpt, so the bot's
 * inside jokes/style update WITHOUT a code redeploy and WITHOUT uploading the
 * full WhatsApp export. The note is appended verbatim under its own header; the
 * old group-history lines are kept (oldest trimmed only if space runs low).
 *
 *   curl -X POST --data 'we gave Omer the cup for a month' \
 *     https://<host>/api/admin/import-lore
 */
export async function POST(request: Request): Promise<NextResponse> {
  const note = (await request.text()).trim().slice(0, 400_000) // hard cap on payload
  if (!note) {
    return NextResponse.json({ ok: false, error: 'empty note' }, { status: 400 })
  }

  // Read the current excerpt so we APPEND instead of replacing the built-up lore.
  let current: string | null = null
  try {
    const existing = await fetchSetting(LORE_EXCERPT_KEY)
    if (existing && typeof existing === 'object' && typeof existing.text === 'string') {
      current = existing.text
    }
  } catch {
    // no settings row yet → start fresh
  }

  const excerpt = appendLoreNote(current ?? '', note)
  await upsertSetting(LORE_EXCERPT_KEY, { text: excerpt, imported_at: new Date().toISOString() })
  return NextResponse.json({ ok: true, chars: excerpt.length, messages: 1 })
}
