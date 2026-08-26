'use client'

import { useEffect, useMemo, useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { MatchEntryForm } from '@/components/forms/MatchEntryForm'
import { MatchHistoryTable } from '@/components/widgets/MatchHistoryTable'
import { useTournamentData } from '@/lib/supabase/useTournamentData'
import { useTournamentGate } from '@/lib/supabase/useTournamentGate'
import { fetchAllMatches, fetchWeekKeys, joinMatchesWithPlayers } from '@/lib/supabase/matches'
import { formatWeekKey } from '@/lib/utils/dateHelpers'
import type { Match, MatchWithPlayers } from '@/lib/types/database'

export default function HistoryPage() {
  const { players, matches, loading, reload } = useTournamentData()
  const gate = useTournamentGate()
  const [allMatches, setAllMatches] = useState<Match[]>([])
  const [weeks, setWeeks] = useState<string[]>([])
  const [week, setWeek] = useState('all')
  const [playerId, setPlayerId] = useState('all')
  const [showDeleted, setShowDeleted] = useState(false)
  const [addMatchOpen, setAddMatchOpen] = useState(false)

  useEffect(() => {
    void fetchAllMatches().then(setAllMatches).catch(() => {})
    void fetchWeekKeys().then(setWeeks).catch(() => {})
  }, [loading])

  const byId = useMemo(() => new Map(players.map((p) => [p.id, p])), [players])

  const rows: MatchWithPlayers[] = useMemo(() => {
    let list = allMatches
    if (!showDeleted) list = list.filter((m) => !m.deleted_at)
    if (week !== 'all') list = list.filter((m) => m.week_start_date === week)
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
  }, [allMatches, players, showDeleted, week, playerId])

  const selectClass =
    'h-11 rounded-xl border border-lines bg-raised/50 px-3 text-[15px] text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/30'

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight text-ink">משחקים</h1>
        {gate.open ? (
          <Button size="sm" onClick={() => setAddMatchOpen(true)}>+ משחק</Button>
        ) : (
          <span className="rounded-full bg-loss/10 px-3 py-1 text-xs text-loss">סגור — נפתח בשבת</span>
        )}
      </div>

      <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
        <select value={week} onChange={(e) => setWeek(e.target.value)} className={selectClass} aria-label="סינון לפי שבוע">
          <option value="all">כל השבועות</option>
          {weeks.map((w) => (
            <option key={w} value={w}>{formatWeekKey(w)}</option>
          ))}
        </select>

        <select value={playerId} onChange={(e) => setPlayerId(e.target.value)} className={selectClass} aria-label="סינון לפי שחקן">
          <option value="all">כל השחקנים</option>
          {players.map((p) => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </select>

        <label className="flex h-11 items-center gap-2 rounded-xl border border-lines bg-raised/50 px-3 text-sm text-ink">
          <input
            type="checkbox"
            checked={showDeleted}
            onChange={(e) => setShowDeleted(e.target.checked)}
            className="h-4 w-4 accent-gold"
          />
          מראה משחקים שנמחקו
        </label>
      </div>

      {loading && matches.length === 0 ? (
        <p className="py-10 text-center text-ink-mid">טוען…</p>
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

      <Modal open={addMatchOpen} onClose={() => setAddMatchOpen(false)} kicker="היסטוריה" title="הוספת משחק" titleDisplay={<span>הוספת משחק ⚽</span>}>
        <MatchEntryForm players={players} onAdded={() => { setAddMatchOpen(false); void reload() }} />
      </Modal>
    </div>
  )
}