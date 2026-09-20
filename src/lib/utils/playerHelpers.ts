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
