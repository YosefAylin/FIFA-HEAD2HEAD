'use client'

import { useState } from 'react'
import { UserPlus, Check } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { Avatar } from '@/components/ui/Avatar'
import { avatarUrlFor } from '@/lib/utils/avatarHelpers'
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

/** Photo-first selector tile, matching the home roster card look. */
function PickCard({
  player,
  selected,
  onClick,
}: {
  player: Player
  selected: boolean
  onClick: () => void
}) {
  const inactive = player.is_active === false
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={player.name}
      className={`group relative block w-full overflow-hidden rounded-2xl border-2 text-right shadow-sm transition-all ${
        inactive ? 'opacity-45 grayscale' : ''
      } ${
        selected ? 'border-accent ring-4 ring-accent/30' : 'border-border hover:-translate-y-0.5 hover:border-primary/50'
      }`}
    >
      {/* The whole tile is the picture */}
      <div className="aspect-[3/4] w-full overflow-hidden bg-surface">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={avatarUrlFor({ name: player.name, profile_picture_url: player.profile_picture_url })}
          alt={player.name}
          draggable={false}
          className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
        />
      </div>
      {/* Gradient scrim + name overlay */}
      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/75 via-black/35 to-transparent px-2 pb-1.5 pt-10 text-right text-white">
        <span className="block truncate text-sm font-extrabold drop-shadow">{player.name}</span>
      </div>
      {selected && (
        <span className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full bg-accent text-white shadow ring-2 ring-white/80">
          <Check className="h-4 w-4" />
        </span>
      )}
      {inactive && (
        <span className="absolute left-1/2 top-2 -translate-x-1/2 rounded-full bg-black/55 px-2 py-0.5 text-[10px] font-semibold text-white/90">
          לא פעיל
        </span>
      )}
    </button>
  )
}
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
  // Every player not already claimed for this match is a candidate (inactive
  // still listed, just greyed out — consistent with the roster grid).
  const available = options.filter((p) => !taken.includes(p.id))

  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen(true)}
        className={`flex min-h-[56px] w-full items-center gap-3 rounded-xl border px-2.5 py-2 transition-colors ${
          selected
            ? 'border-accent/70 bg-accent/10 hover:border-accent'
            : 'border-dashed border-border bg-background text-muted-foreground hover:border-primary/50'
        } ${disabled ? 'cursor-not-allowed opacity-50' : ''}`}
      >
        {selected ? (
          <>
            <Avatar name={selected.name} src={selected.profile_picture_url} size="lg" />
            <span className="truncate text-base font-bold text-foreground">{selected.name}</span>
          </>
        ) : (
          <>
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground">
              <UserPlus className="h-5 w-5" />
            </span>
            <span className="text-sm font-semibold">בחר שחקן</span>
          </>
        )}
      </button>

      <Modal open={open} onClose={() => setOpen(false)} title={`${label} — בחר שחקן`}>
        <div className="max-h-[60vh] overflow-y-auto">
          {available.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">אין שחקנים זמינים לבחירה.</p>
          ) : (
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
              {available.map((p) => (
                <PickCard
                  key={p.id}
                  player={p}
                  selected={p.id === value}
                  onClick={() => {
                    onChange(p.id)
                    setOpen(false)
                  }}
                />
              ))}
            </div>
          )}
        </div>
      </Modal>
    </div>
  )
}

/**
 * Big vertical score stepper, read-only value — scores only change via the
 * + / − buttons (no keyboard input). One sits under each team column so
 * scoring is a thumb reach to either side of the phone.
 */
function ScoreInput({
  value,
  onChange,
}: {
  value: number
  onChange: (v: number) => void
}) {
  return (
    <div className="flex flex-col items-center gap-1.5">
      <Button
        variant="outline"
        size="icon"
        className="h-12 w-12 shrink-0 rounded-xl text-2xl font-bold leading-none"
        onClick={() => onChange(value + 1)}
        aria-label="הוסף שער"
      >
        +
      </Button>
      <div
        role="status"
        aria-live="polite"
        className="flex h-14 w-14 items-center justify-center rounded-xl border-2 border-accent/40 bg-background text-3xl font-black tabular-nums text-foreground"
      >
        {value}
      </div>
      <Button
        variant="outline"
        size="icon"
        className="h-12 w-12 shrink-0 rounded-xl text-2xl font-bold leading-none"
        onClick={() => onChange(Math.max(0, value - 1))}
        aria-label="החסר שער"
      >
        −
      </Button>
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

      <div className="grid grid-cols-2 gap-2">
        {/* קבוצה א׳: players → tiny optional name → big vertical score */}
        <div className="flex flex-col gap-2 rounded-xl border border-border bg-surface p-3">
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
          {/*
            Optional team name — deliberately tiny so it never competes with the
            score. Leaving it empty is the common case.
          */}
          <input
            value={homeTeamName}
            onChange={(e) => setHomeTeamName(e.target.value)}
            placeholder="שם…"
            maxLength={24}
            className="h-7 min-w-0 w-full rounded-md border border-input/70 bg-background px-2 text-[11px] font-medium text-muted-foreground placeholder:text-muted-foreground/50 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          />
          <div className="mt-auto flex flex-col items-center gap-1 border-t border-border/60 pt-2">
            <ScoreInput value={homeScore} onChange={setHomeScore} />
          </div>
        </div>

        {/* קבוצה ב׳ — symmetric */}
        <div className="flex flex-col gap-2 rounded-xl border border-border bg-surface p-3">
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
          <input
            value={awayTeamName}
            onChange={(e) => setAwayTeamName(e.target.value)}
            placeholder="שם…"
            maxLength={24}
            className="h-7 min-w-0 w-full rounded-md border border-input/70 bg-background px-2 text-[11px] font-medium text-muted-foreground placeholder:text-muted-foreground/50 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          />
          <div className="mt-auto flex flex-col items-center gap-1 border-t border-border/60 pt-2">
            <ScoreInput value={awayScore} onChange={setAwayScore} />
          </div>
        </div>
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <Button onClick={handleSubmit} disabled={saving} size="lg" className="w-full">
        {saving ? 'שומר…' : 'שמור משחק'}
      </Button>
    </div>
  )
}
