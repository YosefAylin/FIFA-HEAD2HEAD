'use client'

import Link from 'next/link'
import { ChevronLeft } from 'lucide-react'
import { PageHeader } from '@/components/ui/PageHeader'
import { MORE, TABS } from '@/components/nav/nav'

/**
 * "כל העמודים" — a single directory of every destination, so nothing is
 * unreachable on desktop or from the mobile "עוד" sheet.
 */
export default function MorePage() {
  const pages = [...TABS, ...MORE]

  return (
    <div className="flex flex-col gap-4">
      <PageHeader title={<h1 className="text-xl font-bold">כל העמודים</h1>} />
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
    </div>
  )
}
