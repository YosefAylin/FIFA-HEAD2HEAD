'use client'

import { useCallback, useRef, useState } from 'react'

type StreamStatus = 'idle' | 'typing' | 'streaming' | 'unavailable'

/**
 * Outcome of one streaming attempt:
 * - `ok`: the endpoint accepted the request and the stream ran to `[DONE]`
 *   (a group reply may still be in flight via realtime).
 * - `errored`: the server explicitly reported that the reply was discarded by
 *   the output gates and nothing will be posted — show the canned local error.
 * - `ok: false` means busy/unavailable/dropped: the caller should wake the
 *   batch route as a fallback.
 */
export interface StreamResult {
  ok: boolean
  errored: boolean
}

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
  // Only one stream at a time: a second message sent while the bot is still
  // typing must not reset the live bubble or fight over the server lock. It
  // returns `ok: false` so the caller can wake the batch route instead.
  const inFlightRef = useRef(false)

  // Stable: tear-down-safe for parent `useEffect([...])` deps — the returned
  // callbacks keep the same identity across renders so a subscription keyed on
  // them never flaps.
  const handleBotInserted = useCallback(() => {
    setStreamingText(null)
    setStatus('idle')
    onArrivedRef.current?.()
    onArrivedRef.current = null
  }, [])

  const beginStream = useCallback(async (text: string, _onArrived?: () => void): Promise<StreamResult> => {
    if (inFlightRef.current) return { ok: false, errored: false }
    inFlightRef.current = true
    onArrivedRef.current = _onArrived ?? null
    let acc = ''
    let errored = false
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
        return { ok: false, errored: false }
      }
      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      // Buffer across reads: an SSE frame can be split between chunks.
      let buffer = ''
      for (;;) {
        const { done, value } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })
        const events = buffer.split('\n\n')
        buffer = events.pop() ?? ''
        for (const event of events) {
          const line = event.split('\n').find((l) => l.startsWith('data: '))
          if (!line) continue
          const payload = line.slice(6).trim()
          if (payload === '[DONE]') {
            // The server persisted + broadcast the finished reply just before
            // [DONE], so the realtime onArrived() already (or is about to)
            // replace the placeholder. Clear it here so it can't resurrect.
            setStreamingText(null)
            setStatus('idle')
            return { ok: true, errored }
          }
          if (payload === '[ERROR]') {
            // The server discarded the reply (leak/empty) and will post
            // nothing — flag it for the caller's canned error bubble.
            errored = true
            continue
          }
          try {
            const token = JSON.parse(payload) as string
            acc += token
            if (acc) setStreamingText(acc)
            setStatus('streaming')
          } catch { /* skip malformed frame */ }
        }
      }
      // The connection ended without [DONE] (server timeout / dropped stream):
      // drop the partial bubble so it doesn't linger, and let the caller wake
      // the batch route as a fallback.
      setStreamingText(null)
      setStatus('unavailable')
      return { ok: false, errored }
    } catch {
      setStreamingText(null)
      setStatus('unavailable')
      return { ok: false, errored }
    } finally {
      inFlightRef.current = false
    }
  }, [])

  return { streamingText, status, start: beginStream, onArrived: handleBotInserted }
}