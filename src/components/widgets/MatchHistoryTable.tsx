'use client'

import { useMemo, useState } from 'react'
import { CalendarDays, RotateCcw, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { restoreMatch, softDeleteMatch } from '@/lib/supabase/matches'
import { formatDayKey, matchDayKey } from '@/lib/utils/dateHelpers'
import { avatarUrlFor } from '@/lib/utils/avatarHelpers'
import type { MatchWithPlayers } from '@/lib/types/database'

interface Props {
  matches: MatchWithPlayers[]
  onChanged: () => void
  showDeleted?: boolean
}

interface SidePlayer {
  name: string
  avatar: string | null
}

interface Side {
  players: SidePlayer[]
  score: number
  teamName: string | null
}

function toSide(
  names: (string | null)[],
  avatars: (string | null)[],
  score: number,
  teamName: string | null
): Side {
  // 1v1 has a null second slot — drop it so no phantom blank avatar renders.
  const players = names
    .map((name, i) => ({ name, avatar: avatars[i] ?? null }))
    .filter((p): p is SidePlayer => Boolean(p.name))
  return { players, score, teamName }
}

/**
 * One competitor block: a fitted portrait photo card (not stretched edge-to-edge,
 * not circular). 1v1 = one photo; 2v2 = two photos side by side. Name sits on a
 * scrim along the bottom; the score lives in the blank zone between the blocks.
 */
function PhotoBlock({ side, won, dimmed }: { side: Side; won: boolean; dimmed: boolean }) {
  const multi = side.players.length > 1
  return (
    <div
      className={`relative w-full overflow-hidden rounded-2xl bg-surface shadow-sm transition-opacity ${
        dimmed ? 'opacity-60' : ''
      } ${won ? 'ring-2 ring-success/60' : 'ring-1 ring-border'}`}
    >
      <div className={`grid aspect-[4/3] w-full ${multi ? 'grid-cols-2' : 'grid-cols-1'}`}>
        {side.players.map((p) => (
          <div key={p.name} className="relative h-full w-full overflow-hidden">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={avatarUrlFor({ name: p.name, profile_picture_url: p.avatar })}
              alt={p.name}
              draggable={false}
              className="h-full w-full object-cover"
            />
          </div>
        ))}
      </div>
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/75 via-black/10 to-transparent" />
      <div className="absolute inset-x-0 bottom-0 flex items-end gap-1 p-2 text-white">
        <p className={`truncate text-xs leading-tight ${won ? 'font-extrabold' : 'font-medium'}`}>
          {side.players.map((p) => p.name).join(' & ')}
        </p>
      </div>
      {side.teamName && (
        <span className="absolute end-1.5 top-1.5 max-w-[80%] truncate rounded-full bg-black/45 px-1.5 py-0.5 text-[9px] text-white backdrop-blur-sm">
          {side.teamName}
        </span>
      )}
    </div>
  )
}

function MatchCard({
  match,
  index,
  confirmId,
  setConfirmId,
  busy,
  onDelete,
  onRestore,
}: {
  match: MatchWithPlayers
  index: number
  confirmId: string | null
  setConfirmId: (id: string | null) => void
  busy: boolean
  onDelete: (id: string) => void
  onRestore: (id: string) => void
}) {
  const home = toSide(
    [match.home_player_1_name, match.home_player_2_name],
    [match.home_player_1_avatar_url, match.home_player_2_avatar_url],
    match.home_score,
    match.home_team_name
  )
  const away = toSide(
    [match.away_player_1_name, match.away_player_2_name],
    [match.away_player_1_avatar_url, match.away_player_2_avatar_url],
    match.away_score,
    match.away_team_name
  )
  const homeWon = match.home_score > match.away_score
  const awayWon = match.away_score > match.home_score
  const deleted = Boolean(match.deleted_at)

  return (
    <li
      className={`rise-in relative overflow-hidden rounded-3xl border bg-surface transition-all duration-200 hover:shadow-lg ${
        deleted ? 'border-dashed border-border opacity-70' : 'border-border hover:border-primary/40'
      }`}
      style={{ '--i': index } as React.CSSProperties}
    >
      <div className="flex items-center justify-between px-2 pt-2 text-[10px] text-muted-foreground">
        <span className="rounded-full bg-muted px-1.5 py-0.5 font-medium">
          {match.game_mode === '2v2' ? '2 על 2' : '1 על 1'}
        </span>
        {deleted && (
          <span className="rounded-full bg-destructive/10 px-1.5 py-0.5 font-medium text-destructive">נמחק</span>
        )}
      </div>

      {/* Vertical card: home photo, blank score zone, away photo */}
      <div className="flex flex-col items-center gap-1.5 p-2">
        <PhotoBlock side={home} won={homeWon} dimmed={awayWon} />

        <div className="flex w-full items-center justify-center gap-2 text-center">
          <span
            className={`text-2xl font-extrabold leading-none tabular-nums ${
              homeWon ? 'text-success' : 'text-foreground/80'
            }`}
          >
            {home.score}
          </span>
          <span className="text-lg font-bold text-muted-foreground/40">:</span>
          <span
            className={`text-2xl font-extrabold leading-none tabular-nums ${
              awayWon ? 'text-success' : 'text-foreground/80'
            }`}
          >
            {away.score}
          </span>
        </div>

        <PhotoBlock side={away} won={awayWon} dimmed={homeWon} />
      </div>

      <div className="relative flex items-center justify-end border-t border-border/60 px-2 py-1">
        {deleted ? (
          <Button variant="ghost" size="sm" onClick={() => onRestore(match.id)} disabled={busy}>
            <RotateCcw className="h-3.5 w-3.5" /> שחזר
          </Button>
        ) : confirmId === match.id ? (
          <div className="flex gap-1">
            <Button variant="destructive" size="sm" onClick={() => onDelete(match.id)} disabled={busy}>
              למחוק?
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setConfirmId(null)}>
              ביטול
            </Button>
          </div>
        ) : (
          <Button variant="ghost" size="sm" onClick={() => setConfirmId(match.id)} className="text-muted-foreground hover:text-destructive">
            <Trash2 className="h-3.5 w-3.5" /> מחק
          </Button>
        )}
      </div>
    </li>
  )
}

