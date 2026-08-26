'use client'

import { useCallback, useEffect, useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Avatar } from '@/components/ui/Avatar'
import {
  fetchVoteResults,
  getMyVote,
  submitVote,
  subscribeToVotes,
} from '@/lib/supabase/survey'
import { getCurrentWeekKey } from '@/lib/utils/dateHelpers'
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

  const maxVotes = Math.max(1, ...results.map((r) => r.votes))

  return (
    <section className="panel flex flex-col gap-4 p-4 sm:p-5">
      <header className="flex items-center justify-between">
        <h2 className="flex items-center gap-2 text-lg font-black tracking-tight text-ink">
          🥃 מי מביא את הוויסקי?
        </h2>
        <span className="rounded-full bg-gold/12 px-2.5 py-1 text-xs font-medium text-gold">החוזה השבועי</span>
      </header>

      <ul className="flex flex-col gap-1">
        {players.map((p) => {
          const res = results.find((r) => r.player_id === p.id)
          const votes = res?.votes ?? 0
          const isLeader = votes > 0 && votes === maxVotes
          const isMyPick = myVote?.player_id === p.id
          return (
            <li
              key={p.id}
              className={`flex items-center gap-3 rounded-2xl px-3 py-2.5 transition-colors ${
                isMyPick ? 'bg-gold/8 ring-1 ring-gold/30' : 'hover:bg-raised/50'
              }`}
            >
              <Avatar name={p.name} src={p.profile_picture_url} size="sm" />
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2 text-sm">
                  <span className="truncate font-medium text-ink">
                    {p.name}
                    {isMyPick && <span className="mr-1 text-gold">· הבחירה שלך</span>}
                  </span>
                  <span className="flex items-center gap-1.5 tabular-nums text-ink-mid">
                    {isLeader && <span className="text-[11px] font-bold text-gold">מוביל</span>}
                    {votes}
                  </span>
                </div>
                <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-raised">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${
                      isLeader ? 'bg-gold' : 'bg-gold/35'
                    }`}
                    style={{ width: `${(votes / maxVotes) * 100}%` }}
                  />
                </div>
              </div>
              <Button
                variant={isMyPick ? 'success' : 'outline'}
                size="sm"
                className="shrink-0"
                onClick={() => void handleVote(p.id)}
              >
                {isMyPick ? '✓' : 'בחר'}
              </Button>
            </li>
          )
        })}
      </ul>

      {myVote && <p className="text-center text-xs text-ink-mid">ניתן לשנות את ההצבעה במהלך השבוע</p>}
      {message && (
        <p className={`text-center text-sm ${message.includes('שגיאה') ? 'text-loss' : 'text-gold'}`}>{message}</p>
      )}
      {loading && <p className="text-center text-sm text-ink-mid">טוען…</p>}
    </section>
  )
}