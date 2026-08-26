'use client'

import { Button } from '@/components/ui/Button'
import type { Player } from '@/lib/types/database'

interface Props {
  players: Player[]
  selectedIds: string[]
  gateOpen: boolean
  onCancel: () => void
  onConfirm: () => void
}

/**
 * Sticky bottom bar shown while building a match by tapping player cards.
 * Shows who's selected (with team-letters: א first two, ב next two) and lets
 * the user continue (enabled at exactly 2 or 4 players = 1v1 / 2v2) or cancel.
 */
export function MatchSelectBar({ players, selectedIds, gateOpen, onCancel, onConfirm }: Props) {
  const byId = new Map(players.map((p) => [p.id, p]))
  const count = selectedIds.length
  const ready = (count === 2 || count === 4) && gateOpen

  const hint =
    count === 0
      ? 'בחרו עוד שחקן כדי לרשום משחק'
      : count === 2
        ? '1 על 1 ⚽ — אפשר להוסיף 2 נוספים ל-2 על 2'
        : count === 4
          ? '2 על 2 ⚽'
          : !gateOpen
            ? 'הטורניר סגור — נפתח בשבת 🔒'
            : 'צריך 2 או 4 שחקנים'

  return (
    <div className="fixed inset-x-0 bottom-0 z-40 p-4">
      <div className="mx-auto max-w-3xl rounded-2xl border border-border bg-surface/95 p-4 shadow-2xl backdrop-blur">
        <div className="mb-2 flex items-center justify-between">
          <span className="text-sm font-bold">בונים משחק ⚽</span>
          <button
            onClick={onCancel}
            className="text-xs text-muted-foreground transition-colors hover:text-destructive"
          >
            ✕ ביטול
          </button>
        </div>

        <div className="flex min-h-[40px] flex-wrap gap-2">
          {selectedIds.length === 0 && (
            <span className="text-sm text-muted-foreground">לוחצים על כרטיסי שחקנים כדי לבחור (עד 4).</span>
          )}
          {selectedIds.map((id, i) => {
            const p = byId.get(id)
            if (!p) return null
            const team = i < 2 ? 'א' : 'ב'
            return (
              <span
                key={id}
                className="inline-flex items-center gap-2 rounded-full border border-accent/40 bg-background py-1 pl-3 pr-1 text-sm font-medium"
              >
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-accent text-xs font-bold text-white">
                  {team}
                  {i + 1}
                </span>
                <span className="truncate">{p.name}</span>
              </span>
            )
          })}
        </div>

        <p className="mt-2 text-xs text-muted-foreground">{hint}</p>

        <Button
          onClick={onConfirm}
          disabled={!ready}
          variant="success"
          size="lg"
          className="mt-3 w-full"
        >
          {gateOpen ? 'המשך להזנת תוצאה ➡' : 'הטורניר סגור 🔒'}
        </Button>
      </div>
    </div>
  )
}