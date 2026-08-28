'use client'

import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from 'react'

/** A transient, app-wide notification fired via `useToast().toast(...)`. */
interface ToastItem {
  id: number
  title: string
  message?: string
  kind: 'accent' | 'success' | 'destructive'
}

interface ToastApi {
  /** Show a toast; returns the id (dismissable later via `.dismiss`). */
  toast: (t: { title: string; message?: string; kind?: ToastItem['kind'] }) => number
  dismiss: (id: number) => void
}

const Ctx = createContext<ToastApi | null>(null)

const AUTO_DISMISS_MS = 5000

/**
 * Minimal app-wide toast registry (no external lib). Render once in the root
 * layout; any component (BotTalk card, admin page) calls `useToast().toast` to
 * surface a short notification. Fixed top-center so it clears the bottom TabBar.
 * Uses the app's `accent`/`surface` tokens so it matches the warm club theme in
 * both light and dark.
 */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([])
  const nextId = useRef(1)

  const dismiss = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  const toast = useCallback<ToastApi['toast']>(({ title, message, kind = 'accent' }) => {
    const id = nextId.current++
    setToasts((prev) => [...prev.slice(-2), { id, title, message, kind }])
    window.setTimeout(() => dismiss(id), AUTO_DISMISS_MS)
    return id
  }, [dismiss])

  const kindClasses: Record<NonNullable<ToastItem['kind']>, string> = {
    accent: 'border-accent/40 bg-accent/10 text-foreground',
    success: 'border-success/40 bg-success/10 text-foreground',
    destructive: 'border-destructive/40 bg-destructive/10 text-destructive',
  }

  return (
    <Ctx.Provider value={{ toast, dismiss }}>
      {children}
      <div className="pointer-events-none fixed inset-x-0 top-3 z-[100] flex flex-col items-center gap-2 px-4" role="status" aria-live="polite">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`pointer-events-auto flex max-w-md items-start gap-2 rounded-xl border px-4 py-3 shadow-lg backdrop-blur ${kindClasses[t.kind]}`}
          >
            <div className="min-w-0">
              <p className="text-sm font-bold leading-snug">{t.title}</p>
              {t.message && <p className="mt-0.5 text-xs text-muted-foreground">{t.message}</p>}
            </div>
          </div>
        ))}
      </div>
    </Ctx.Provider>
  )
}

export function useToast(): ToastApi {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error('useToast must be used inside <ToastProvider>')
  return ctx
}