/**
 * Match history as a day-grouped timeline. Each tournament day gets a header
 * (date + match/goal count) and its matches as score-forward cards with the
 * winner highlighted. Soft-deleted matches render dashed with a restore action.
 */
export function MatchHistoryTable({ matches, onChanged, showDeleted = false }: Props) {
  const [confirmId, setConfirmId] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const groups = useMemo(() => {
    const map = new Map<string, MatchWithPlayers[]>()
    for (const m of matches) {
      const key = matchDayKey(m.created_at)
      const list = map.get(key)
      if (list) list.push(m)
      else map.set(key, [m])
    }
    return [...map.entries()]
      .map(([dayKey, list]) => ({
        dayKey,
        list,
        goals: list.reduce((s, m) => s + m.home_score + m.away_score, 0),
      }))
      .sort((a, b) => b.dayKey.localeCompare(a.dayKey))
  }, [matches])

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

  if (matches.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-border bg-surface/50 py-12 text-center">
        <p className="text-3xl">⚽</p>
        <p className="mt-2 text-sm text-muted-foreground">
          {showDeleted ? 'אין משחקים שנמחקו' : 'אין משחקים עדיין — שחקו וצלמו!'}
        </p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6">
      {groups.map((group, gi) => (
        <section key={group.dayKey} className="flex flex-col gap-2">
          <header className="flex items-center justify-between gap-2 px-1">
            <h3 className="flex items-center gap-1.5 text-sm font-bold">
              <CalendarDays className="h-4 w-4 text-primary" />
              {formatDayKey(group.dayKey)}
            </h3>
            <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
              {group.list.length} משחקים · {group.goals} שערים
            </span>
          </header>
          <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
            {group.list.map((m, i) => (
              <MatchCard
                key={m.id}
                match={m}
                index={gi === 0 ? i : 0}
                confirmId={confirmId}
                setConfirmId={setConfirmId}
                busy={busy}
                onDelete={handleDelete}
                onRestore={handleRestore}
              />
            ))}
          </ul>
        </section>
      ))}
    </div>
  )
}
