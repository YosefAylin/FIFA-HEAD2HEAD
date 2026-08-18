import type { Player } from '@/lib/types/database'

/** First two meaningful characters of a name, for the avatar fallback. */
export function initialsOf(name: string): string {
  const clean = name.trim()
  if (!clean) return '?'
  const tokens = clean.split(/\s+/)
  if (tokens.length === 1) return tokens[0].slice(0, 2)
  return (tokens[0][0] + tokens[1][0]).toUpperCase()
}

const AVATAR_COLORS = ['#3b82f6', '#8b5cf6', '#10b981', '#f59e0b', '#ef4444', '#06b6d4']

/** Deterministic color from a name so a player's avatar is stable. */
function colorForName(name: string): string {
  let hash = 0
  for (let i = 0; i < name.length; i++) hash = (hash * 31 + name.charCodeAt(i)) | 0
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length]
}

/**
 * A self-contained SVG avatar (initials on a colored circle) as a data URI.
 * Used whenever a player has no uploaded profile picture.
 */
export function initialsAvatarDataUri(name: string): string {
  const initials = initialsOf(name)
  const bg = colorForName(name)
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><circle cx="50" cy="50" r="50" fill="${bg}"/><text x="50" y="50" dy="0.35em" text-anchor="middle" font-family="system-ui, sans-serif" font-size="40" fill="#ffffff" font-weight="700">${initials}</text></svg>`
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`
}

/** Resolve the avatar to show for a player: uploaded URL or initials SVG. */
export function avatarUrlFor(player: Pick<Player, 'name' | 'profile_picture_url'>): string {
  return player.profile_picture_url || initialsAvatarDataUri(player.name)
}
