'use client'

import { useState } from 'react'
import { Check, Download, Loader2, Sparkles } from 'lucide-react'
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
  const [regenSecret, setRegenSecret] = useState('')
  const [regenBusy, setRegenBusy] = useState(false)
  const [regenError, setRegenError] = useState('')
  const [regenResult, setRegenResult] = useState<{ jabs: number; banter: number } | null>(null)

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

  async function regen() {
    setRegenBusy(true)
    setRegenError('')
    setRegenResult(null)
    const secret = regenSecret.trim()
    if (!secret) {
      setRegenError('יש להזין את סיסמת הרענון כדי להפעיל רענון חכם.')
      setRegenBusy(false)
      return
    }
    try {
      const res = await fetch(`/api/bot?regen=all&secret=${encodeURIComponent(secret)}`, { cache: 'no-store' })
      const data = (await res.json().catch(() => ({}))) as {
        ok?: boolean
        error?: string
        jabs?: { written?: number }
        banter?: { written?: number }
      }
      if (!res.ok || !data.ok) {
        setRegenError(data.error ?? `HTTP ${res.status}`)
        return
      }
      setRegenResult({ jabs: data.jabs?.written ?? 0, banter: data.banter?.written ?? 0 })
    } catch {
      setRegenError('הבקשה נכשלה — בדקו שהשרת פעיל.')
    } finally {
      setRegenBusy(false)
    }
  }

  return (
    <div className="mx-auto max-w-2xl flex flex-col gap-4 p-6">
      <h1 className="flex items-center gap-2 text-xl font-bold">
        <Download className="h-5 w-5 text-primary" />
        הזנת לוג חדש
      </h1>
      <p className="text-sm text-muted-foreground">
        העלו או הדבקו את הייצוא המלא מקבוצת הוואטסאפ (פורמט {'[date, time] author: message'}). זה יעדכן את הלוג
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
        {fileName && <span className="text-xs text-muted-foreground"><Check className="ml-1 inline h-3 w-3" />{fileName} נטען</span>}
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
          <Check className="ml-1 inline h-4 w-4" />עודכנו {result.messages} הודעות · {result.chars} תווים נכנסו ללוג.
        </p>
      )}

      <div className="flex justify-end">
        <Button onClick={() => void submit()} disabled={busy || !raw.trim()}>
          {busy ? <><Loader2 className="h-4 w-4 animate-spin" />מעבד…</> : 'ייבא לוג'}
        </Button>
      </div>

      <section className="flex flex-col gap-3 rounded-2xl border border-border bg-surface p-4">
        <h2 className="flex items-center gap-2 text-base font-bold">
          <Sparkles className="h-5 w-5 text-primary" />
          רענון חכם ידני
        </h2>
        <p className="text-xs text-muted-foreground">
          מחולל מחדש את כל העקיצות (ג׳אבים) ואת שורות הבאנטר שהבוט כתב, ושומר על כל מה שנכתב ידנית. דורש את סיסמת הרענון.
        </p>
        <div className="flex flex-col gap-2 sm:flex-row">
          <input
            type="password"
            value={regenSecret}
            onChange={(e) => setRegenSecret(e.target.value)}
            placeholder="BOT_REGEN_SECRET"
            autoComplete="off"
            className="h-12 flex-1 rounded-xl border border-input bg-background px-3 text-base focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
          <Button onClick={() => void regen()} disabled={regenBusy} variant="outline">
            {regenBusy ? <><Loader2 className="h-4 w-4 animate-spin" />מרענן…</> : <><Sparkles className="h-4 w-4" />רענן הכל</>}
          </Button>
        </div>
        {regenError && <p className="text-sm text-destructive">{regenError}</p>}
        {regenResult && (
          <p className="flex items-center gap-1 text-sm text-success">
            <Check className="h-4 w-4" />
            עודכנו {regenResult.jabs} עקיצות ו-{regenResult.banter} שורות באנטר.
          </p>
        )}
      </section>
    </div>
  )
}