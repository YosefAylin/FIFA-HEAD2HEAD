'use client'

import { useEffect, useMemo, useState } from 'react'
import { Lock } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { MatchEntryForm } from '@/components/forms/MatchEntryForm'
import { ThemeToggle } from '@/components/ui/ThemeToggle'
import { MatchHistoryTable } from '@/components/widgets/MatchHistoryTable'
import { useTournamentData } from '@/lib/supabase/useTournamentData'
import { useTournamentGate } from '@/lib/supabase/useTournamentGate'
import { fetchAllMatches, joinMatchesWithPlayers } from '@/lib/supabase/matches'
import { distinctDayKeys, formatDayKey, matchDayKey } from '@/lib/utils/dateHelpers'
import type { Match, MatchWithPlayers } from '@/lib/types/database'

export default function HistoryPage() {
  const { players, matches, loading, reload } = useTournamentData()
  const gate = useTournamentGate()
  const [allMatches, setAllMatches] = useState<Match[]>([])
  const [day, setDay] = useState('all')
  const [playerId, setPlayerId] = useState('all')
  const [showDeleted, setShowDeleted] = useState(false)
  const [addMatchOpen, setAddMatchOpen] = useState(false)

  useEffect(() => {
    void fetchAllMatches().then(setAllMatches).catch(() => {})
  }, [loading]) // reload history whenever the live feed changes

  // Day keys (02:00 -> 02:00) present in the non-deleted history, newest first.
  const days = useMemo(() => distinctDayKeys(allMatches.filter((m) => !m.deleted_at)), [allMatches])

  const byId = useMemo(() => new Map(players.map((p) => [p.id, p])), [players])

  const rows: MatchWithPlayers[] = useMemo(() => {
    let list = allMatches
    if (!showDeleted) list = list.filter((m) => !m.deleted_at)
    if (day !== 'all') list = list.filter((m) => matchDayKey(m.created_at) === day)
    if (playerId !== 'all') {
      list = list.filter(
        (m) =>
          m.home_player_1_id === playerId ||
          m.home_player_2_id === playerId ||
          m.away_player_1_id === playerId ||
          m.away_player_2_id === playerId
      )
    }
    return joinMatchesWithPlayers(list, players)
  }, [allMatches, players, showDeleted, day, playerId])

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-xl font-bold">משחקים</h1>
        <div className="flex items-center gap-3">
          {gate.open ? (
            <Button size="sm" onClick={() => setAddMatchOpen(true)}>+ משחק</Button>
          ) : (
            <span className="inline-flex items-center gap-1 rounded-full bg-destructive/10 px-3 py-1 text-xs text-destructive"><Lock className="h-3 w-3" />סגור — נפתח בשבת</span>
          )}
          <ThemeToggle className="h-9 w-9 md:h-8 md:w-8" />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
        <select
          value={day}
          onChange={(e) => setDay(e.target.value)}
          className="h-12 rounded-lg border border-input bg-background px-3 text-sm"
          aria-label="סינון לפי יום"
        >
          <option value="all">כל הימים</option>
          {days.map((d) => (
            <option key={d} value={d}>{formatDayKey(d)}</option>
          ))}
        </select>

        <select
          value={playerId}
          onChange={(e) => setPlayerId(e.target.value)}
          className="h-12 rounded-lg border border-input bg-background px-3 text-sm"
          aria-label="סינון לפי שחקן"
        >
          <option value="all">כל השחקנים</option>
          {players.map((p) => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </select>

        <label className="flex h-12 items-center gap-2 rounded-lg border border-input bg-background px-3 text-sm">
          <input
            type="checkbox"
            checked={showDeleted}
            onChange={(e) => setShowDeleted(e.target.checked)}
            className="h-4 w-4"
          />
          מראה משחקים שנמחקו
        </label>
      </div>

      {loading && matches.length === 0 ? (
        <p className="py-10 text-center text-muted-foreground">טוען…</p>
      ) : (
        <MatchHistoryTable
          matches={rows}
          showDeleted={showDeleted}
          onChanged={() => {
            void reload()
            void fetchAllMatches().then(setAllMatches)
          }}
        />
      )}

      <Modal open={addMatchOpen} onClose={() => setAddMatchOpen(false)} title="הוספת משחק">
        <MatchEntryForm players={players} onAdded={() => { setAddMatchOpen(false); void reload() }} />
      </Modal>
    </div>
  )
}