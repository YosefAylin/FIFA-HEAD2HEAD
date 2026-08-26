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
 * Shows who's selected (team letters: א first two, ב next two) and continues
 * at exactly 2 or 4 players (1v1 / 2v2).
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
            ? 'הטורניר סגור — נפתח בשבת'
            : 'צריך 2 או 4 שחקנים'

  return (
    <div className="fixed inset-x-0 bottom-0 z-40 p-4 pb-[max(env(safe-area-inset-bottom),0.5rem)]">
      <div className="mx-auto max-w-5xl rounded-[20px] border border-lines bg-surface/95 p-4 shadow-[0_-12px_40px_rgba(0,0,0,0.5)] backdrop-blur-md">
        <div className="mb-2 flex items-center justify-between">
          <span className="text-sm font-bold text-ink">בונים משחק ⚽</span>
          <button
            onClick={onCancel}
            className="text-xs text-ink-mid transition-colors hover:text-ink"
          >
            ביטול
          </button>
        </div>

        <div className="flex min-h-[36px] flex-wrap gap-2">
          {selectedIds.length === 0 && (
            <span className="text-sm text-ink-mid">לוחצים על כרטיסי שחקנים כדי לבחור (עד 4).</span>
          )}
          {selectedIds.map((id, i) => {
            const p = byId.get(id)
            if (!p) return null
            const team = i < 2 ? 'א' : 'ב'
            return (
              <span
                key={id}
                className="inline-flex items-center gap-2 rounded-full border border-lines bg-raised py-1 pl-3 pr-1 text-sm font-medium text-ink"
              >
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-gold text-xs font-bold text-gold-ink">
                  {team}
                  {i + 1}
                </span>
                <span className="truncate">{p.name}</span>
              </span>
            )
          })}
        </div>

        <p className="mt-2 text-xs text-ink-faint">{hint}</p>

        <Button
          onClick={onConfirm}
          disabled={!ready}
          size="lg"
          className="mt-3 w-full"
        >
          {gateOpen ? 'המשך להזנת תוצאה' : 'הטורניר סגור 🔒'}
        </Button>
      </div>
    </div>
  )
}