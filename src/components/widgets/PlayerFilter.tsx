'use client'

interface Option {
  id: string
  name: string
}

interface Props {
  options: Option[]
  /** Players deliberately left out of the table (empty set = everyone counts). */
  excludedIds: Set<string>
  onToggle: (id: string) => void
  onAll: () => void
  onNone: () => void
}

/**
 * Checkbox chips choosing which players count toward the standings table.
 * State is the *excluded* set, so newly added players are counted by default.
 */
export function PlayerFilter({ options, excludedIds, onToggle, onAll, onNone }: Props) {
  if (options.length === 0) return null
  const selectedCount = options.filter((o) => !excludedIds.has(o.id)).length

  return (
    <section className="rounded-2xl border border-border bg-surface p-3">
      <div className="mb-2 flex items-center justify-between gap-2">
        <h2 className="text-sm font-semibold">
          שחקנים בטבלה{' '}
          <span className="font-normal text-muted-foreground">
            ({selectedCount}/{options.length})
          </span>
        </h2>
        <div className="flex items-center gap-2 text-xs">
          <button type="button" onClick={onAll} className="text-primary hover:underline">
            בחר הכל
          </button>
          <span aria-hidden className="text-border">
            |
          </span>
          <button type="button" onClick={onNone} className="text-muted-foreground hover:underline">
            נקה
          </button>
        </div>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {options.map((o) => {
          const checked = !excludedIds.has(o.id)
          return (
            <label
              key={o.id}
              className={`inline-flex cursor-pointer items-center gap-1.5 rounded-full border px-2.5 py-1 text-sm transition-colors duration-200 ${
                checked
                  ? 'border-primary/50 bg-primary/10 text-foreground'
                  : 'border-border bg-background text-muted-foreground'
              }`}
            >
              <input
                type="checkbox"
                checked={checked}
                onChange={() => onToggle(o.id)}
                className="h-3.5 w-3.5 accent-primary"
              />
              {o.name}
            </label>
          )
        })}
      </div>
    </section>
  )
}
