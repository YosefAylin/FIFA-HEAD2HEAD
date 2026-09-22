'use client'

import { useEffect, useState, type ReactNode } from 'react'
import { Button } from '@/components/ui/Button'
import { isAcceptedAnswer, isAdminPasscode } from '@/lib/utils/entryGate'

const STORAGE_KEY = 'kuba-entry-ok'

/**
 * First-visit gate: the whole app is wrapped, and until the visitor answers the
 * Kuba question correctly a full-screen overlay blocks the page. The answer is
 * remembered per device in localStorage.
 */
export function EntryGate({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false)
  const [allowed, setAllowed] = useState(false)
  const [value, setValue] = useState('')
  const [error, setError] = useState(false)

  useEffect(() => {
    try {
      setAllowed(localStorage.getItem(STORAGE_KEY) === '1')
    } catch {
      setAllowed(true) // storage blocked → don't lock people out
    }
    setReady(true)
  }, [])

  function submit() {
    if (!isAdminPasscode(value) && !isAcceptedAnswer(value)) {
      setError(true)
      return
    }
    try {
      localStorage.setItem(STORAGE_KEY, '1')
    } catch {
      /* ignore */
    }
    setAllowed(true)
  }

  return (
    <>
      {children}
      {ready && !allowed && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-background/95 p-4 backdrop-blur">
          <div className="w-full max-w-sm rounded-3xl border border-primary/40 bg-surface p-6 shadow-xl">
            <div className="mb-5 text-center">
              <span className="text-4xl">🥃</span>
              <h1 className="mt-2 text-xl font-extrabold">שער הכניסה לקובה</h1>
              <p className="mt-1 text-sm text-muted-foreground">מה חובה להביא לקובה?</p>
            </div>
            <input
              autoFocus
              value={value}
              onChange={(e) => {
                setValue(e.target.value)
                setError(false)
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') submit()
              }}
              placeholder="התשובה שלך…"
              maxLength={60}
              className="h-12 w-full rounded-xl border border-input bg-background px-3 text-center text-base transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
            {error && <p className="mt-2 text-center text-sm text-destructive">לא בדיוק… נסו שוב 😅</p>}
            <Button className="mt-4 w-full" size="lg" onClick={submit}>
              כניסה
            </Button>
          </div>
        </div>
      )}
    </>
  )
}
