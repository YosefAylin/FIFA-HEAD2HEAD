'use client'

import { useState } from 'react'
import { FunCommentsDisplay } from '@/components/widgets/FunCommentsDisplay'
import { PlayerCardGridClient } from '@/components/widgets/PlayerCardGridClient'
import { FloatingActionButton } from '@/components/ui/FloatingActionButton'
import { Modal } from '@/components/ui/Modal'
import { MatchEntryForm } from '@/components/forms/MatchEntryForm'
import { AddPlayerForm } from '@/components/forms/AddPlayerForm'
import { useTournamentData } from '@/lib/supabase/useTournamentData'

export default function HomePage() {
  const { players, matches, loading, reload } = useTournamentData()
  const [addMatchOpen, setAddMatchOpen] = useState(false)
  const [addPlayerOpen, setAddPlayerOpen] = useState(false)

  return (
    <div className="flex flex-col gap-4">
      <FunCommentsDisplay />

      {loading ? (
        <p className="py-10 text-center text-muted-foreground">טוען שחקנים…</p>
      ) : (
        <PlayerCardGridClient initialPlayers={players} initialMatches={matches} />
      )}

      <FloatingActionButton onAddMatch={() => setAddMatchOpen(true)} onAddPlayer={() => setAddPlayerOpen(true)} />

      <Modal open={addMatchOpen} onClose={() => setAddMatchOpen(false)} title="הוספת משחק ⚽">
        {players.length >= 2 ? (
          <MatchEntryForm players={players} onAdded={() => { setAddMatchOpen(false); void reload() }} />
        ) : (
          <p className="text-center text-muted-foreground">צריך לפחות שני שחקנים כדי לרשום משחק.</p>
        )}
      </Modal>

      <Modal open={addPlayerOpen} onClose={() => setAddPlayerOpen(false)} title="הוספת שחקן ➕">
        <AddPlayerForm onAdded={() => { setAddPlayerOpen(false); void reload() }} />
      </Modal>
    </div>
  )
}
