'use client'

import { Button } from '@/components/ui/Button'

interface Props {
  onAddMatch: () => void
  onAddPlayer: () => void
}

/** Floating action button expanding into "add match" / "add player". */
export function FloatingActionButton({ onAddMatch, onAddPlayer }: Props) {
  return (
    <div className="fixed bottom-5 left-5 z-40 flex flex-col-reverse items-end gap-2">
      <Button
        onClick={onAddMatch}
        size="icon"
        className="h-14 w-14 rounded-full text-2xl shadow-lg"
        aria-label="הוסף משחק"
      >
        ⚽
      </Button>
      <Button
        onClick={onAddPlayer}
        size="icon"
        variant="secondary"
        className="h-14 w-14 rounded-full text-2xl shadow-lg"
        aria-label="הוסף שחקן"
      >
        +
      </Button>
    </div>
  )
}
