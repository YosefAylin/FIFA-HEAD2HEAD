'use client'

import Link from 'next/link'
import { useState } from 'react'
import { usePathname } from 'next/navigation'
import {
  BarChart3,
  GlassWater,
  Home,
  MessageCircle,
  MoreHorizontal,
  Trophy,
} from 'lucide-react'
import { MORE, TABS, type NavItem } from '@/components/nav/nav'
import { isActive } from '@/components/nav/Header'

/** Glyph per tab — icons, not emojis in nav chrome. */
function TabGlyph({ item }: { item: NavItem }) {
  switch (item.href) {
    case '/':
      return <Home className="h-[22px] w-[22px]" />
    case '/tournament':
      return <Trophy className="h-[22px] w-[22px]" />
    case '/standings':
      return <BarChart3 className="h-[22px] w-[22px]" />
    case '/survey':
      // Whisky glass
      return <GlassWater className="h-[22px] w-[22px]" />
    default:
      return <MessageCircle className="h-[22px] w-[22px]" />
  }
}

/**
 * Mobile bottom tab bar — the primary surface during FIFA sessions (one thumb,
 * phone in hand). Five primary tabs; the rest live behind the "עוד" sheet.
 * Hidden on md+ where the desktop top bar takes over.
 */
export function TabBar() {
  const pathname = usePathname()
  const [moreOpen, setMoreOpen] = useState(false)

  const inMore = MORE.some((item) => isActive(pathname, item))

  return (
    <>
      <nav
        aria-label="ניווט ראשי"
        className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-background/92 pb-[max(env(safe-area-inset-bottom),0.5rem)] pt-1.5 backdrop-blur-md md:hidden"
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
                    active ? 'text-primary' : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <TabGlyph item={item} />
                  {item.label}
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
              className={`flex w-full flex-col items-center gap-0.5 py-1.5 text-[11px] font-medium transition-colors ${
                inMore ? 'text-primary' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <MoreHorizontal className="h-[22px] w-[22px]" />
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
            className="absolute inset-x-0 bottom-0 mx-auto max-w-md rounded-t-[20px] border border-b-0 border-border bg-surface p-4 pb-[max(env(safe-area-inset-bottom),1rem)]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mx-auto mb-4 h-1 w-9 rounded-full bg-muted" aria-hidden="true" />
            <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
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
                        active ? 'bg-surface text-foreground' : 'text-foreground hover:bg-muted'
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