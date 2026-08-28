'use client'

import { useCallback, useEffect, useState } from 'react'
import { Check } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Avatar } from '@/components/ui/Avatar'
import {
  fetchVoteResults,
  getMyVote,
  submitVote,
  subscribeToVotes,
} from '@/lib/supabase/survey'
import { getCurrentWeekKey } from '@/lib/utils/dateHelpers'
import { activeFirst } from '@/lib/utils/sortHelpers'
import type { Player, WhiskeyResult } from '@/lib/types/database'

export function WhiskeySurvey({ players }: { players: Player[] }) {
  const weekKey = getCurrentWeekKey()
  // Active players first; inactive ones sink to the bottom, greyed out.
  const ordered = [...players].sort((a, b) => activeFirst(a, b))
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
    <div className="flex flex-col gap-4 rounded-2xl border border-border bg-surface p-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold">מי מביא את הוויסקי? 🥃</h2>
        <span className="rounded-full bg-accent/15 px-2 py-0.5 text-xs text-accent">פעם בשבוע</span>
      </div>

      <div className="flex flex-col gap-3">
        {ordered.map((p) => {
          const res = results.find((r) => r.player_id === p.id)
          const votes = res?.votes ?? 0
          const isMyPick = myVote?.player_id === p.id
          const inactive = p.is_active === false
          return (
            <div
              key={p.id}
              className={`flex items-center gap-3 ${inactive ? 'opacity-45 grayscale' : ''}`}
            >
              <Avatar name={p.name} src={p.profile_picture_url} size="sm" />
              <div className="flex-1">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium">
                    {p.name}
                    {isMyPick && <span className="mr-1 text-accent">· הבחירה שלך</span>}
                    {inactive && <span className="mr-1 text-muted-foreground">· לא פעיל</span>}
                  </span>
                  <span className="tabular-nums text-muted-foreground">{votes}</span>
                </div>
                <div className="mt-1 h-2 overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-accent transition-all"
                    style={{ width: `${(votes / maxVotes) * 100}%` }}
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

      {myVote && <p className="text-center text-sm text-muted-foreground">ניתן לשנות את ההצבעה בזמן השבוע</p>}
      {message && <p className="text-center text-sm text-primary">{message}</p>}
      {loading && <p className="text-center text-sm text-muted-foreground">טוען…</p>}
    </div>
  )
}
