'use client'

import { Button } from '@/components/ui/Button'
import { useTournamentGate } from '@/lib/supabase/useTournamentGate'

/**
 * Weekend-gate banner: shows whether the tournament is open (Saturday) and
 * exposes a small manual override for the "get it going" moments.
 */
export function TournamentGate() {
  const { loading, open, isSaturdayToday, manual, mode, cycle } = useTournamentGate()

  if (loading) return null

  return (
    <div
      className={`flex items-center justify-between gap-3 rounded-2xl border px-4 py-3 text-sm ${
        open ? 'border-success/40 bg-success/10 text-success' : 'border-destructive/30 bg-destructive/5 text-destructive'
      }`}
    >
      <div className="flex flex-col">
        <span className="font-bold">
          {open ? 'הטורניר פתוח! ⚽' : 'הטורניר סגור — נפתח בשבת 🔒'}
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
      <Button variant={open ? 'destructive' : 'success'} size="sm" onClick={() => void cycle()}>
        {open ? 'סגור עכשיו' : 'פתוח עכשיו'}
      </Button>
    </div>
  )
}