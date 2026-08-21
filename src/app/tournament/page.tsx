'use client'

import { useState } from 'react'
import { TournamentHub } from '@/components/widgets/TournamentHub'
import { TournamentGate } from '@/components/widgets/TournamentGate'
import { Button } from '@/components/ui/Button'
import { useTournamentGate } from '@/lib/supabase/useTournamentGate'
import { TOURNAMENT_END_HOUR } from '@/lib/supabase/tournamentGate'

/**
 * The dedicated tournament tab. The gate banner, the binding whisky rule, the
 * player grid, and the full add-match flow live here (shared with home via
 * `TournamentHub`).
 *
 * The session's real end is computed at ~21:00 Israel — shown so the group
 * knows when odds + bot cut over — but the gate itself is never auto-closed.
 * A small admin control lets someone flip the gate off early ("confirm ended"),
 * which is the only way it closes.
 */
export default function TournamentPage() {
  const gate = useTournamentGate()
  const [confirming, setConfirming] = useState(false)

  return (
    <div className="flex flex-col gap-4">
      {/* Admin chip: computed end time + manual confirm. */}
      {!gate.loading && (
        <div className="flex flex-col gap-2 rounded-2xl border border-border bg-surface p-3">
          <p className="text-xs text-muted-foreground">
            הטורניר נסגר בדרך כלל סביב <span className="font-semibold text-foreground">{TOURNAMENT_END_HOUR}:00</span> — מהשעה הזו
            הסיכויים והבוט נכנסים למצב "נגמר", אבל עדיין אפשר לרשום משחקים כל השבת.
          </p>
          {gate.open ? (
            confirming ? (
              <div className="flex gap-2">
                <Button variant="destructive" size="sm" onClick={() => void gate.setMode('off')}>
                  ✓ סגירה מוקדמת
                </Button>
                <Button variant="ghost" size="sm" onClick={() => setConfirming(false)}>
                  ביטול
                </Button>
              </div>
            ) : (
              <Button variant="outline" size="sm" onClick={() => setConfirming(true)}>
                אישור "נגמר עכשיו" 🛑
              </Button>
            )
          ) : (
            <p className="text-xs font-semibold text-destructive">הטורניר סגור.</p>
          )}
        </div>
      )}

      <TournamentGate showToggle={false} />
      <TournamentHub />
    </div>
  )
}