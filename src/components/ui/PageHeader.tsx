'use client'

import type { ReactNode } from 'react'
import { ThemeToggle } from '@/components/ui/ThemeToggle'

/**
 * Page title row with the light/dark toggle on the same line, aligned level.
 * On RTL the title renders on the right and the toggle on the left.
 *
 * `<title>` may be a string or a node (e.g. icon + text). The trailing
 * `justify-between` keeps title and toggle at opposite edges; an optional
 * leading `prefix` sits between them on the left side of the title.
 */
export function PageHeader({
  title,
  prefix,
  className = '',
}: {
  title: ReactNode
  prefix?: ReactNode
  className?: string
}) {
  return (
    <div className={`flex items-center justify-between gap-3 ${className}`}>
      <div className="flex items-center gap-2">
        {title}
        {prefix}
      </div>
      <ThemeToggle className="h-9 w-9 shrink-0 md:h-8 md:w-8" />
    </div>
  )
}