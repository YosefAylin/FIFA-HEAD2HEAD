import { NextResponse } from 'next/server'
import { updatePlayerProfilePicture } from '@/lib/supabase/players'

export async function PATCH(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const body = await _req.json()
  const url = body?.profile_picture_url
  if (typeof url !== 'string') {
    return NextResponse.json({ error: 'profile_picture_url required' }, { status: 400 })
  }
  try {
    await updatePlayerProfilePicture(id, url)
    return NextResponse.json({ ok: true })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
