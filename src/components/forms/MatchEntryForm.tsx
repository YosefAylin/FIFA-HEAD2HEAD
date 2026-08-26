'use client'

import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/input'
import { addMatch } from '@/lib/supabase/matches'
import { getCurrentWeekKey } from '@/lib/utils/dateHelpers'
import { fetchTournamentMode, isTournamentOpen } from '@/lib/supabase/tournamentGate'
import { pingBotNowResult } from '@/lib/bot/ping'
import type { GameMode, Player } from '@/lib/types/database'

/**
 * Prefilled players/teams when the form is opened from the tap-to-select
 * flow. Only read on mount — remount with a fresh key to re-seed.
 */
export interface MatchEntryInitial {
  mode?: GameMode
  home1?: string
  home2?: string
  away1?: string
  away2?: string
}

interface Props {
  players: Player[]
  onAdded: () => void
  initial?: MatchEntryInitial
}

const selectClass =
  'h-11 rounded-xl border border-lines bg-raised/50 px-3 text-[15px] text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/30'

interface PlayerSelectProps {
  label: string
  value: string
  onChange: (id: string) => void
  options: Player[]
  disabled?: boolean
}

function PlayerSelect({ label, value, onChange, options, disabled }: PlayerSelectProps) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-xs font-medium text-ink-mid">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        className={`${selectClass} ${disabled ? 'opacity-50' : ''}`}
      >
        <option value="">בחר שחקן…</option>
        {options.map((p) => (
          <option key={p.id} value={p.id}>
            {p.name}
          </option>
        ))}
      </select>
    </label>
  )
}

function ScoreInput({
  label,
  value,
  onChange,
  tone,
}: {
  label: string
  value: number
  onChange: (v: number) => void
  tone: 'home' | 'away'
}) {
  const [draft, setDraft] = useState(String(value))

  // Sync the text when the value is reset externally (e.g. after submit).
  useEffect(() => {
    setDraft((d) => (Number(d) === value ? d : String(value)))
  }, [value])

  function commit(raw: string) {
    const n = Math.trunc(Number(raw))
    if (Number.isNaN(n) || n < 0) return // mid-typing/invalid — keep the draft
    setDraft(String(n))
    onChange(n)
  }

  return (
    <div className="flex flex-col items-center gap-1.5">
      <span className="text-xs font-medium text-ink-mid">{label}</span>
      <div className="flex items-center gap-1.5 sm:gap-2">
        <Button
          variant="outline"
          size="icon"
          className="h-10 w-10 shrink-0 sm:h-11 sm:w-11"
          onClick={() => commit(String(Math.max(0, value - 1)))}
          aria-label="החסר שער"
        >
          −
        </Button>
        <input
          type="number"
          inputMode="numeric"
          min={0}
          value={draft}
          onChange={(e) => {
            setDraft(e.target.value)
            commit(e.target.value)
          }}
          onBlur={() => setDraft(String(value))}
          aria-label={label}
          className={`h-11 min-w-0 w-10 rounded-xl border border-lines bg-raised/50 text-center text-xl font-black tabular-nums focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/30 sm:w-14 sm:text-2xl ${
            tone === 'home' ? 'text-ink' : 'text-gold'
          }`}
        />
        <Button
          variant="outline"
          size="icon"
          className="h-10 w-10 shrink-0 sm:h-11 sm:w-11"
          onClick={() => commit(String(value + 1))}
          aria-label="הוסף שער"
        >
          +
        </Button>
      </div>
    </div>
  )
}

