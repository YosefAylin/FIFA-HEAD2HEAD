'use client'

import Link from 'next/link'
import { ChevronLeft } from 'lucide-react'
import { PageHeader } from '@/components/ui/PageHeader'
import { MORE, TOP_NAV } from '@/components/nav/nav'

/**
 * "עוד" — only the destinations that are NOT already on the desktop top bar,
 * so it's the short list of everything otherwise hard to reach.
 */
export default function MorePage() {
  const topHrefs = new Set(TOP_NAV.map((i) => i.href))
  const pages = MORE.filter((p) => !topHrefs.has(p.href))

  return (
    <div className="flex flex-col gap-4">
      <PageHeader title={<h1 className="text-xl font-bold">עמודים נוספים</h1>} />
      {pages.length === 0 ? (
        <p className="rounded-xl border border-border bg-surface py-10 text-center text-muted-foreground">
          אין עמודים נוספים
        </p>
      ) : (
        <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {pages.map((p) => (
            <li key={p.href}>
              <Link
                href={p.href}
                className="flex items-center justify-between rounded-2xl border border-border bg-surface px-4 py-3 transition-colors hover:border-primary/50"
              >
                <span className="font-medium">{p.label}</span>
                <ChevronLeft className="h-4 w-4 text-muted-foreground" />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
