'use client'

import { Button } from '@/components/ui/Button'

interface Props {
  onAddMatch: () => void
  onAddPlayer: () => void
}

/** Floating action for adding a match — one loud gold action, waits clear of
 *  the mobile tab bar (bottom-24). */
export function FloatingActionButton({ onAddMatch, onAddPlayer }: Props) {
  return (
    <div className="fixed bottom-24 left-5 z-40 flex flex-col items-end gap-2">
      <Button
        onClick={onAddMatch}
        size="icon"
        className="h-14 w-14 rounded-full text-2xl shadow-[0_8px_24px_rgba(0,0,0,0.5)]"
        aria-label="הוסף משחק"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-6 w-6" aria-hidden="true">
          <path d="M12 5v14M5 12h14" strokeLinecap="round" />
        </svg>
      </Button>
      <Button
        onClick={onAddPlayer}
        variant="outline"
        size="sm"
        aria-label="הוסף שחקן"
      >
        + שחקן
      </Button>
    </div>
  )
}