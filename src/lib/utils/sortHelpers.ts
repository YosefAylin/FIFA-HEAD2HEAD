import type { Player } from '@/lib/types/database'

/**
 * Comparator primitive for "greyed out (inactive) players last" in lists.
 * Returns a negative/zero/positive value for active-vs-inactive ordering.
 * Chain it ahead of the real ranking comparator:
 *
 *   [...players].sort((a, b) => activeFirst(a, b) || rankComparator(a, b))
 */
export function activeFirst(a: Player, b: Player): number {
  return (a.is_active === false ? 1 : 0) - (b.is_active === false ? 1 : 0)
}