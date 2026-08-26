'use client'

import { useCallback, useRef, useState } from 'react'
import { BOT_NAME } from './constants'
import type { ChatMessage } from '@/lib/types/database'

type StreamStatus = 'idle' | 'typing' | 'streaming' | 'unavailable'

/**
 * GPT-style streaming for the chat box: after a human sends a message, POST the
 * text to `/api/bot/stream` and surface the bot reply token-by-token in a live
 * placeholder bubble. When the finished reply lands as a realtime INSERT (the
 * server broadcasts it to the whole group), `onArrived()` drops the placeholder
 * — the real bubble replaces it.
 *
 * Falls back to "typing/unavailable" without streaming when the endpoint is
 * busy/unavailable — the group reply still shows up moments later via the
 * normal INSERT.
 */
export function useBotStreaming() {
  const [streamingText, setStreamingText] = useState<string | null>(null)
  const [status, setStatus] = useState<StreamStatus>('idle')
  const onArrivedRef = useRef<(() => void) | null>(null)

  // Stable: tear-down-safe for parent `useEffect([...])` deps — the returned
  // callbacks keep the same identity across renders so a subscription keyed on
  // them never flaps.
  const handleBotInserted = useCallback(() => {
    setStreamingText(null)
    setStatus('idle')
    onArrivedRef.current?.()
    onArrivedRef.current = null
  }, [])

  const beginStream = useCallback(async (text: string, _onArrived?: () => void) => {
    onArrivedRef.current = _onArrived ?? null
    let acc = ''
    setStreamingText('')
    setStatus('typing')
    try {
      const res = await fetch('/api/bot/stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
        cache: 'no-store',
      })
      if (!res.ok || !res.body) {
        setStreamingText(null)
        setStatus('unavailable')
        return
      }
      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      for (;;) {
        const { done, value } = await reader.read()
        if (done) break
        const chunk = decoder.decode(value, { stream: true })
        for (const line of chunk.split('\n')) {
          if (!line.startsWith('data: ')) continue
          const payload = line.slice(6).trim()
          if (payload === '[DONE]') {
            // The server persisted + broadcast the finished reply just before
            // [DONE], so the realtime onArrived() already (or is about to)
            // replace the placeholder. Clear it here so it can't resurrect.
            setStreamingText(null)
            setStatus('idle')
            return
          }
          try {
            const token = JSON.parse(payload) as string
            acc += token
            if (acc) setStreamingText(acc)
            setStatus('streaming')
          } catch { /* skip malformed frame */ }
        }
      }
    } catch {
      setStreamingText(null)
      setStatus('unavailable')
    }
  }, [])

  return { streamingText, status, start: beginStream, onArrived: handleBotInserted }
}