import { fetchSetting, subscribeToSettingChange, upsertSetting } from '@/lib/supabase/settings'

/**
 * Manual whisky exemptions, stored under one `settings` key and scoped to a
 * week (`{ week, player_ids }`) so last week's pardons never leak forward.
 * The latest tournament's last-place player is exempt automatically; this list
 * adds any extra players a human marks as פטור.
 */
export const WHISKY_EXEMPTIONS_KEY = 'whisky_exemptions'

interface StoredExemptions {
  week?: unknown
  player_ids?: unknown
}

function parseIds(value: Record<string, unknown> | null, weekKey: string): string[] {
  const stored = value as StoredExemptions | null
  if (!stored || stored.week !== weekKey || !Array.isArray(stored.player_ids)) return []
  return stored.player_ids.filter((id): id is string => typeof id === 'string')
}

export async function fetchManualExemptions(weekKey: string): Promise<string[]> {
  return parseIds(await fetchSetting(WHISKY_EXEMPTIONS_KEY), weekKey)
}

export async function setManualExemptions(weekKey: string, playerIds: string[]): Promise<void> {
  await upsertSetting(WHISKY_EXEMPTIONS_KEY, {
    week: weekKey,
    player_ids: [...new Set(playerIds)],
  })
}

export async function setManualExemption(
  weekKey: string,
  playerId: string,
  exempt: boolean
): Promise<string[]> {
  const current = await fetchManualExemptions(weekKey)
  const next = exempt
    ? [...new Set([...current, playerId])]
    : current.filter((id) => id !== playerId)
  await setManualExemptions(weekKey, next)
  return next
}

/** Subscribe to exemption changes. Returns an unsubscribe fn. */
export function subscribeToManualExemptions(
  weekKey: string,
  callback: (playerIds: string[]) => void
): () => void {
  return subscribeToSettingChange((row) => {
    if (row.key !== WHISKY_EXEMPTIONS_KEY) return
    callback(parseIds(row.value ?? null, weekKey))
  })
}
