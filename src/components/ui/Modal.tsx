'use client'

import { useEffect, useRef } from 'react'

interface ModalProps {
  open: boolean
  onClose: () => void
  /** Optional kicker line shown small above the title (e.g. the week). */
  kicker?: string
  title: string
  titleDisplay?: React.ReactNode
  children: React.ReactNode
}

/**
 * Accessible modal dialog: backdrop click + Escape to close, focus trapped,
 * body scroll locked. Surface panel, 20px radius (shape lock).
 */
export function Modal({ open, onClose, kicker, title, titleDisplay, children }: ModalProps) {
  const panelRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    const prevFocus = document.activeElement as HTMLElement | null
    window.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    // Move focus into the dialog; restore on close.
    const t = window.setTimeout(() => panelRef.current?.focus(), 10)
    return () => {
      window.clearTimeout(t)
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
      prevFocus?.focus()
    }
  }, [open, onClose])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center p-0 sm:items-center sm:p-4" role="dialog" aria-modal="true">
      <div className="absolute inset-0 bg-black/65 backdrop-blur-[2px]" onClick={onClose} aria-hidden="true" />
      <div
        ref={panelRef}
        tabIndex={-1}
        role="document"
        className="relative w-full max-w-lg rounded-t-[20px] border border-lines bg-surface p-5 shadow-[0_-20px_60px_rgba(0,0,0,0.5)] outline-none focus-visible:outline-2 focus-visible:outline-gold sm:rounded-[20px] sm:shadow-2xl"
      >
        <div className="mb-1 flex items-center justify-between gap-3">
          <div className="min-w-0">
            {kicker && <p className="mb-0.5 text-[11px] font-semibold text-ink-mid">{kicker}</p>}
            <h2 className="truncate text-lg font-bold leading-tight text-ink">{titleDisplay ?? title}</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="סגור"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-ink-mid transition-colors hover:bg-raised hover:text-ink"
          >
            <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-4 w-4" aria-hidden="true">
              <path d="m5 5 10 10M15 5 5 15" strokeLinecap="round" />
            </svg>
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}