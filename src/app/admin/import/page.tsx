'use client'

import { useState } from 'react'
import { Check, Loader2, MessageSquareText, Sparkles, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { ThemeToggle } from '@/components/ui/ThemeToggle'
import { useRosterSettings } from '@/lib/supabase/useRosterSettings'
import { BOT_NAME } from '@/lib/bot/constants'

/**
 * Admin-only lore ingest — tell the bot what happened recently in plain words
 * ("אתמול אורן החמיץ שלושה פנדלים"), no file upload or WhatsApp export needed.
 * The note is appended to the bot's existing lore base so it learns the latest
 * without a redeploy.
 */
export default function AdminImportPage() {
  const { userSentences, removeSentence } = useRosterSettings()
  const [note, setNote] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [result, setResult] = useState<{ chars: number } | null>(null)
  const [regenSecret, setRegenSecret] = useState('')
  const [regenBusy, setRegenBusy] = useState(false)
  const [regenError, setRegenError] = useState('')
  const [regenResult, setRegenResult] = useState<{ jabs: number; banter: number } | null>(null)

  async function submit() {
    setBusy(true)
    setError('')
    setResult(null)
    try {
      const res = await fetch('/api/admin/import-lore', {
        method: 'POST',
        headers: { 'content-type': 'text/plain' },
        body: note,
      })
      const data = (await res.json().catch(() => ({}))) as { ok?: boolean; chars?: number; error?: string }
      if (!res.ok || !data.ok) {
        setError(data.error ?? `HTTP ${res.status}`)
        return
      }
      setResult({ chars: data.chars ?? 0 })
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
      // The "רענון חכם" toast fires app-wide via the realtime `bot_regen_event`
      // marker the route persisted (this admin's tab is subscribed too), so any
      // per-page code would just duplicate it.
    } catch {
      setRegenError('הבקשה נכשלה — בדקו שהשרת פעיל.')
    } finally {
      setRegenBusy(false)
    }
  }

  return (
    <div className="mx-auto max-w-2xl flex flex-col gap-4 p-6">
<div className="flex items-center justify-between gap-3">
        <h1 className="flex items-center gap-2 text-xl font-bold">
          <MessageSquareText className="h-5 w-5 text-primary" />
          עדכון מהיר לבוט
        </h1>
        <ThemeToggle className="h-9 w-9 md:h-8 md:w-8" />
      </div>
      <p className="text-sm text-muted-foreground">
        ספרו לבוט בעברית מה קרה לאחרונה (ניצחון מטורף, החמצה מצחיקה, צעקה בשבת…). הוא יוסיף את זה
        ללוג שהוא קורא ויעדכן איך הוא מגיב — בלי להעלות קובץ ובלי ייצוא וואטסאפ.
      </p>

      <label className="flex flex-col gap-1 text-sm">
        <span className="text-muted-foreground">מה קרה לאחרונה?</span>
        <textarea
          value={note}
          onChange={(e) => {
            setNote(e.target.value)
            setResult(null)
          }}
          rows={4}
          placeholder="למשל: אורן החמיץ שלושה פנדלים בשבת וכעסנו עליו כל הערב…"
          className="rounded-lg border border-input bg-background px-3 py-2 text-base"
        />
      </label>

      {error && <p className="text-sm text-destructive">{error}</p>}
      {result && (
        <p className="text-sm text-success">
          <Check className="ml-1 inline h-4 w-4" />עודכן — הבוט קורא עכשיו {result.chars} תווים של לוג.
        </p>
      )}

      <div className="flex justify-end">
        <Button onClick={() => void submit()} disabled={busy || !note.trim()}>
          {busy ? <><Loader2 className="h-4 w-4 animate-spin" />מעבד…</> : 'עדכן את הבוט'}
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

      <section className="flex flex-col gap-3 rounded-2xl border border-border bg-surface p-4">
        <h2 className="flex items-center gap-2 text-base font-bold">
          <MessageSquareText className="h-5 w-5 text-primary" />
          ניהול משפטי הבוט
        </h2>
        <p className="text-xs text-muted-foreground">
          המשפטים שמסתובבים בכרטיס "דבר הבוט" (אלה שהוסיף הבוט ואלה שהוספו ידנית). מחקו את אלו שרוצים להסיר — הכרטיס יתעדכן אוטומטית.
        </p>
        {userSentences.length === 0 ? (
          <p className="text-sm text-muted-foreground">עדיין אין משפטים מאוחסנים.</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {userSentences.map((s) => (
              <li
                key={s.text}
                className="flex items-center gap-2 rounded-lg border border-border bg-background px-3 py-2"
              >
                <p className="min-w-0 flex-1 text-sm">{s.text}</p>
                <span className="shrink-0 rounded-full bg-accent/20 px-2 py-0.5 text-[10px] font-bold text-accent">
                  {s.author === BOT_NAME ? 'הבוט' : s.author || 'לא ידוע'}
                </span>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  aria-label="מחיקת משפט"
                  title="מחיקה"
                  className="shrink-0 min-h-0 rounded-full px-2 py-1 text-destructive"
                  onClick={() => void removeSentence(s.text)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}