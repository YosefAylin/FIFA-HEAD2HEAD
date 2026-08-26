'use client'

/**
 * Renders a record holder: the primary (first) name bold, with any tied names
 * stacked beneath as smaller `= name` lines (the "A = B = C" inline style reads
 * badly in RTL and crowds the row).
 *
 * `tie` holds the OTHER names sharing the same value — never the primary.
 */
export function TieNames({ name, tie }: { name: string; tie?: string[] }) {
  if (!tie || tie.length === 0) return <span className="font-bold text-ink">{name}</span>
  return (
    <span className="inline-flex flex-col align-middle">
      <span className="font-bold text-ink">{name}</span>
      {tie.map((n) => (
        <span key={n} className="text-xs font-normal text-ink-mid">
          = {n}
        </span>
      ))}
    </span>
  )
}