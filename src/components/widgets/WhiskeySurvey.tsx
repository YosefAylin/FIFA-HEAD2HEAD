'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { Check, Crown, Wine } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import {
  fetchVoteResults,
  getMyVote,
  submitVote,
  subscribeToVotes,
} from '@/lib/supabase/survey'
import { useTournamentData } from '@/lib/supabase/useTournamentData'
import { useWhiskyExemptions } from '@/lib/supabase/useWhiskyExemptions'
import { formatDayKey, formatWeekKey, getCurrentWeekKey } from '@/lib/utils/dateHelpers'
import { avatarUrlFor } from '@/lib/utils/avatarHelpers'
import type { Player, WhiskeyResult } from '@/lib/types/database'

interface Row {
  p: Player
  votes: number
  isMyPick: boolean
}

/** Supabase throws plain PostgrestError objects, not Error instances. */
function errorText(e: unknown, fallback: string): string {
  if (e instanceof Error) return e.message
  if (e && typeof e === 'object' && 'message' in e) {
    const m = (e as { message: unknown }).message
    if (typeof m === 'string' && m) return m
  }
  return fallback
}

/** Photo-first player card that doubles as a vote button. */
function VoteCard({
  row,
  leader,
  maxVotes,
  index,
  onVote,
}: {
  row: Row
  leader: boolean
  maxVotes: number
  index: number
  onVote: (id: string) => void
}) {
  const { p, votes, isMyPick } = row
  const pct = (votes / maxVotes) * 100

  return (
    <button
      type="button"
      onClick={() => onVote(p.id)}
      aria-pressed={isMyPick}
      aria-label={`${p.name} — ${votes} הצבעות`}
      className={`rise-in group relative block w-full overflow-hidden rounded-2xl border-2 text-right shadow-sm transition-all duration-200 ${
        isMyPick
          ? 'border-success ring-4 ring-success/30'
          : leader
            ? 'border-accent ring-4 ring-accent/25 hover:-translate-y-0.5'
            : 'border-border hover:-translate-y-0.5 hover:border-accent/60 hover:shadow-lg'
      }`}
      style={{ '--i': index } as React.CSSProperties}
    >
      <div className="aspect-[3/4] w-full overflow-hidden bg-surface">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={avatarUrlFor({ name: p.name, profile_picture_url: p.profile_picture_url })}
          alt={p.name}
          draggable={false}
          loading="lazy"
          decoding="async"
          className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
        />
      </div>

      {/* Gradient scrim + name + vote bar */}
      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent px-3 pb-2 pt-10 text-white">
        <div className="flex items-center justify-between gap-2">
          <span className="flex min-w-0 items-center gap-1">
            <span className="truncate text-base font-extrabold leading-tight drop-shadow">{p.name}</span>
            {isMyPick && <Check className="h-4 w-4 shrink-0 text-success-foreground drop-shadow" />}
          </span>
          <span className="shrink-0 text-xl font-extrabold leading-none tabular-nums drop-shadow">{votes}</span>
        </div>
        <div className="mt-1 h-1 overflow-hidden rounded-full bg-white/25">
          <div
            className="h-full rounded-full bg-white transition-all duration-500"
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>

      {/* Leader crown */}
      {leader && (
        <span
          className="absolute start-2 top-2 grid h-8 w-8 place-items-center rounded-full bg-accent text-accent-foreground shadow-lg ring-2 ring-white/80"
          title={`מוביל — ${votes} הצבעות`}
        >
          <Crown className="h-4 w-4" />
        </span>
      )}

      {/* My-pick badge */}
      {isMyPick && (
        <span className="absolute end-2 top-2 grid h-8 w-8 place-items-center rounded-full bg-success text-success-foreground shadow-lg ring-2 ring-white/80">
          <Check className="h-4 w-4" />
        </span>
      )}

      {/* Vote count pill when there are votes */}
      {!isMyPick && votes > 0 && (
        <span className="absolute end-2 top-2 rounded-full bg-black/55 px-2 py-0.5 text-xs font-bold tabular-nums text-white ring-2 ring-white/40">
          {votes}
        </span>
      )}
    </button>
  )
}

