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

/**
 * The club's player card — the ONE visual concept preserved from the original:
 * a portrait contained inside a designed player box, identity bound to the
 * image. Redesigned around it: 3:4 portrait tile, gold rank tab, division
 * hairlines, inline stats dock. The whole card is a button.
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
      className={`group relative block w-full overflow-hidden rounded-[20px] border bg-surface text-right transition-all duration-200 ${
        inactive ? 'opacity-45 grayscale' : ''
      } ${
        order !== null
          ? 'border-gold'
          : selecting
            ? 'border-lines'
            : 'border-lines hover:-translate-y-0.5 hover:border-gold/60'
      }`}
    >
      {/* Portrait tile — the photograph carries the identity */}
      <div className="relative aspect-[3/4] w-full overflow-hidden bg-raised">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={avatarUrlFor({ name: player.name, profile_picture_url: player.profile_picture_url })}
          alt={player.name}
          draggable={false}
          className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.02]"
        />

        {/* Rank tab — gold for 1st..3rd, quiet for the rest */}
        <span
          className={`absolute right-0 top-0 flex h-8 min-w-8 items-center justify-between gap-1 rounded-bl-[14px] px-2 text-[15px] font-extrabold leading-none shadow-[0_2px_8px_rgba(0,0,0,0.35)] ${
            rank <= 3 ? 'bg-gold text-gold-ink' : 'bg-black/55 text-ink'
          }`}
          title={rank <= 3 ? 'מקום ' + rank : ''}
        >
          {rank <= 3 ? ['🥇', '🥈', '🥉'][rank - 1] : rank}
        </span>

        {/* Inactive chip */}
        {inactive && (
          <span className="absolute left-1/2 top-2 -translate-x-1/2 rounded-full bg-black/55 px-2 py-0.5 text-[10px] font-semibold text-ink">
            לא פעיל
          </span>
        )}

        {/* In-form accent — semantic, never color-only */}
        {rank === 1 && (
          <span className="absolute inset-x-0 bottom-0 h-[3px] bg-gold" aria-hidden="true" />
        )}

        {/* Selection badge */}
        {order !== null ? (
          <span className="absolute left-2 top-2 flex h-10 w-10 items-center justify-center rounded-full bg-gold text-sm font-extrabold text-gold-ink shadow-lg ring-2 ring-pitch">
            {team}
            {order}
          </span>
        ) : (
          selecting && (
            <span className="absolute left-2 top-2 flex h-9 w-9 items-center justify-center rounded-full bg-pitch/70 text-lg font-bold text-ink ring-1 ring-lines backdrop-blur-sm">
              +
            </span>
          )
        )}
      </div>

      {/* Identity + quick form line */}
      <div className="px-3 pb-3 pt-2">
        <div className="flex items-baseline gap-1.5">
          <span className="truncate text-[15px] font-bold leading-tight text-ink">{player.name}</span>
          {nickname && <span className="truncate text-[11px] text-ink-mid">{nickname}</span>}
        </div>
        {badge ? (
          <span className="mt-1.5 inline-flex items-center gap-1 rounded-full bg-raised px-2 py-0.5 text-[10px] font-medium text-ink-mid">
            <span>{badge.emoji}</span>
            <span>{badge.title}</span>
          </span>
        ) : (
          <span className="mt-1.5 block h-[18px] text-[10px] text-ink-faint">השבוע</span>
        )}
      </div>
    </button>
  )
}