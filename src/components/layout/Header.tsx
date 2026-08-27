'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Goal } from 'lucide-react'
import { formatWeekKey } from '@/lib/utils/dateHelpers'
import { ThemeToggle } from '@/components/ui/ThemeToggle'

const PRIMARY = [
  { href: '/', label: 'בית', exact: true },
  { href: '/tournament', label: 'הטורניר', exact: true },
  { href: '/standings', label: 'טבלה' },
  { href: '/history', label: 'משחקים' },
]

const SECONDARY = [
  { href: '/records', label: 'שיאים' },
  { href: '/survey', label: 'וויסקי' },
  { href: '/chat', label: 'צ׳אט', exact: true },
]

function navLinkClass(active: boolean, primary: boolean): string {
  return [
    'whitespace-nowrap rounded-xl transition-all duration-200',
    primary ? 'px-4 py-2 text-sm font-semibold' : 'px-3 py-1.5 text-xs',
    active
      ? primary
        ? 'bg-primary text-primary-foreground'
        : 'bg-accent/15 text-accent'
      : 'text-muted-foreground hover:bg-accent/10 hover:text-foreground',
  ].join(' ')
}

function NavItem({ href, label, exact, primary }: { href: string; label: string; exact?: boolean; primary: boolean }) {
  const pathname = usePathname()
  const active = exact ? pathname === href : pathname.startsWith(href)
  return (
    <Link href={href} className={navLinkClass(active, primary)}>
      {label}
    </Link>
  )
}

export function Header() {
  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/90 backdrop-blur">
      <div className="mx-auto flex max-w-3xl flex-col gap-2 px-4 py-3">
        <div className="flex items-center justify-between">
          <Link href="/" className="flex items-center gap-1.5 text-xl font-extrabold tracking-tight">
            <Goal className="h-5 w-5 text-primary" aria-hidden="true" />
            קובה של שבת
          </Link>
          <div className="flex items-center gap-2">
            <span className="rounded-full bg-surface px-3 py-1 text-xs font-medium text-muted-foreground">
              {formatWeekKey(new Date().toISOString().slice(0, 10))}
            </span>
            <ThemeToggle />
          </div>
        </div>
        {/* Main pages take the top row and get the strong styling; the rest
            sit below as a quieter secondary strip. */}
        <div className="flex flex-col gap-1">
          <nav className="flex gap-1 overflow-x-auto">
            {PRIMARY.map((item) => (
              <NavItem key={item.href} {...item} primary />
            ))}
          </nav>
          <nav className="flex gap-1 overflow-x-auto border-t border-border/50 pt-1">
            {SECONDARY.map((item) => (
              <NavItem key={item.href} {...item} primary={false} />
            ))}
          </nav>
        </div>
      </div>
    </header>
  )
}
