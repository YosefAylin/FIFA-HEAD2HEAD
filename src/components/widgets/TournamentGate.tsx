'use client'

import { Button } from '@/components/ui/Button'
import { useTournamentGate } from '@/lib/supabase/useTournamentGate'

/**
 * Weekend-gate strip: whether the tournament is open (Saturday) + the live
 * status light. The manual flip button shows on the home page (default); the
 * dedicated tournament tab passes `showToggle={false}`.
 */
export function TournamentGate({ showToggle = true }: { showToggle?: boolean }) {
  const { loading, open, isSaturdayToday, mode, cycle } = useTournamentGate()

  if (loading) return null

  const sub =
    mode === 'on'
      ? 'נפתח ידנית לכולם'
      : mode === 'off'
        ? 'נסגר ידנית — גם בשבת'
        : isSaturdayToday
          ? 'השבוע פתוח · שבת'
          : 'השבוע סגור · לא שבת'

  return (
    <div className="flex items-center justify-between gap-3 border-b border-lines pb-4">
      <div className="flex min-w-0 flex-col">
        <div className="flex items-center gap-2">
          {open ? (
            <span className="live-dot h-2 w-2 rounded-full bg-win" aria-hidden="true" />
          ) : (
            <span className="h-2 w-2 rounded-full bg-ink-faint" aria-hidden="true" />
          )}
          <span className={`text-base font-bold leading-none ${open ? 'text-ink' : 'text-ink-mid'}`}>
            {open ? 'הטורניר פתוח' : 'הטורניר סגור'}
          </span>
        </div>
        <span className="mt-1 text-xs text-ink-faint">{sub}</span>
      </div>
      {showToggle ? (
        <Button variant={open ? 'outline' : 'primary'} size="sm" onClick={() => void cycle()}>
          {open ? 'סגור עכשיו' : 'פתח עכשיו'}
        </Button>
      ) : (
        open && <span className="rounded-full bg-win/10 px-2.5 py-1 text-[11px] font-medium text-win">חי 👋</span>
      )}
    </div>
  )
}