'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/input'
import { Avatar } from '@/components/ui/Avatar'
import { addPlayer, uploadAvatar } from '@/lib/supabase/players'
import { rosterAvatarDataUri } from '@/lib/utils/avatarHelpers'

interface Props {
  onAdded: (name: string) => void
}

export function AddPlayerForm({ onAdded }: Props) {
  const [name, setName] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0] ?? null
    setFile(f)
    setPreview(f ? URL.createObjectURL(f) : null)
  }

  async function handleSubmit() {
    setError('')
    if (!name.trim()) {
      setError('יש להזין שם שחקן')
      return
    }
    setSaving(true)
    try {
      const player = await addPlayer(name)
      if (file) {
        const url = await uploadAvatar(file, player.id)
        await fetch(`/api/players/${player.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ profile_picture_url: url }),
        }).catch(() => {
          /* profile picture is best-effort; player already exists */
        })
      }
      onAdded(player.name)
      setName('')
      setFile(null)
      setPreview(null)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'שגיאה בהוספת שחקן')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-4">
        <div className="flex flex-col items-center gap-1">
          <Avatar name={name || '?'} src={preview} size="lg" />
          {file && <span className="text-[11px] text-ink-faint">תמונה חדשה</span>}
        </div>
        <label className="flex-1">
          <span className="mb-1.5 block text-xs font-medium text-ink-mid">שם שחקן</span>
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="לדוגמה: יוסף" autoFocus />
        </label>
      </div>

      <label className="flex flex-col gap-1.5">
        <span className="text-xs font-medium text-ink-mid">תמונה (אופציונלי)</span>
        <Input
          type="file"
          accept="image/*"
          onChange={handleFile}
          className="py-2 text-ink-mid file:mr-3 file:rounded-full file:border-0 file:bg-gold/15 file:px-3 file:py-1 file:text-xs file:font-semibold file:text-gold"
        />
        {!preview && name && (
          <span className="text-xs text-ink-mid">
            בינתיים מוצג האבוטר: <img src={rosterAvatarDataUri(name)} alt="" className="inline h-4 w-4 rounded-full" />
          </span>
        )}
      </label>

      {error && <p className="text-sm text-loss">{error}</p>}

      <Button onClick={handleSubmit} disabled={saving} size="lg" className="w-full">
        {saving ? 'מוסיף…' : 'הוסף שחקן'}
      </Button>
    </div>
  )
}