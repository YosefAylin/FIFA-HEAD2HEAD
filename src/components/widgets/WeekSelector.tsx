'use client'

import { formatWeekKey } from '@/lib/utils/dateHelpers'

interface Props {
  weeks: string[]
  value: string | null // null = all-time
  onChange: (week: string | null) => void
}

/** Dropdown to pick a week or all-time. */
export function WeekSelector({ weeks, value, onChange }: Props) {
  return (
    <select
      value={value ?? ''}
      onChange={(e) => onChange(e.target.value || null)}
      className="h-11 w-full max-w-xs rounded-xl border border-lines bg-raised/50 px-3 text-[15px] text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/30"
      aria-label="בחר תקופה"
    >
      <option value="">כל הזמנים</option>
      {weeks.map((w) => (
        <option key={w} value={w}>
          {formatWeekKey(w)}
        </option>
      ))}
    </select>
  )
}