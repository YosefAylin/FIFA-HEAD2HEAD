import type { RealtimeChannel } from '@supabase/supabase-js'
import { getSupabase } from '@/lib/supabase/client'
import type { ChatMessage } from '@/lib/types/database'

// Unique topic per mounted subscription (same limitation as the tournament
// store: channel(topic) reuses an existing channel on the same client, so
// duplicate topics collide after subscribe()).
let chatInstance = 0

/**
 * The newest `limit` messages, returned oldest-first (the order the UI renders
 * and the routes scan). Fetched descending on purpose: an ascending `limit`
 * returns the OLDEST rows, which hides every new message once the chat passes
 * `limit` rows — the "my message vanished / bot went mute" bug.
 */
export async function fetchChatMessages(limit = 200): Promise<ChatMessage[]> {
  const { data, error } = await getSupabase()
    .from('chat_messages')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit)
  if (error) throw error
  return ((data ?? []) as ChatMessage[]).reverse()
}

export async function sendChatMessage(authorName: string, body: string): Promise<void> {
  const { error } = await getSupabase()
    .from('chat_messages')
    .insert({ author_name: authorName, body })
  if (error) throw error
}

/** Subscribe to new chat rows. Returns an unsubscribe fn. */
export function subscribeToChat(callback: (msg: ChatMessage) => void): () => void {
  const channel: RealtimeChannel = getSupabase()
    .channel(`chat-${++chatInstance}`)
    .on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'chat_messages' },
      (payload) => callback(payload.new as ChatMessage)
    )
    .subscribe()
  return () => {
    void getSupabase().removeChannel(channel)
  }
}