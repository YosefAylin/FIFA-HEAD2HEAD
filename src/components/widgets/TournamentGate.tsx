'use client'

import { useState } from 'react'
import { Goal, Lock } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { useTournamentGate } from '@/lib/supabase/useTournamentGate'

/**
 * Weekend-gate banner: shows whether the tournament is open (Saturday) and
 * exposes a small manual override for the "get it going" moments.
 *
 * Behavior by day:
 * - Weekday: open is a manual open (labeled as such); closing just reverts to
 *   auto — a mid-week close is never persisted.
 * - Saturday: opening returns to the natural auto-open; closing asks for
 *   confirmation (it ends the tournament), then stays closed through the day
 *   and expires back to auto at the weekend's end.
 */
export function TournamentGate({ showToggle = true }: { showToggle?: boolean }) {
  const { loading, open, mode, isSaturdayToday, closingForWeekend, cycle } = useTournamentGate()
  const [confirmClose, setConfirmClose] = useState(false)

  if (loading) return null

  const palette = open
    ? 'border-success/40 bg-success/10 text-success'
    : 'border-destructive/30 bg-destructive/5 text-destructive'

  const handleToggle = () => {
    if (closingForWeekend) {
      setConfirmClose(true)
    } else {
      void cycle()
    }
  }

  return (
    <>
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
                ? 'נסגר ידנית — עד סוף השבוע'
                : isSaturdayToday
                  ? 'אוטומטי: השבוע פתוח (שבת)'
                  : 'אוטומטי: השבוע סגור (לא שבת)'}
          </span>
        </div>
        {showToggle && (
          <Button
            variant={open ? 'destructive' : 'success'}
            size="sm"
            onClick={handleToggle}
          >
            {open ? 'סגור עכשיו' : 'פתוח עכשיו'}
          </Button>
        )}
      </div>

      <Modal open={confirmClose} onClose={() => setConfirmClose(false)} title="סיום הטורניר?">
        <p className="text-sm text-muted-foreground">
          בסגירה זו הטורניר ייסגר להמשך היום ויישאר סגור עד סוף השבוע. האם לסגור אותו?
        </p>
        <div className="mt-5 flex flex-col gap-2">
          <Button variant="destructive" onClick={() => { setConfirmClose(false); void cycle() }}>
            סגור את הטורניר
          </Button>
          <Button variant="outline" onClick={() => setConfirmClose(false)}>
            ביטול
          </Button>
        </div>
      </Modal>
    </>
  )
}
