'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { TOP_NAV, type NavItem } from '@/components/nav/nav'

export function isActive(pathname: string, item: NavItem): boolean {
  return item.exact ? pathname === item.href : pathname.startsWith(item.href)
}

/** Club wordmark — a gold tick before the name reads as a private crest mark. */
export function Brand() {
  return (
    <Link href="/" className="flex items-center gap-2.5">
      <span className="flex h-8 w-8 items-center justify-center rounded-[10px] bg-gold text-[17px] font-black leading-none text-gold-ink">
        ק
      </span>
      <span className="text-[17px] font-bold leading-none tracking-tight text-ink">
        קובה של שבת
      </span>
    </Link>
  )
}

/**
 * Desktop top bar: brand + every destination on ONE line. Flat + light so it
 * feels like a scoreline strip, not a SaaS header. Hidden on mobile.
 */
export function Header() {
  const pathname = usePathname()

  return (
    <header className="sticky top-0 z-40 hidden border-b border-lines bg-pitch/85 backdrop-blur-md md:block">
      <div className="mx-auto flex h-16 max-w-5xl items-center justify-between gap-6 px-4 sm:px-6">
        <Brand />
        <nav aria-label="ניווט ראשי" className="flex items-center gap-0.5">
          {TOP_NAV.map((item) => {
            const active = isActive(pathname, item)
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? 'page' : undefined}
                className={`rounded-full px-3.5 py-2 text-[13px] font-medium transition-colors ${
                  active ? 'bg-raised text-ink' : 'text-ink-mid hover:bg-raised/60 hover:text-ink'
                }`}
              >
                {item.label}
              </Link>
            )
          })}
        </nav>
      </div>
    </header>
  )
}