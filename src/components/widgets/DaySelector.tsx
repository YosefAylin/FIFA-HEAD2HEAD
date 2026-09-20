'use client'

import { formatDayKey } from '@/lib/utils/dateHelpers'

interface Props {
  days: string[]
  value: string | null // null = all-time
  onChange: (day: string | null) => void
}

/** Dropdown to pick a single tournament day or all-time. */
export function DaySelector({ days, value, onChange }: Props) {
  return (
    <select
      value={value ?? ''}
      onChange={(e) => onChange(e.target.value || null)}
      className="h-12 w-full max-w-xs rounded-xl border border-input bg-background px-3 text-base transition-all duration-200 hover:border-primary/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      aria-label="בחר יום"
    >
      <option value="">כל הזמנים</option>
      {days.map((d) => (
        <option key={d} value={d}>
          {formatDayKey(d)}
        </option>
      ))}
    </select>
  )
}
