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

  const inputClass =
    'w-full rounded-xl border border-lines bg-raised/50 px-3 text-[15px] text-ink placeholder:text-ink-faint focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/30'

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-4">
      <header className="flex flex-col gap-1">
        <h1 className="text-2xl font-black tracking-tight text-ink">הזנת לוג חדש</h1>
        <p className="text-sm text-ink-mid">
          העלו או הדביקו את הייצוא המלא מקבוצת הוואטסאפ (פורמט {'[date, time] author: message'}). זה יעדכן את
          הלוג שהבוט קורא, בלי צורך בשדרוג כל פעם.
        </p>
      </header>

      <label className="flex flex-col gap-1.5 text-sm">
        <span className="text-ink-mid">בחירת קובץ (ייצוא WhatsApp .txt)</span>
        <input
          type="file"
          accept=".txt,text/plain"
          onChange={(e) => void onPickFile(e.target.files?.[0])}
          className={`${inputClass} py-2 text-ink-mid file:mr-3 file:rounded-full file:border-0 file:bg-gold/15 file:px-3 file:py-1 file:text-xs file:font-semibold file:text-gold`}
        />
        {fileName && <span className="text-xs text-win">✔ {fileName} נטען</span>}
      </label>

      <label className="flex flex-col gap-1.5 text-sm">
        <span className="text-ink-mid">או הדבק את הטקסט כאן</span>
        <textarea
          value={raw}
          onChange={(e) => {
            setRaw(e.target.value)
            setFileName('')
          }}
          rows={10}
          placeholder="[30.9.2024, 19:19:57] ספי: נכנסים בקו 11…"
          className={`${inputClass} h-auto py-2 font-mono text-sm leading-relaxed`}
        />
      </label>

      {error && <p className="text-sm text-loss">{error}</p>}
      {result && (
        <p className="text-sm text-win">
          ✓ עודכנו {result.messages} הודעות · {result.chars} תווים נכנסו ללוג.
        </p>
      )}

      <div className="flex justify-end">
        <Button onClick={() => void submit()} disabled={busy || !raw.trim()}>
          {busy ? 'מעבד…' : 'ייבא לוג'}
        </Button>
      </div>
    </div>
  )
}