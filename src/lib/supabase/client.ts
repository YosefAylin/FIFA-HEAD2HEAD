import { createClient, type SupabaseClient } from '@supabase/supabase-js'

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

let client: SupabaseClient | null = null

/**
 * Lazily-initialized Supabase client (anon key).
 *
 * Laziness matters: it keeps `supabaseUrl is required` from crashing the
 * Next.js build at module evaluation time. If the env vars are missing, the
 * error is raised only when a page actually queries data at runtime.
 */
export function getSupabase(): SupabaseClient {
  if (!client) {
    if (!url || !anonKey) {
      throw new Error(
        'Missing Supabase env: set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY'
      )
    }
    client = createClient(url, anonKey, {
      realtime: { params: { eventsPerSecond: 10 } },
    })
  }
  return client
}

/** True when Supabase env vars are present (lets the UI show a friendly error otherwise). */
export function hasSupabaseConfig(): boolean {
  return Boolean(url && anonKey)
}
