'use client'

import { useEffect, useState } from 'react'
import { UserPlus } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/input'
import { Modal } from '@/components/ui/Modal'
import { Avatar } from '@/components/ui/Avatar'
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

/**
 * Player picker per team slot: tap the row to open a full player-list popup
 * (photos, bigger tap targets) and pick one. Players already chosen for the
 * match are hidden from the popup so no one plays twice.
 */
function PlayerPick({
  label,
  value,
  onChange,
  options,
  taken,
  disabled,
}: {
  label: string
  value: string
  onChange: (id: string) => void
  options: Player[]
  /** Ids already picked for the other side — not offered back here. */
  taken: string[]
  disabled?: boolean
}) {
  const [open, setOpen] = useState(false)
  const selected = options.find((x) => x.id === value)
  // Every active player not already claimed for this match is a candidate.
  const available = options.filter((p) => !taken.includes(p.id) && p.is_active !== false)

  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen(true)}
        className={`flex min-h-[42px] w-full items-center gap-2 rounded-xl border px-2 py-2 text-sm font-semibold transition-colors ${
          selected
            ? 'border-accent/60 bg-accent/10 hover:border-accent'
            : 'border-dashed border-border bg-background text-muted-foreground hover:border-primary/50'
        }`}
      >
        {selected ? (
          <>
            <Avatar name={selected.name} src={selected.profile_picture_url} size="sm" />
            <span className="truncate">{selected.name}</span>
          </>
        ) : (
          <>
            <UserPlus className="h-4 w-4" />
            <span>בחר שחקן</span>
          </>
        )}
      </button>

      <Modal open={open} onClose={() => setOpen(false)} title={`${label} — בחר שחקן`}>
        <div className="max-h-[60vh] overflow-y-auto">
          {available.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">אין שחקנים זמינים לבחירה.</p>
          ) : (
            <div className="flex flex-col gap-1">
              {available.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => {
                    onChange(p.id)
                    setOpen(false)
                  }}
                  className="flex w-full items-center gap-3 rounded-xl px-2 py-2 text-right transition-colors hover:bg-muted"
                >
                  <Avatar name={p.name} src={p.profile_picture_url} size="sm" />
                  <span className="truncate font-medium">{p.name}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </Modal>
    </div>
  )
}

function ScoreInput({
  label,
  value,
  onChange,
}: {
  label: string
  value: number
  onChange: (v: number) => void
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
    <div className="flex flex-col items-center gap-1">
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
      <div className="flex items-center gap-1.5 sm:gap-2">
        <Button
          variant="outline"
          size="icon"
          className="h-10 w-10 shrink-0 sm:h-12 sm:w-12"
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
          className="h-12 min-w-0 w-10 rounded-lg border border-input bg-background text-center text-xl font-bold tabular-nums focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:w-14 sm:text-2xl"
        />
        <Button
          variant="outline"
          size="icon"
          className="h-10 w-10 shrink-0 sm:h-12 sm:w-12"
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
        <Button
          variant={mode === '1v1' ? 'primary' : 'outline'}
          size="sm"
          onClick={() => setMode('1v1')}
        >
          1 על 1
        </Button>
        <Button
          variant={mode === '2v2' ? 'primary' : 'outline'}
          size="sm"
          onClick={() => setMode('2v2')}
        >
          2 על 2
        </Button>
      </div>

      <div className="flex flex-col gap-2">
        <div className="grid grid-cols-2 gap-2">
          <div className="flex flex-col gap-1.5 rounded-xl border border-border bg-surface p-3">
            <span className="text-sm font-bold text-primary">קבוצה א׳</span>
            <PlayerPick
              label="שחקן 1"
              value={home1}
              onChange={setHome1}
              options={players}
              taken={[away1, away2, home2].filter(Boolean)}
            />
            {mode === '2v2' && (
              <PlayerPick
                label="שחקן 2"
                value={home2}
                onChange={setHome2}
                options={players}
                taken={[away1, away2, home1].filter(Boolean)}
                disabled={!home1}
              />
            )}
            <Input
              placeholder="שם קבוצה…"
              value={homeTeamName}
              onChange={(e) => setHomeTeamName(e.target.value)}
            />
          </div>
          <div className="flex flex-col gap-1.5 rounded-xl border border-border bg-surface p-3">
            <span className="text-sm font-bold text-destructive">קבוצה ב׳</span>
            <PlayerPick
              label="שחקן 1"
              value={away1}
              onChange={setAway1}
              options={players}
              taken={[home1, home2, away2].filter(Boolean)}
            />
            {mode === '2v2' && (
              <PlayerPick
                label="שחקן 2"
                value={away2}
                onChange={setAway2}
                options={players}
                taken={[home1, home2, away1].filter(Boolean)}
                disabled={!away1}
              />
            )}
            <Input
              placeholder="שם קבוצה…"
              value={awayTeamName}
              onChange={(e) => setAwayTeamName(e.target.value)}
            />
          </div>
        </div>

        <div className="flex items-center justify-center gap-1 rounded-xl border border-border bg-surface p-2 sm:justify-around sm:gap-4 sm:p-3">
          <ScoreInput label="קבוצה א׳" value={homeScore} onChange={setHomeScore} />
          <span className="hidden text-2xl font-black text-muted-foreground sm:inline">-</span>
          <ScoreInput label="קבוצה ב׳" value={awayScore} onChange={setAwayScore} />
        </div>
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <Button onClick={handleSubmit} disabled={saving} size="lg" className="w-full">
        {saving ? 'שומר…' : 'שמור משחק'}
      </Button>
    </div>
  )
}
