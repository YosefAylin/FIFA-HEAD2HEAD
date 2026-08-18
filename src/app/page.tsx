'use client'

import { useState } from 'react'
import { AllTimeBoard } from '@/components/widgets/AllTimeBoard'
import { ChatBox } from '@/components/widgets/ChatBox'
import { FunCommentsDisplay } from '@/components/widgets/FunCommentsDisplay'
import { PlayerCardGridClient } from '@/components/widgets/PlayerCardGridClient'
import { TournamentGate } from '@/components/widgets/TournamentGate'
import { WeekRecapCard } from '@/components/widgets/WeekRecapCard'
import { Button } from '@/components/ui/Button'
import { FloatingActionButton } from '@/components/ui/FloatingActionButton'
import { Modal } from '@/components/ui/Modal'
import { MatchEntryForm } from '@/components/forms/MatchEntryForm'
import { AddPlayerForm } from '@/components/forms/AddPlayerForm'
import { useTournamentData } from '@/lib/supabase/useTournamentData'
import { useTournamentGate } from '@/lib/supabase/useTournamentGate'

export default function HomePage() {
  const { players, matches, loading, reload } = useTournamentData()
  const gate = useTournamentGate()
  const [addMatchOpen, setAddMatchOpen] = useState(false)
  const [addPlayerOpen, setAddPlayerOpen] = useState(false)

  return (
    <div className="flex flex-col gap-4">
      <FunCommentsDisplay />
      <TournamentGate />
      <WeekRecapCard />

      <Button
        variant={gate.open ? 'success' : 'secondary'}
        size="lg"
        className="h-14 w-full text-lg"
        disabled={!gate.open}
        onClick={() => gate.open && setAddMatchOpen(true)}
      >
        {gate.open ? '➕ הוספת משחק' : '🔒 הטורניר סגור — נפתח בשבת'}
      </Button>

      <section>
        <h2 className="mb-2 flex items-center justify-between text-lg font-bold">
          <span>טבלת כל הזמנים 👑</span>
          <span className="text-xs font-normal text-muted-foreground">עמודה: נקודות</span>
        </h2>
        <AllTimeBoard />
      </section>

      <section>
        <h2 className="mb-2 text-lg font-bold">השבוע 📆</h2>
        {loading ? (
          <p className="py-8 text-center text-muted-foreground">טוען שחקנים…</p>
        ) : (
          <PlayerCardGridClient initialPlayers={players} initialMatches={matches} />
        )}
      </section>

      <section>
        <ChatBox />
      </section>

      {gate.open && (
        <FloatingActionButton onAddMatch={() => setAddMatchOpen(true)} onAddPlayer={() => setAddPlayerOpen(true)} />
      )}

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