export function MatchEntryForm({ players, onAdded, initial }: Props) {
  const [mode, setMode] = useState<GameMode>(initial?.mode ?? '1v1')
  const [home1, setHome1] = useState(initial?.home1 ?? '')
  const [home2, setHome2] = useState(initial?.home2 ?? '')
  const [away1, setAway1] = useState(initial?.away1 ?? '')
  const [away2, setAway2] = useState(initial?.away2 ?? '')
  const [homeScore, setHomeScore] = useState(0)
  const [awayScore, setAwayScore] = useState(0)
  const [homeTeamName, setHomeTeamName] = useState('')
  const [awayTeamName, setAwayTeamName] = useState('')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  const selected = [home1, home2, away1, away2].filter(Boolean)

  async function handleSubmit() {
    setError('')
    if (!home1 || !away1) {
      setError('יש לבחור שחקנים לשתי הקבוצות')
      return
    }
    if (new Set(selected).size !== selected.length) {
      setError('אין לבחור את אותו שחקן פעמיים')
      return
    }
    if (home1 === away1) {
      setError('השחקן לא יכול לשחק בשתי הקבוצות')
      return
    }
    setSaving(true)
    try {
      await addMatch({
        game_mode: mode,
        home_player_1_id: home1,
        home_player_2_id: mode === '2v2' ? home2 || null : null,
        away_player_1_id: away1,
        away_player_2_id: mode === '2v2' ? away2 || null : null,
        home_score: homeScore,
        away_score: awayScore,
        home_team_name: homeTeamName || null,
        away_team_name: awayTeamName || null,
        week_start_date: getCurrentWeekKey(),
      })
      setHome1('')
      setHome2('')
      setAway1('')
      setAway2('')
      setHomeScore(0)
      setAwayScore(0)
      setHomeTeamName('')
      setAwayTeamName('')
      onAdded()
      // While the tournament is on, wake the bot so it follows this result the
      // moment it's recorded (not waiting for the scheduled sweep).
      void (async () => {
        try {
          if (isTournamentOpen(await fetchTournamentMode(), new Date())) {
            const name = (id: string) => players.find((p) => p.id === id)?.name ?? '?'
            pingBotNowResult(`${name(home1)} ${homeScore} - ${awayScore} ${name(away1)}`)
          }
        } catch {
          // Best-effort — a failed gate read shouldn't block the save.
        }
      })()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'שגיאה בשמירת המשחק')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex justify-center gap-2">
        <Button variant={mode === '1v1' ? 'primary' : 'outline'} size="sm" onClick={() => setMode('1v1')}>
          1 על 1
        </Button>
        <Button variant={mode === '2v2' ? 'primary' : 'outline'} size="sm" onClick={() => setMode('2v2')}>
          2 על 2
        </Button>
      </div>

      <div className="flex flex-col gap-3">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="flex flex-col gap-3 rounded-[20px] border border-lines bg-raised/40 p-3">
            <span className="flex items-center gap-1.5 text-sm font-bold text-ink">
              <span className="h-1.5 w-1.5 rounded-full bg-gold" /> קבוצה א׳
            </span>
            <PlayerSelect label="שחקן 1" value={home1} onChange={setHome1} options={players} />
            {mode === '2v2' && (
              <PlayerSelect label="שחקן 2" value={home2} onChange={setHome2} options={players} disabled={!home1} />
            )}
            <Input placeholder="שם קבוצה (אופציונלי)" value={homeTeamName} onChange={(e) => setHomeTeamName(e.target.value)} />
          </div>
          <div className="flex flex-col gap-3 rounded-[20px] border border-lines bg-raised/40 p-3">
            <span className="flex items-center gap-1.5 text-sm font-bold text-ink">
              <span className="h-1.5 w-1.5 rounded-full bg-ink-mid" /> קבוצה ב׳
            </span>
            <PlayerSelect label="שחקן 1" value={away1} onChange={setAway1} options={players} />
            {mode === '2v2' && (
              <PlayerSelect label="שחקן 2" value={away2} onChange={setAway2} options={players} disabled={!away1} />
            )}
            <Input placeholder="שם קבוצה (אופציונלי)" value={awayTeamName} onChange={(e) => setAwayTeamName(e.target.value)} />
          </div>
        </div>

        <div className="flex items-center justify-center gap-1 rounded-[20px] border border-lines bg-surface px-2 py-3 sm:justify-around sm:gap-4 sm:py-5">
          <ScoreInput label="קבוצה א׳" value={homeScore} onChange={setHomeScore} tone="home" />
          <span className="hidden text-2xl font-black text-ink-faint sm:inline">—</span>
          <ScoreInput label="קבוצה ב׳" value={awayScore} onChange={setAwayScore} tone="away" />
        </div>
      </div>

      {error && <p className="text-sm text-loss">{error}</p>}

      <Button onClick={handleSubmit} disabled={saving} size="lg" className="w-full">
        {saving ? 'שומר…' : 'שמור משחק'}
      </Button>
    </div>
  )
}