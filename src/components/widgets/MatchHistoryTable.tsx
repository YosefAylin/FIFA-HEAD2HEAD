'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { MatchResult } from '@/components/match/MatchResult'
import { restoreMatch, softDeleteMatch } from '@/lib/supabase/matches'
import type { MatchWithPlayers } from '@/lib/types/database'

interface Props {
  matches: MatchWithPlayers[]
  onChanged: () => void
  showDeleted?: boolean
}

/**
 * Match history as a stack of scoreboards (see MatchResult) with a quiet
 * delete/restore action. Grouped rows read like a results sheet, not a table.
 */
export function MatchHistoryTable({ matches, onChanged, showDeleted = false }: Props) {
  const [confirmId, setConfirmId] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  if (matches.length === 0) {
    return (
      <div className="panel flex items-center justify-center py-12 text-center text-ink-mid">
        אין משחקים{showDeleted ? ' למחוק' : ' עדיין'} — שחקו וצלמו!
      </div>
    )
  }

  async function handleDelete(id: string) {
    setBusy(true)
    try {
      await softDeleteMatch(id)
      onChanged()
    } finally {
      setBusy(false)
      setConfirmId(null)
    }
  }

  async function handleRestore(id: string) {
    setBusy(true)
    try {
      await restoreMatch(id)
      onChanged()
    } finally {
      setBusy(false)
    }
  }

  return (
    <ul className="flex flex-col gap-1.5">
      {matches.map((m) => (
        <li
          key={m.id}
          className={`rounded-[20px] border border-lines bg-surface px-4 py-3 transition-colors ${
            m.deleted_at ? 'opacity-50' : 'hover:bg-raised/40'
          }`}
        >
          <MatchResult match={m} showWeek />
          <div className="mt-2 flex justify-end">
            {m.deleted_at ? (
              <Button variant="outline" size="sm" onClick={() => void handleRestore(m.id)} disabled={busy}>
                שחזר משחק
              </Button>
            ) : confirmId === m.id ? (
              <div className="flex gap-2">
                <Button variant="destructive" size="sm" onClick={() => void handleDelete(m.id)} disabled={busy}>
                  בטוח?
                </Button>
                <Button variant="ghost" size="sm" onClick={() => setConfirmId(null)}>
                  ביטול
                </Button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setConfirmId(m.id)}
                className="rounded-full px-2 py-1 text-[11px] text-ink-faint transition-colors hover:bg-raised hover:text-loss"
              >
                מחק
              </button>
            )}
          </div>
        </li>
      ))}
    </ul>
  )
}