'use client'

import { useCallback, useEffect, useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Avatar } from '@/components/ui/Avatar'
import {
  fetchVoteResults,
  hasVotedToday,
  submitVote,
  subscribeToVotes,
} from '@/lib/supabase/survey'
import { getCurrentWeekKey } from '@/lib/utils/dateHelpers'
import type { Player, WhiskeyResult } from '@/lib/types/database'

export function WhiskeySurvey({ players }: { players: Player[] }) {
  const weekKey = getCurrentWeekKey()
  const [results, setResults] = useState<WhiskeyResult[]>([])
  const [votedAlready, setVotedAlready] = useState(false)
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState('')

  const load = useCallback(async () => {
    try {
      const [res, voted] = await Promise.all([fetchVoteResults(weekKey), hasVotedToday()])
      setResults(res)
      setVotedAlready(voted)
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
      setVotedAlready(true)
      setMessage('ההצבעה נקלטה! 🥃')
      await load()
    } catch (e) {
      setMessage(e instanceof Error ? e.message : 'שגיאה בהצבעה')
    }
  }

  const maxVotes = Math.max(1, ...results.map((r) => r.votes))

  return (
    <div className="flex flex-col gap-4 rounded-2xl border border-border bg-surface p-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold">מי מביא את הוויסקי? 🥃</h2>
        <span className="rounded-full bg-accent/15 px-2 py-0.5 text-xs text-accent">פעם ביום</span>
      </div>

      <div className="flex flex-col gap-3">
        {players.map((p) => {
          const res = results.find((r) => r.player_id === p.id)
          const votes = res?.votes ?? 0
          return (
            <div key={p.id} className="flex items-center gap-3">
              <Avatar name={p.name} src={p.profile_picture_url} size="sm" />
              <div className="flex-1">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium">{p.name}</span>
                  <span className="tabular-nums text-muted-foreground">{votes}</span>
                </div>
                <div className="mt-1 h-2 overflow-hidden rounded-full bg-background">
                  <div
                    className="h-full rounded-full bg-accent transition-all"
                    style={{ width: `${(votes / maxVotes) * 100}%` }}
                  />
                </div>
              </div>
              <Button
                variant={votes > 0 ? 'success' : 'outline'}
                size="sm"
                onClick={() => void handleVote(p.id)}
                disabled={votedAlready}
              >
                {votes > 0 ? '✓' : 'בחר'}
              </Button>
            </div>
          )
        })}
      </div>

      {votedAlready && (
        <p className="text-center text-sm text-muted-foreground">כבר הצבעתם היום 🙏 נצפה למחר</p>
      )}
      {message && !votedAlready && <p className="text-center text-sm text-primary">{message}</p>}
      {loading && <p className="text-center text-sm text-muted-foreground">טוען…</p>}
    </div>
  )
}
