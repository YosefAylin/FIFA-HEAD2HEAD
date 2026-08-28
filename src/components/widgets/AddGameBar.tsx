'use client'

import { useState } from 'react'
import { ChevronDown, Goal } from 'lucide-react'
import { MatchEntryForm } from '@/components/forms/MatchEntryForm'
import { useTournamentData } from '@/lib/supabase/useTournamentData'

/**
 * Compact home-page add-game hub: one line that expands into the photo-based
 * `MatchEntryForm`. Mounted only while the tournament is open, so the form
 * stays one tap away without chewing vertical space the rest of the week.
 */
export function AddGameBar() {
  const { players, loading, reload } = useTournamentData()
  const [open, setOpen] = useState(false)

  return (
    <div className="flex flex-col gap-2 rounded-2xl border border-border bg-surface p-2">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-2 rounded-xl px-3 py-2.5 text-right transition-colors hover:bg-muted/60"
      >
        <span className="flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary">
            <Goal className="h-5 w-5" />
          </span>
          <span className="text-sm font-bold">הוספת משחק</span>
          {loading && <span className="text-xs font-normal text-muted-foreground">טוען שחקנים…</span>}
        </span>
        <ChevronDown
          className={`h-5 w-5 text-muted-foreground transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
        />
      </button>

      {open && (
        <div className="border-t border-border pt-2">
          {players.length >= 2 ? (
            <MatchEntryForm
              players={players}
              onAdded={() => {
                setOpen(false)
                void reload()
              }}
            />
          ) : (
            <p className="px-2 pb-2 text-center text-sm text-muted-foreground">
              צריך לפחות שני שחקנים כדי לרשום משחק.
            </p>
          )}
        </div>
      )}
    </div>
  )
}