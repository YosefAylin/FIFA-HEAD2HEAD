'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/Button'

/**
 * Admin-only lore ingest — paste a fresh WhatsApp group export and compact it
 * into `bot_lore_excerpt` (the bounded block the bot reads). Guarded by the
 * same `BOT_ADMIN_SECRET` the `/api/admin/import-lore` route expects: the
 * secret is typed once per session here and passed as `x-admin-secret`.
 */
export default function AdminImportPage() {
  // The app has no logged-in admin surface; the secret is sent once client-side
  // rather than baked into the page. Kept in-memory only (never persisted).
  const [secret, setSecret] = useState('')
  const [raw, setRaw] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [result, setResult] = useState<{ chars: number; messages: number } | null>(null)

  async function submit() {
    setBusy(true)
    setError('')
    setResult(null)
    try {
      const res = await fetch('/api/admin/import-lore', {
        method: 'POST',
        headers: { 'x-admin-secret': secret.trim(), 'content-type': 'text/plain' },
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
        הדבק כאן את הייצוא המלא מקבוצת הוואטסאפ (פורמט {'[date, time] author: message'}). זה מתעדכן את הלור שהבוט
        קורא, בלי צורך בשדרוג כל פעם.
      </p>

      <label className="flex flex-col gap-1 text-sm">
        <span className="text-muted-foreground">סוד ניהולי (BOT_ADMIN_SECRET)</span>
        <input
          value={secret}
          onChange={(e) => setSecret(e.target.value)}
          type="password"
          placeholder="…"
          autoComplete="off"
          className="h-12 rounded-lg border border-input bg-background px-3 text-base"
        />
      </label>

      <label className="flex flex-col gap-1 text-sm">
        <span className="text-muted-foreground">ייצוא WhatsApp (טקסט מלא)</span>
        <textarea
          value={raw}
          onChange={(e) => setRaw(e.target.value)}
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
        <Button onClick={() => void submit()} disabled={busy || !secret.trim() || !raw.trim()}>
          {busy ? 'מעבד…' : 'ייבא לור'}
        </Button>
      </div>
    </div>
  )
}