export function WhiskeySurvey({ players }: { players: Player[] }) {
  const weekKey = getCurrentWeekKey()
  const { matches } = useTournamentData()
  const exemptions = useWhiskyExemptions(weekKey, players, matches)
  const [results, setResults] = useState<WhiskeyResult[]>([])
  const [myVote, setMyVote] = useState<WhiskeyResult | null>(null)
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState('')

  const load = useCallback(async () => {
    try {
      const [res, vote] = await Promise.all([fetchVoteResults(weekKey), getMyVote(weekKey)])
      setResults(res)
      setMyVote(vote)
    } catch (e) {
      setMessage(errorText(e, 'שגיאה בטעינת סקר'))
    } finally {
      setLoading(false)
    }
  }, [weekKey])

  useEffect(() => {
    void load()
    const unsub = subscribeToVotes(() => void load())
    return unsub
  }, [load])

  // Transient confirmation/error message — clear itself so it doesn't linger.
  useEffect(() => {
    if (!message) return
    const t = window.setTimeout(() => setMessage(''), 2500)
    return () => window.clearTimeout(t)
  }, [message])

  async function handleVote(playerId: string) {
    setMessage('')
    try {
      await submitVote(playerId, weekKey)
      setMessage('ההצבעה נקלטה! 🥃')
      await load()
    } catch (e) {
      setMessage(errorText(e, 'שגיאה בהצבעה'))
    }
  }

  // The poll board: regulars only (guests never carry the whisky, inactive
  // players and this week's exempt players are out), ranked by votes.
  const rows = useMemo<Row[]>(() => {
    const counts = new Map(results.map((r) => [r.player_id, r.votes]))
    return players
      .filter(
        (p) => p.is_active !== false && p.is_guest !== true && !exemptions.exemptIds.has(p.id)
      )
      .map((p) => ({
        p,
        votes: counts.get(p.id) ?? 0,
        isMyPick: myVote?.player_id === p.id,
      }))
      .sort((a, b) => b.votes - a.votes || a.p.name.localeCompare(b.p.name))
  }, [players, results, myVote, exemptions.exemptIds])

  const exemptPlayers = useMemo(
    () => players.filter((p) => exemptions.exemptIds.has(p.id)),
    [players, exemptions.exemptIds]
  )
  const eligibleIds = useMemo(() => new Set(rows.map((r) => r.p.id)), [rows])
  const totalVotes = results
    .filter((r) => eligibleIds.has(r.player_id))
    .reduce((s, r) => s + r.votes, 0)
  const maxVotes = Math.max(1, ...rows.map((r) => r.votes))

  return (
    <div className="flex flex-col gap-4">
      {/* Poll hero */}
      <div className="rise-in relative overflow-hidden rounded-3xl border border-accent/40 bg-gradient-to-br from-accent/20 via-accent/5 to-primary/10 p-5">
        <div className="shine-sweep pointer-events-none absolute inset-y-0 start-1/4 w-1/4 bg-gradient-to-r from-transparent via-white/15 to-transparent" />
        <div className="relative flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-accent/20 text-accent">
              <Wine className="h-7 w-7" />
            </span>
            <div>
              <h2 className="text-xl font-extrabold leading-tight">מי מביא את הוויסקי?</h2>
              <p className="text-xs text-muted-foreground">{formatWeekKey(weekKey)} · פעם בשבוע</p>
            </div>
          </div>
          <div className="shrink-0 text-center">
            <p className="text-2xl font-extrabold leading-none tabular-nums">{totalVotes}</p>
            <p className="mt-0.5 text-[10px] text-muted-foreground">הצבעות</p>
          </div>
        </div>
        <p className="relative mt-3 text-xs text-muted-foreground">הקישו על שחקן כדי לבחור בו</p>
      </div>

      {/* Player grid — tap a card to vote */}
      {rows.length === 0 ? (
        <p className="rounded-xl border border-dashed border-border bg-surface py-8 text-center text-muted-foreground">
          כולם בפטור — אין על מי להצביע 🥃
        </p>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {rows.map((row, i) => (
            <VoteCard
              key={row.p.id}
              row={row}
              index={i}
              maxVotes={maxVotes}
              leader={row.votes > 0 && row.votes === maxVotes}
              onVote={(id) => void handleVote(id)}
            />
          ))}
        </div>
      )}

      {exemptPlayers.length > 0 && (
        <div className="rounded-2xl border border-dashed border-border bg-surface/60 p-3">
          <p className="mb-1.5 text-xs font-semibold text-muted-foreground">פטור מהוויסקי</p>
          <ul className="flex flex-col gap-1.5">
            {exemptPlayers.map((p) => {
              const auto = exemptions.isAuto(p.id)
              return (
                <li key={p.id} className="flex items-center justify-between gap-2">
                  <span className="flex min-w-0 items-center gap-2">
                    <span className="truncate text-sm font-semibold">{p.name}</span>
                    {auto && (
                      <span
                        className="shrink-0 rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground"
                        title={
                          exemptions.autoLoser
                            ? `מקום אחרון · ${formatDayKey(exemptions.autoLoser.dayKey)}`
                            : 'מקום אחרון'
                        }
                      >
                        מקום אחרון
                      </span>
                    )}
                  </span>
                  {!auto && (
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 px-2 text-[11px] text-muted-foreground"
                      onClick={() => void exemptions.toggle(p.id, false)}
                    >
                      בטל פטור
                    </Button>
                  )}
                </li>
              )
            })}
          </ul>
        </div>
      )}

      {myVote && (
        <p className="text-center text-xs text-muted-foreground">
          הבחירה שלך: <span className="font-semibold text-foreground">{myVote.player_name}</span>
          {exemptions.exemptIds.has(myVote.player_id) ? ' · פטור השבוע' : ' · ניתן לשנות במהלך השבוע'}
        </p>
      )}
      {message && <p className="text-center text-sm font-medium text-primary">{message}</p>}
      {loading && <p className="text-center text-sm text-muted-foreground">טוען…</p>}
    </div>
  )
}
