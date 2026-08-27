'use client'

import { Goal, Lock } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { useTournamentGate } from '@/lib/supabase/useTournamentGate'

/**
 * Weekend-gate banner: shows whether the tournament is open (Saturday) and
 * exposes a small manual override for the "get it going" moments.
 *
 * The manual flip button shows on the home page (default). The dedicated
 * tournament tab passes `showToggle={false}` so only the end-of-day chip
 * there controls closure — no button colliding with it.
 */
export function TournamentGate({ showToggle = true }: { showToggle?: boolean }) {
  const { loading, open, isSaturdayToday, mode, cycle } = useTournamentGate()

  if (loading) return null

  const palette = open
    ? 'border-success/40 bg-success/10 text-success'
    : 'border-destructive/30 bg-destructive/5 text-destructive'

  return (
    <div
      className={`flex items-center justify-between gap-3 rounded-2xl border px-4 py-3 text-sm ${palette}`}
    >
      <div className="flex flex-1 min-w-0 flex-col">
        <span className="flex items-center gap-1.5 font-bold">
          {open ? (
            <><Goal className="h-4 w-4" /> הטורניר פתוח!</>
          ) : (
            <><Lock className="h-4 w-4" /> הטורניר סגור — נפתח בשבת</>
          )}
        </span>
        <span className="text-xs opacity-80">
          {mode === 'on'
            ? 'נפתח ידנית לכולם'
            : mode === 'off'
              ? 'נסגר ידנית — גם בשבת'
              : isSaturdayToday
                ? 'אוטומטי: השבוע פתוח (שבת)'
                : 'אוטומטי: השבוע סגור (לא שבת)'}
        </span>
      </div>
      {showToggle && (
        <Button variant={open ? 'destructive' : 'success'} size="sm" onClick={() => void cycle()}>
          {open ? 'סגור עכשיו' : 'פתוח עכשיו'}
        </Button>
      )}
    </div>
  )
}