'use client'

import { Plus, Goal } from 'lucide-react'
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
        className="h-14 w-14 rounded-full shadow-xl transition-transform duration-200 hover:scale-105"
        aria-label="הוסף משחק"
      >
        <Goal className="h-6 w-6" />
      </Button>
      <Button
        onClick={onAddPlayer}
        size="icon"
        variant="secondary"
        className="h-14 w-14 rounded-full shadow-xl transition-transform duration-200 hover:scale-105"
        aria-label="הוסף שחקן"
      >
        <Plus className="h-6 w-6" />
      </Button>
    </div>
  )
}
