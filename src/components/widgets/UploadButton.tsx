'use client'

import { useRef, useState } from 'react'
import { Camera, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { uploadAvatar, updatePlayerProfilePicture } from '@/lib/supabase/players'

interface Props {
  playerId: string
  onUploaded?: () => void
}

/** Small camera button over the player avatar: pick an image, upload to
 *  Supabase Storage, save the URL on the player row. */
export function UploadButton({ playerId, onUploaded }: Props) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  async function handleFile(file: File | undefined) {
    if (!file) return
    setBusy(true)
    setError('')
    try {
      const url = await uploadAvatar(file, playerId)
      await updatePlayerProfilePicture(playerId, url)
      onUploaded?.()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'שגיאה בהעלאת התמונה')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="absolute bottom-0 left-0">
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => void handleFile(e.target.files?.[0])}
      />
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="min-h-0 rounded-full px-2 py-1 text-xs"
        disabled={busy}
        onClick={() => inputRef.current?.click()}
        title={busy ? 'מעלה…' : 'העלאת תמונה'}
      >
        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Camera className="h-4 w-4" />}
      </Button>
      {error && <p className="mt-1 max-w-40 text-xs text-destructive">{error}</p>}
    </div>
  )
}