import type { Player } from '@/lib/types/database'

/**
 * Guests play a single tournament day: their results count for that day's
 * table and medals, but never for all-time stats (leaderboard, career records,
 * whisky odds).
 */
export function isGuest(player: Player): boolean {
  return player.is_guest === true
}

/** Only the players who count toward all-time stats. */
export function regularsOnly(players: Player[]): Player[] {
  return players.filter((p) => p.is_guest !== true)
}

export interface PlayerGroups {
  /** Regulars currently active. */
  active: Player[]
  /** Regulars marked inactive. */
  inactive: Player[]
  /** Guests (single-day players). */
  guests: Player[]
}

/**
 * Split a roster into active regulars / inactive regulars / guests, preserving
 * the input order inside each bucket. Used wherever players are listed so the
 * roster reads as clearly separated groups.
 */
export function groupPlayersByStatus(players: Player[]): PlayerGroups {
  const active: Player[] = []
  const inactive: Player[] = []
  const guests: Player[] = []
  for (const p of players) {
    if (p.is_guest === true) guests.push(p)
    else if (p.is_active === false) inactive.push(p)
    else active.push(p)
  }
  return { active, inactive, guests }
}
