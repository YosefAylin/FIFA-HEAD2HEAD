'use client'

import { useState } from 'react'
import { TournamentHub } from '@/components/widgets/TournamentHub'
import { TournamentGate } from '@/components/widgets/TournamentGate'
import { Button } from '@/components/ui/Button'
import { useTournamentGate } from '@/lib/supabase/useTournamentGate'
import { TOURNAMENT_END_HOUR } from '@/lib/supabase/tournamentGate'

/**
 * Dedicated tournament tab: the gate strip (no toggle — the end-of-day chip
 * here controls closure), the binding whisky rule, the player grid, and the
 * full add-match flow.
 */
export default function TournamentPage() {
  const gate = useTournamentGate()
  const [confirming, setConfirming] = useState(false)

  return (
    <div className="flex flex-col gap-6">
      <TournamentGate showToggle={false} />

      {/* End-of-day admin chip */}
      {!gate.loading && (
        <div className="flex flex-col gap-2 border-b border-lines pb-4">
          <p className="text-xs text-ink-faint">
            הטורניר נסגר בדרך כלל סביב <span className="font-semibold text-ink">{TOURNAMENT_END_HOUR}:00</span> — מהשעה הזו
            הסיכויים והבוט נכנסים למצב “נגמר”, אבל עדיין אפשר לרשום משחקים כל השבת.
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
                אישור “נגמר עכשיו”
              </Button>
            )
          ) : (
            <p className="text-xs font-semibold text-loss">הטורניר סגור.</p>
          )}
        </div>
      )}

      <TournamentHub />
    </div>
  )
}