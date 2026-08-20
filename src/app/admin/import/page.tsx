'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/Button'

/**
 * Admin-only lore ingest — upload or paste a fresh WhatsApp group export and
 * compact it into `bot_lore_excerpt` (the bounded block the bot reads). No
 * secret needed: the app is a closed friends group, and the import route takes
 * any POST body and compacts it.
 */
export default function AdminImportPage() {
  const [fileName, setFileName] = useState('')
  const [raw, setRaw] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [result, setResult] = useState<{ chars: number; messages: number } | null>(null)

  async function onPickFile(file: File | undefined) {
    if (!file) return
    setFileName(file.name)
    setRaw(await file.text())
    setError('')
    setResult(null)
  }

  async function submit() {
    setBusy(true)
    setError('')
    setResult(null)
    try {
      const res = await fetch('/api/admin/import-lore', {
        method: 'POST',
        headers: { 'content-type': 'text/plain' },
        body: raw,
      })
      const data = (await res.json().catch(() => ({}))) as { ok?: boolean; chars?: number; messages?: number; error?: string }
      if (!res.ok || !data.ok) {
        setError(data.error ?? `HTTP ${res.status}`)
        return
      }
      setResult({ chars: data.chars ?? 0, messages: data.messages ?? 0 })
    } catch {
      setError('הבקשה נכשלה — בדקו שהשרת פעיל.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="mx-auto max-w-2xl flex flex-col gap-4 p-6">
      <h1 className="text-xl font-bold">הזנת לור חדש 📥</h1>
      <p className="text-sm text-muted-foreground">
        העלו או הדבקו את הייצוא המלא מקבוצת הוואטסאפ (פורמט {'[date, time] author: message'}). זה יעדכן את הלור
        שהבוט קורא, בלי צורך בשדרוג כל פעם.
      </p>

      <label className="flex flex-col gap-1 text-sm">
        <span className="text-muted-foreground">ובחירת קובץ (ייצוא WhatsApp .txt)</span>
        <input
          type="file"
          accept=".txt,text/plain"
          onChange={(e) => void onPickFile(e.target.files?.[0])}
          className="block w-full text-sm rounded-lg border border-input bg-background file:py-2 file:px-3"
        />
        {fileName && <span className="text-xs text-muted-foreground">✔ {fileName} נטען</span>}
      </label>

      <label className="flex flex-col gap-1 text-sm">
        <span className="text-muted-foreground">או הדבק את הטקסט כאן</span>
        <textarea
          value={raw}
          onChange={(e) => {
            setRaw(e.target.value)
            setFileName('')
          }}
          rows={10}
          placeholder="[30.9.2024, 19:19:57] ספי: נכנסים בקו 11…"
          className="rounded-lg border border-input bg-background px-3 py-2 text-base font-mono"
        />
      </label>

      {error && <p className="text-sm text-destructive">{error}</p>}
      {result && (
        <p className="text-sm text-success">
          ✓ עודכנו {result.messages} הודעות · {result.chars} תווים נכנסו ללור.
        </p>
      )}

      <div className="flex justify-end">
        <Button onClick={() => void submit()} disabled={busy || !raw.trim()}>
          {busy ? 'מעבד…' : 'ייבא לור'}
        </Button>
      </div>
    </div>
  )
}