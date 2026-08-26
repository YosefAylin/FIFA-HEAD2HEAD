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
 * the full add-match flow. Shared between home and the /tournament tab.
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
    if (n === 2) setMatchInitial({ mode: '1v1', home1: selectedIds[0], away1: selectedIds[1] })
    else if (n === 4)
      setMatchInitial({ mode: '2v2', home1: selectedIds[0], home2: selectedIds[1], away1: selectedIds[2], away2: selectedIds[3] })
    else return
    setMatchOpen(true)
  }

  return (
    <div className="rise-2 flex flex-col">
      {/* The house rule */}
      <p className="mb-5 text-sm leading-relaxed text-ink-mid">
        {WHISKY_RULE}
      </p>

      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-[15px] font-bold text-ink">השבוע</h2>
        {gate.open && (
          <Button size="sm" onClick={() => setAddMatchOpen(true)}>
            + משחק
          </Button>
        )}
      </div>

      {loading ? (
        <p className="py-10 text-center text-ink-mid">טוען שחקנים…</p>
      ) : (
        <PlayerCardGridClient
          initialPlayers={players}
          initialMatches={[]}
          selecting={selecting}
          selectedIds={selectedIds}
          onCardClick={(p) => setActionPlayer(p)}
          onToggleSelect={handleToggleSelect}
        />
      )}

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

      <Modal open={addMatchOpen} onClose={() => setAddMatchOpen(false)} kicker="טורניר" title="הוספת משחק" titleDisplay={<span>הוספת משחק <span className="text-base">⚽</span></span>}>
        {players.length >= 2 ? (
          <MatchEntryForm players={players} onAdded={() => { setAddMatchOpen(false); void reload() }} />
        ) : (
          <p className="py-6 text-center text-ink-mid">צריך לפחות שני שחקנים כדי לרשום משחק.</p>
        )}
      </Modal>

      <Modal open={addPlayerOpen} onClose={() => setAddPlayerOpen(false)} title="הוספת שחקן">
        <AddPlayerForm onAdded={() => { setAddPlayerOpen(false); void reload() }} />
      </Modal>

      <Modal
        open={actionPlayer !== null}
        onClose={() => setActionPlayer(null)}
        title={actionPlayer ? `כניסה מהירה — ${actionPlayer.name}` : ''}
      >
        <div className="mt-3 flex flex-col gap-2">
          <Button variant="outline" size="lg" onClick={() => { if (actionPlayer) router.push(`/players/${actionPlayer.id}`) }}>
            צפייה בפרופיל
          </Button>
          {gate.open ? (
            <Button variant="primary" size="lg" onClick={() => actionPlayer && startMatchFrom(actionPlayer)}>
              הזנת משחק
            </Button>
          ) : (
            <Button disabled size="lg">הטורניר סגור — נפתח בשבת</Button>
          )}
        </div>
      </Modal>

      <Modal
        open={matchOpen}
        onClose={() => { setMatchOpen(false); cancelSelection() }}
        kicker="טורניר"
        title="הזנת משחק"
        titleDisplay={<span>⚽ הזנת משחק</span>}
      >
        {selectedPlayers.length >= 2 ? (
          <MatchEntryForm
            key={`match-${selectedIds.join('-')}`}
            players={players}
            initial={matchInitial}
            onAdded={() => { setMatchOpen(false); cancelSelection(); void reload() }}
          />
        ) : (
          <p className="py-6 text-center text-ink-mid">צריך לפחות שני שחקנים כדי לרשום משחק.</p>
        )}
      </Modal>
    </div>
  )
}