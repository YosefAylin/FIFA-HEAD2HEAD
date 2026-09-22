'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { Check, Crown, Wine } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Avatar } from '@/components/ui/Avatar'
import {
  fetchVoteResults,
  getMyVote,
  submitVote,
  subscribeToVotes,
} from '@/lib/supabase/survey'
import { formatWeekKey, getCurrentWeekKey } from '@/lib/utils/dateHelpers'
import type { Player, WhiskeyResult } from '@/lib/types/database'

export function WhiskeySurvey({ players }: { players: Player[] }) {
  const weekKey = getCurrentWeekKey()
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
      setMessage(e instanceof Error ? e.message : 'שגיאה בטעינת סקר')
    } finally {
      setLoading(false)
    }
  }, [weekKey])

  useEffect(() => {
    void load()
    const unsub = subscribeToVotes(() => void load())
    return unsub
  }, [load])

  async function handleVote(playerId: string) {
    setMessage('')
    try {
      await submitVote(playerId, weekKey)
      setMessage('ההצבעה נקלטה! 🥃')
      await load()
    } catch (e) {
      setMessage(e instanceof Error ? e.message : 'שגיאה בהצבעה')
    }
  }

  // The poll board: active players first, then ranked by votes, name as the
  // final tiebreak. Inactive players sink, greyed out and unvotable.
  const rows = useMemo(() => {
    const counts = new Map(results.map((r) => [r.player_id, r.votes]))
    return players
      .map((p) => ({
        p,
        votes: counts.get(p.id) ?? 0,
        inactive: p.is_active === false,
        isMyPick: myVote?.player_id === p.id,
      }))
      .sort(
        (a, b) =>
          (a.inactive ? 1 : 0) - (b.inactive ? 1 : 0) ||
          b.votes - a.votes ||
          a.p.name.localeCompare(b.p.name)
      )
  }, [players, results, myVote])

  const totalVotes = results.reduce((s, r) => s + r.votes, 0)
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
        {myVote && (
          <p className="relative mt-3 inline-flex items-center gap-1 rounded-full bg-success/15 px-3 py-1 text-xs font-semibold text-success">
            <Check className="h-3.5 w-3.5" /> הבחירה שלך: {myVote.player_name}
          </p>
        )}
      </div>

      {/* Ballot */}
      <div className="grid grid-cols-1 gap-2">
        {rows.map(({ p, votes, inactive, isMyPick }, i) => {
          const leader = votes > 0 && votes === maxVotes
          const pct = (votes / maxVotes) * 100
          return (
            <div
              key={p.id}
              className={`rise-in flex items-center gap-3 rounded-2xl border p-3 transition-all duration-200 ${
                isMyPick
                  ? 'border-success/50 bg-success/10'
                  : leader
                    ? 'border-accent/50 bg-accent/5'
                    : 'border-border bg-surface hover:border-primary/40 hover:shadow-sm'
              } ${inactive ? 'opacity-45 grayscale' : ''}`}
              style={{ '--i': i } as React.CSSProperties}
            >
              <span className="flex w-7 shrink-0 items-center justify-center">
                {leader ? (
                  <Crown className="h-5 w-5 text-accent" />
                ) : (
                  <span className="text-sm font-bold tabular-nums text-muted-foreground">{i + 1}</span>
                )}
              </span>
              <Avatar name={p.name} src={p.profile_picture_url} size="sm" />
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <span className="flex min-w-0 items-center gap-1.5">
                    <span className="truncate text-sm font-bold">{p.name}</span>
                    {isMyPick && <Check className="h-3.5 w-3.5 shrink-0 text-success" />}
                    {inactive && <span className="shrink-0 text-[10px] text-muted-foreground">לא פעיל</span>}
                  </span>
                  <span className="shrink-0 text-lg font-extrabold leading-none tabular-nums">{votes}</span>
                </div>
                <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-muted">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${isMyPick ? 'bg-success' : 'bg-accent'}`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>
              <Button
                variant={isMyPick ? 'success' : 'outline'}
                size="sm"
                disabled={inactive}
                onClick={() => void handleVote(p.id)}
              >
                {isMyPick ? <Check className="h-4 w-4" /> : 'בחר'}
              </Button>
            </div>
          )
        })}
      </div>

      {myVote && (
        <p className="text-center text-xs text-muted-foreground">ניתן לשנות את ההצבעה במהלך השבוע</p>
      )}
      {message && <p className="text-center text-sm font-medium text-primary">{message}</p>}
      {loading && <p className="text-center text-sm text-muted-foreground">טוען…</p>}
    </div>
  )
}
