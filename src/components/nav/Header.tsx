'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { ThemeToggle } from '@/components/ui/ThemeToggle'
import { TOP_NAV, type NavItem } from '@/components/nav/nav'

export function isActive(pathname: string, item: NavItem): boolean {
  return item.exact ? pathname === item.href : pathname.startsWith(item.href)
}

/** Club wordmark — a gold tick before the name reads as a private crest mark. */
export function Brand() {
  return (
    <Link href="/" className="flex items-center gap-2.5">
      <span className="flex h-8 w-8 items-center justify-center rounded-[10px] bg-primary text-[17px] font-black leading-none text-primary-foreground">
        ק
      </span>
      <span className="text-[17px] font-bold leading-none tracking-tight text-foreground">
        קובה של שבת
      </span>
    </Link>
  )
}

/**
 * Desktop top bar: brand + every destination on ONE line. Flat + light so it
 * feels like a scoreline strip, not a SaaS header. Hidden on mobile (where the
 * bottom tab bar takes over).
 */
export function Header() {
  const pathname = usePathname()

  return (
    <header className="sticky top-0 z-40 hidden border-b border-border bg-background/85 backdrop-blur-md md:block">
      <div className="mx-auto flex h-16 max-w-5xl items-center justify-between gap-6 px-4 sm:px-6">
        <Brand />
        <div className="flex items-center gap-2">
          <nav aria-label="ניווט ראשי" className="flex items-center gap-0.5">
            {TOP_NAV.map((item) => {
              const active = isActive(pathname, item)
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={active ? 'page' : undefined}
                  className={`rounded-full px-3.5 py-2 text-[13px] font-medium transition-colors ${
                    active ? 'bg-surface text-foreground' : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                  }`}
                >
                  {item.label}
                </Link>
              )
            })}
          </nav>
          <ThemeToggle />
        </div>
      </div>
    </header>
  )
}