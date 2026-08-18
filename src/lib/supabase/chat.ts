import type { RealtimeChannel } from '@supabase/supabase-js'
import { getSupabase } from '@/lib/supabase/client'
import type { ChatMessage } from '@/lib/types/database'

// Unique topic per mounted subscription (same limitation as the tournament
// store: channel(topic) reuses an existing channel on the same client, so
// duplicate topics collide after subscribe()).
let chatInstance = 0

export async function fetchChatMessages(): Promise<ChatMessage[]> {
  const { data, error } = await getSupabase()
    .from('chat_messages')
    .select('*')
    .order('created_at', { ascending: true })
    .limit(200)
  if (error) throw error
  return (data ?? []) as ChatMessage[]
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