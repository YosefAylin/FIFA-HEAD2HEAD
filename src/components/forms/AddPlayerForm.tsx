'use client'

import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/input'
import { Avatar } from '@/components/ui/Avatar'
import { addPlayer, updatePlayerProfilePicture, uploadAvatar } from '@/lib/supabase/players'
import { rosterAvatarDataUri } from '@/lib/utils/avatarHelpers'

interface Props {
  onAdded: (name: string) => void
}

export function AddPlayerForm({ onAdded }: Props) {
  const [name, setName] = useState('')
  const [isGuest, setIsGuest] = useState(false)
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0] ?? null
    setFile(f)
    setPreview((prev) => {
      if (prev) URL.revokeObjectURL(prev)
      return f ? URL.createObjectURL(f) : null
    })
  }

  // Release the object URL when the form unmounts (it's a memory leak otherwise).
  useEffect(() => {
    return () => {
      if (preview) URL.revokeObjectURL(preview)
    }
  }, [preview])

  async function handleSubmit() {
    setError('')
    if (!name.trim()) {
      setError('יש להזין שם שחקן')
      return
    }
    setSaving(true)
    try {
      const player = await addPlayer(name, isGuest)
      if (file) {
        const url = await uploadAvatar(file, player.id)
        // Direct write (same anon path as every other mutation) — no server round-trip.
        await updatePlayerProfilePicture(player.id, url).catch(() => {
          /* profile picture is best-effort; player already exists */
        })
      }
      onAdded(player.name)
      setName('')
      setIsGuest(false)
      setFile(null)
      setPreview((prev) => {
        if (prev) URL.revokeObjectURL(prev)
        return null
      })
    } catch (e) {
      setError(e instanceof Error ? e.message : 'שגיאה בהוספת שחקן')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-4">
        <Avatar name={name || '?'} src={preview} size="lg" />
        <label className="flex-1">
          <span className="mb-1 block text-xs font-medium text-muted-foreground">שם שחקן</span>
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="לדוגמה: יוסף"
            autoFocus
          />
        </label>
      </div>

      <label className="flex flex-col gap-1">
        <span className="text-xs font-medium text-muted-foreground">תמונה (אופציונלי)</span>
        <Input type="file" accept="image/*" onChange={handleFile} className="py-2" />
        {!preview && name && (
          <span className="text-xs text-muted-foreground">
            בינתיים מוצג האווטאר:{' '}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={rosterAvatarDataUri(name)} alt="" className="inline h-4 w-4 rounded-full" />
          </span>
        )}
      </label>

      <label className="flex items-center gap-2 rounded-xl border border-border bg-surface px-3 py-2 text-sm">
        <input
          type="checkbox"
          checked={isGuest}
          onChange={(e) => setIsGuest(e.target.checked)}
          className="h-4 w-4"
        />
        <span>
          שחקן אורח <span className="text-muted-foreground">— נספר לטבלת היום בלבד, לא לכל הזמנים</span>
        </span>
      </label>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <Button onClick={handleSubmit} disabled={saving} size="lg" className="w-full">
        {saving ? 'מוסיף…' : 'הוסף שחקן'}
      </Button>
    </div>
  )
}
