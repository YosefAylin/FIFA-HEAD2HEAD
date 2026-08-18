import { getSupabase } from '@/lib/supabase/client'

let settingsInstance = 0

/** Fetch a single row's jsonb `value` for a settings key (or `null`). */
export async function fetchSetting(key: string): Promise<Record<string, unknown> | null> {
  const { data, error } = await getSupabase()
    .from('settings')
    .select('value')
    .eq('key', key)
    .maybeSingle()
  if (error) throw error
  return (data?.value as Record<string, unknown> | undefined) ?? null
}

/** Upsert a jsonb `value` for a settings key (realtime-published). */
export async function upsertSetting(key: string, value: Record<string, unknown> | unknown[]): Promise<void> {
  const { error } = await getSupabase()
    .from('settings')
    .upsert({ key, value, updated_at: new Date().toISOString() })
  if (error) throw error
}

/**
 * Subscribe to any change on the `settings` table. Unique topic per call,
 * like the other realtime subscriptions, so duplicate `.on()` never collides.
 */
export function subscribeToSettingChange(callback: (value: Record<string, unknown>) => void): () => void {
  const channel = getSupabase()
    .channel(`settings-${++settingsInstance}`)
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'settings' },
      (payload) => {
        const row = payload.new as { key: string; value: Record<string, unknown> }
        if (row.key) callback(row)
      }
    )
    .subscribe()
  return () => {
    void getSupabase().removeChannel(channel)
  }
}
