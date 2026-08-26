'use client'

import Link from 'next/link'
import { useState } from 'react'
import { usePathname } from 'next/navigation'
import { MORE, TABS, type NavItem } from '@/components/nav/nav'
import { isActive } from '@/components/nav/Header'

/**
 * Mobile bottom tab bar — the primary surface during FIFA sessions (one thumb,
 * phone in hand). Five primary tabs; the rest live behind the "עוד" sheet.
 * Hidden on md+ where the desktop top bar takes over.
 */
export function TabBar() {
  const pathname = usePathname()
  const [moreOpen, setMoreOpen] = useState(false)

  return (
    <>
      <nav
        aria-label="ניווט ראשי"
        className="fixed inset-x-0 bottom-0 z-40 border-t border-lines bg-pitch/92 pb-[max(env(safe-area-inset-bottom),0.5rem)] pt-1.5 backdrop-blur-md md:hidden"
      >
        <ul className="mx-auto grid max-w-md grid-cols-6">
          {TABS.map((item) => {
            const active = isActive(pathname, item)
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  aria-current={active ? 'page' : undefined}
                  className={`flex flex-col items-center gap-0.5 py-1.5 text-[11px] font-medium transition-colors ${
                    active ? 'text-gold' : 'text-ink-mid hover:text-ink'
                  }`}
                >
                  <TabGlyph item={item} />
                </Link>
              </li>
            )
          })}
          {/* More sheet trigger */}
          <li>
            <button
              type="button"
              onClick={() => setMoreOpen((v) => !v)}
              aria-expanded={moreOpen}
              aria-label="עוד עמודים"
              className={`flex w-full flex-col items-center gap-0.5 rounded-full py-1.5 text-[11px] font-medium transition-colors ${
                ['/history', '/records'].some((h) => isActive(pathname, { href: h, label: '' }))
                  ? 'text-gold'
                  : 'text-ink-mid hover:text-ink'
              }`}
            >
              <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" className="h-[22px] w-[22px]" aria-hidden="true">
                <circle cx="4.5" cy="10" r="1.1" fill="currentColor" stroke="none" />
                <circle cx="10" cy="10" r="1.1" fill="currentColor" stroke="none" />
                <circle cx="15.5" cy="10" r="1.1" fill="currentColor" stroke="none" />
              </svg>
              עוד
            </button>
          </li>
        </ul>
      </nav>

      {/* "עוד" sheet for secondary routes */}
      {moreOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="עוד עמודים"
          className="fixed inset-0 z-50 md:hidden"
          onClick={() => setMoreOpen(false)}
        >
          <div className="absolute inset-0 bg-black/60" aria-hidden="true" />
          <div
            className="absolute bottom-0 inset-x-0 mx-auto max-w-md rounded-t-[20px] border border-b-0 border-lines bg-surface p-4 pb-[max(env(safe-area-inset-bottom),1rem)]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mx-auto mb-4 h-1 w-9 rounded-full bg-lines" aria-hidden="true" />
            <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-ink-mid">
              עוד בקובה
            </p>
            <ul className="flex flex-col">
              {MORE.map((item) => {
                const active = isActive(pathname, item)
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      onClick={() => setMoreOpen(false)}
                      className={`block rounded-xl px-4 py-3 text-[15px] font-medium ${
                        active ? 'bg-raised text-ink' : 'text-ink hover:bg-raised/60'
                      }`}
                    >
                      {item.label}
                    </Link>
                  </li>
                )
              })}
            </ul>
          </div>
        </div>
      )}
    </>
  )
}

/** Glyph per tab — icons, not emojis (§ skill: no emoji in nav chrome). */
function TabGlyph({ item }: { item: NavItem }) {
  switch (item.href) {
    case '/': {
      // home crest
      return (
        <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" className="h-[22px] w-[22px]" aria-hidden="true">
          <path d="M2.5 9.2 10 3l7.5 6.2" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M4.5 8.6V17h11V8.6" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M8 17v-4.2h4V17" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      )
    }
    case '/tournament': {
      // trophy
      return (
        <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" className="h-[22px] w-[22px]" aria-hidden="true">
          <path d="M6 3.5h8v3a4 4 0 0 1-8 0v-3Z" strokeLinejoin="round" />
          <path d="M6 4H3.8v1.6a3.2 3.2 0 0 0 2.2 3.1M14 4h2.2v1.6a3.2 3.2 0 0 1-2.2 3.1" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M10 11v3.5M7.5 17h5" strokeLinecap="round" />
        </svg>
      )
    }
    case '/standings': {
      // ranking bars
      return (
        <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" className="h-[22px] w-[22px]" aria-hidden="true">
          <path d="M3 15h14M5.5 9v6M9 6v9M12.5 4v11M16 8v7" strokeLinecap="round" />
        </svg>
      )
    }
    case '/survey': {
      // whisky glass
      return (
        <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" className="h-[22px] w-[22px]" aria-hidden="true">
          <path d="M4 13a6 6 0 0 0 12 0c0-1 0-4.5-3-9.5a3.4 3.4 0 0 1-6 0C4 8.5 4 12 4 13Z" strokeLinejoin="round" />
          <path d="M6.5 13h7" strokeLinecap="round" />
        </svg>
      )
    }
    default: {
      // chat bubble
      return (
        <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" className="h-[22px] w-[22px]" aria-hidden="true">
          <path d="M3 7.2v5.2a1.8 1.8 0 0 0 1.8 1.8H7l4 3.6v-3.6h4.2A1.8 1.8 0 0 0 17 12.4V7.2A1.8 1.8 0 0 0 15.2 5.4H4.8A1.8 1.8 0 0 0 3 7.2Z" strokeLinejoin="round" />
          <path d="M6.5 9h7M6.5 11.6h4" strokeLinecap="round" />
        </svg>
      )
    }
  }
}