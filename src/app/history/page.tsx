'use client'

import { useEffect, useMemo, useState } from 'react'
import { History, Lock, Plus } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { MatchEntryForm } from '@/components/forms/MatchEntryForm'
import { ThemeToggle } from '@/components/ui/ThemeToggle'
import { MatchHistoryTable } from '@/components/widgets/MatchHistoryTable'
import { useTournamentData } from '@/lib/supabase/useTournamentData'
import { useTournamentGate } from '@/lib/supabase/useTournamentGate'
import { fetchAllMatches, joinMatchesWithPlayers } from '@/lib/supabase/matches'
import { distinctDayKeys, formatDayKey, matchDayKey } from '@/lib/utils/dateHelpers'
import { groupPlayersByStatus } from '@/lib/utils/playerHelpers'
import type { Match, MatchWithPlayers } from '@/lib/types/database'

const selectClass =
  'h-12 w-full rounded-xl border border-input bg-background px-3 text-sm transition-all duration-200 hover:border-primary/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'

function StatTile({ value, label, accent = false }: { value: React.ReactNode; label: string; accent?: boolean }) {
  return (
    <div className="rise-in rounded-2xl border border-border bg-surface p-3">
      <p className={`text-2xl font-extrabold leading-none tabular-nums ${accent ? 'text-primary' : ''}`}>{value}</p>
      <p className="mt-1 text-[11px] text-muted-foreground">{label}</p>
    </div>
  )
}

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

  // The player filter is grouped: active / inactive / guests.
  const playerGroups = useMemo(() => groupPlayersByStatus(players), [players])

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

  const summary = useMemo(() => {
    const goals = rows.reduce((s, m) => s + m.home_score + m.away_score, 0)
    const tournamentDays = new Set(rows.map((m) => matchDayKey(m.created_at))).size
    return {
      matches: rows.length,
      goals,
      days: tournamentDays,
      avg: rows.length ? goals / rows.length : 0,
    }
  }, [rows])

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-primary/10 text-primary">
            <History className="h-5 w-5" />
          </span>
          <div>
            <h1 className="text-xl font-bold leading-tight">היסטוריית משחקים</h1>
            <p className="text-xs text-muted-foreground">כל הקובה, טורניר אחרי טורניר</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {gate.open ? (
            <Button size="sm" onClick={() => setAddMatchOpen(true)}>
              <Plus className="h-4 w-4" /> משחק
            </Button>
          ) : (
            <span className="inline-flex items-center gap-1 rounded-full bg-destructive/10 px-3 py-1 text-xs text-destructive">
              <Lock className="h-3 w-3" /> סגור — נפתח בשבת
            </span>
          )}
          <ThemeToggle className="h-9 w-9 md:h-8 md:w-8" />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <StatTile value={summary.matches} label="משחקים" accent />
        <StatTile value={summary.goals} label="שערים" />
        <StatTile value={summary.days} label="טורנירים" />
        <StatTile value={summary.avg.toFixed(1)} label="שערים למשחק" />
      </div>

      <div className="rounded-2xl border border-border bg-surface p-3">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <label className="flex flex-col gap-1.5">
            <span className="text-[11px] font-medium text-muted-foreground">טורניר</span>
            <select value={day} onChange={(e) => setDay(e.target.value)} className={selectClass} aria-label="סינון לפי טורניר">
              <option value="all">כל הטורנירים</option>
              {days.map((d) => (
                <option key={d} value={d}>
                  {formatDayKey(d)}
                </option>
              ))}
            </select>
          </label>

          <label className="flex flex-col gap-1.5">
            <span className="text-[11px] font-medium text-muted-foreground">שחקן</span>
            <select
              value={playerId}
              onChange={(e) => setPlayerId(e.target.value)}
              className={selectClass}
              aria-label="סינון לפי שחקן"
            >
              <option value="all">כל השחקנים</option>
              {playerGroups.active.length > 0 && (
                <optgroup label="פעילים">
                  {playerGroups.active.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </optgroup>
              )}
              {playerGroups.inactive.length > 0 && (
                <optgroup label="לא פעילים">
                  {playerGroups.inactive.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </optgroup>
              )}
              {playerGroups.guests.length > 0 && (
                <optgroup label="אורחים">
                  {playerGroups.guests.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </optgroup>
              )}
            </select>
          </label>

          <label className="flex flex-col gap-1.5">
            <span className="text-[11px] font-medium text-muted-foreground">תצוגה</span>
            <span className="flex h-12 cursor-pointer items-center gap-2 rounded-xl border border-input bg-background px-3 text-sm transition-colors duration-200 has-[:checked]:border-primary/50 has-[:checked]:bg-primary/5">
              <input
                type="checkbox"
                checked={showDeleted}
                onChange={(e) => setShowDeleted(e.target.checked)}
                className="h-4 w-4 accent-primary"
              />
              הצג גם משחקים שנמחקו
            </span>
          </label>
        </div>
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
        <MatchEntryForm
          players={players}
          onAdded={() => {
            setAddMatchOpen(false)
            void reload()
          }}
        />
      </Modal>
    </div>
  )
}
