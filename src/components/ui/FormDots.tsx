'use client'

import type { Result } from '@/lib/supabase/stats'

interface FormDotsProps {
  /** A string of results, e.g. "WWDLL" (most recent last, or as given). */
  results: string
  size?: 'sm' | 'md'
}

const dot: Record<Result, { t: string; cls: string; label: string }> = {
  W: { t: 'נ', cls: 'bg-win/15 text-win', label: 'ניצחון' },
  D: { t: 'פ', cls: 'bg-raised text-ink-mid', label: 'תיקו' },
  L: { t: 'ה', cls: 'bg-loss/15 text-loss', label: 'הפסד' },
}

/** Compact win / draw / loss dots — result carried by shape-rendered letter
 *  AND color, so it reads without relying on color alone. */
export function FormDots({ results, size = 'sm' }: FormDotsProps) {
  const edge = size === 'sm' ? 'h-6 w-6 text-[11px]' : 'h-7 w-7 text-xs'
  return (
    <span className="inline-flex items-center gap-1" role="img" aria-label={results.split('').map((r) => dot[r as Result]?.label).join(' ')}>
      {results.split('').map((r, i) => {
        const d = dot[r as Result]
        if (!d) return null
        return (
          <span key={i} className={`inline-flex items-center justify-center rounded-md font-bold leading-none ${edge} ${d.cls}`}>
            {d.t}
          </span>
        )
      })}
    </span>
  )
}