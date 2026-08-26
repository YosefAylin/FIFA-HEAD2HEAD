'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { MatchSelectBar } from '@/components/widgets/MatchSelectBar'
import { PlayerCardGridClient } from '@/components/widgets/PlayerCardGridClient'
import { WHISKY_RULE } from '@/lib/data/roster'
import { Button } from '@/components/ui/Button'
import { FloatingActionButton } from '@/components/ui/FloatingActionButton'
import { Modal } from '@/components/ui/Modal'
import { MatchEntryForm, type MatchEntryInitial } from '@/components/forms/MatchEntryForm'
import { AddPlayerForm } from '@/components/forms/AddPlayerForm'
import { useTournamentData } from '@/lib/supabase/useTournamentData'
import { useTournamentGate } from '@/lib/supabase/useTournamentGate'
import type { Player } from '@/lib/types/database'

/**
 * The tournament itself: the binding whisky rule, this-week's player grid, and
 * the full add-match / tap-to-build flow. Shared between the home page and the
 * dedicated `/tournament` tab so the tournament lives once. Each page renders
 * its own gate banner around it.
 */
export function TournamentHub() {
  const { players, matches, loading, reload } = useTournamentData()
  const gate = useTournamentGate()
  const router = useRouter()
  const [addMatchOpen, setAddMatchOpen] = useState(false)
  const [addPlayerOpen, setAddPlayerOpen] = useState(false)

  // Tap-to-build-match flow.
  const [actionPlayer, setActionPlayer] = useState<Player | null>(null)
  const [selecting, setSelecting] = useState(false)
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [matchOpen, setMatchOpen] = useState(false)
  const [matchInitial, setMatchInitial] = useState<MatchEntryInitial>({})

  const selectedPlayers = useMemo(
    () => selectedIds.map((id) => players.find((p) => p.id === id)).filter((p): p is Player => Boolean(p)),
    [selectedIds, players]
  )

  function startMatchFrom(player: Player) {
    setActionPlayer(null)
    setSelectedIds([player.id])
    setSelecting(true)
  }

  function handleToggleSelect(player: Player) {
    setSelectedIds((prev) => {
      if (prev.includes(player.id)) return prev.filter((id) => id !== player.id)
      if (prev.length >= 4) return prev
      return [...prev, player.id]
    })
  }

  function cancelSelection() {
    setSelecting(false)
    setSelectedIds([])
  }

  function confirmSelection() {
    const n = selectedIds.length
    if (n === 2) {
      setMatchInitial({ mode: '1v1', home1: selectedIds[0], away1: selectedIds[1] })
    } else if (n === 4) {
      setMatchInitial({
        mode: '2v2',
        home1: selectedIds[0],
        home2: selectedIds[1],
        away1: selectedIds[2],
        away2: selectedIds[3],
      })
    } else {
      return
    }
    setMatchOpen(true)
  }

  return (
    <div className="flex flex-col gap-4">
      <p className="rounded-xl bg-accent/10 px-3 py-2 text-xs font-semibold text-accent">
        {WHISKY_RULE}
      </p>

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
        <h2 className="mb-2 text-lg font-bold">השבוע 📆</h2>
        {loading ? (
          <p className="py-8 text-center text-muted-foreground">טוען שחקנים…</p>
        ) : (
          <PlayerCardGridClient
            initialPlayers={players}
            initialMatches={matches}
            selecting={selecting}
            selectedIds={selectedIds}
            onCardClick={(p) => setActionPlayer(p)}
            onToggleSelect={handleToggleSelect}
          />
        )}
      </section>

      {gate.open && !selecting && (
        <FloatingActionButton onAddMatch={() => setAddMatchOpen(true)} onAddPlayer={() => setAddPlayerOpen(true)} />
      )}

      {selecting && (
        <MatchSelectBar
          players={players}
          selectedIds={selectedIds}
          gateOpen={gate.open}
          onCancel={cancelSelection}
          onConfirm={confirmSelection}
        />
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

      {/* Player action sheet: view profile or start a match from this player. */}
      <Modal
        open={actionPlayer !== null}
        onClose={() => setActionPlayer(null)}
        title={actionPlayer ? `כניסה מהירה — ${actionPlayer.name}` : ''}
      >
        <div className="flex flex-col gap-2">
          <Button
            variant="outline"
            size="lg"
            className="h-14 w-full"
            onClick={() => {
              if (actionPlayer) router.push(`/players/${actionPlayer.id}`)
            }}
          >
            👤 צפייה בפרופיל
          </Button>
          {gate.open ? (
            <Button
              variant="success"
              size="lg"
              className="h-14 w-full"
              onClick={() => actionPlayer && startMatchFrom(actionPlayer)}
            >
              ⚽ הזנת משחק
            </Button>
          ) : (
            <Button disabled size="lg" className="h-14 w-full">
              🔒 הטורניר סגור — נפתח בשבת
            </Button>
          )}
        </div>
      </Modal>

      {/* Prefilled from the tap-to-select flow. */}
      <Modal
        open={matchOpen}
        onClose={() => {
          setMatchOpen(false)
          cancelSelection()
        }}
        title="הזנת משחק ⚽"
      >
        {selectedPlayers.length >= 2 ? (
          <MatchEntryForm
            key={`match-${selectedIds.join('-')}`}
            players={players}
            initial={matchInitial}
            onAdded={() => {
              setMatchOpen(false)
              cancelSelection()
              void reload()
            }}
          />
        ) : (
          <p className="text-center text-muted-foreground">צריך לפחות שני שחקנים כדי לרשום משחק.</p>
        )}
      </Modal>
    </div>
  )
}