'use client'

import { avatarUrlFor } from '@/lib/utils/avatarHelpers'
import { useRosterSettings } from '@/lib/supabase/useRosterSettings'
import type { FunBadge } from '@/lib/supabase/stats'
import type { Player } from '@/lib/types/database'

interface Props {
  player: Player
  rank: number
  badge: FunBadge | null
  onClick: () => void
  /** Set to the player's 1..4 selection order while building a match. */
  selectOrder?: number
  selecting: boolean
}

const MEDALS = ['🥇', '🥈', '🥉']

/**
 * Big photo-first player card for the home roster: the whole card is the
 * picture (name + rank overlaid). Acts as a button — in normal mode it opens
 * the player's action sheet; during match selection it toggles selection and
 * shows the team order (first two = קבוצה א׳, next two = קבוצה ב׳).
 */
export function PlayerCard({ player, rank, badge, onClick, selectOrder, selecting }: Props) {
  const { nicknameFor } = useRosterSettings()
  const nickname = nicknameFor(player.name)
  const inactive = player.is_active === false
  const order = selectOrder ?? null
  const team = order !== null ? (order <= 2 ? 'א' : 'ב') : null

  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={inactive ? `${player.name} (לא פעיל)` : player.name}
      className={`group relative block w-full overflow-hidden rounded-2xl border-2 text-right shadow-sm transition-all ${
        inactive ? 'opacity-45 grayscale' : ''
      } ${
        order !== null
          ? 'border-accent ring-4 ring-accent/30'
          : selecting
            ? 'border-border'
            : 'border-border hover:-translate-y-0.5 hover:border-primary/50 hover:shadow-lg'
      }`}
    >
      {/* The whole card is the picture */}
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
      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/75 via-black/35 to-transparent px-3 pb-2 pt-12 text-white">
        <div className="flex items-baseline gap-2">
          <span className="truncate text-lg font-extrabold leading-tight drop-shadow">{player.name}</span>
          {nickname && <span className="truncate text-xs text-white/80">· {nickname}</span>}
        </div>
        {badge && (
          <span className="mt-1 inline-flex items-center gap-1 rounded-full bg-black/45 px-2 py-0.5 text-[11px] font-medium text-white/90">
            <span>{badge.emoji}</span>
            <span>{badge.title}</span>
          </span>
        )}
      </div>

      {/* Rank medal */}
      {rank <= 3 && (
        <span className="absolute left-2 top-2 text-3xl drop-shadow" title={`מקום ${rank}`}>
          {MEDALS[rank - 1]}
        </span>
      )}

      {/* Inactive chip */}
      {inactive && (
        <span className="absolute left-1/2 top-2 -translate-x-1/2 rounded-full bg-black/55 px-2 py-0.5 text-[10px] font-semibold text-white/90">
          לא פעיל 🔕
        </span>
      )}

      {/* Selection order badge / "+" affordance */}
      {order !== null ? (
        <span className="absolute right-2 top-2 flex h-10 w-10 items-center justify-center rounded-full bg-accent text-sm font-extrabold text-white shadow-lg ring-2 ring-white/80">
          {team}
          {order}
        </span>
      ) : (
        selecting && (
          <span className="absolute right-2 top-2 flex h-8 w-8 items-center justify-center rounded-full bg-black/40 text-lg font-bold text-white ring-2 ring-white/60 backdrop-blur-sm">
            +
          </span>
        )
      )}
    </button>
  )
}