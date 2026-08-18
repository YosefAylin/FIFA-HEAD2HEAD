'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { formatWeekKey } from '@/lib/utils/dateHelpers'

const NAV = [
  { href: '/', label: 'בית', exact: true },
  { href: '/standings', label: 'טבלה' },
  { href: '/history', label: 'משחקים' },
  { href: '/survey', label: 'וויסקי' },
]

export function Header() {
  const pathname = usePathname()
  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/90 backdrop-blur">
      <div className="mx-auto flex max-w-3xl flex-col gap-2 px-4 py-3">
        <div className="flex items-center justify-between">
          <Link href="/" className="text-xl font-extrabold tracking-tight">
            קובה של שבת ⚽
          </Link>
          <span className="rounded-full bg-surface px-3 py-1 text-xs font-medium text-muted-foreground">
            {formatWeekKey(new Date().toISOString().slice(0, 10))}
          </span>
        </div>
        <nav className="flex gap-1 overflow-x-auto">
          {NAV.map((item) => {
            const active = item.exact ? pathname === item.href : pathname.startsWith(item.href)
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`whitespace-nowrap rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                  active
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:bg-accent/10 hover:text-foreground'
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
