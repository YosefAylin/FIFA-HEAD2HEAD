'use client'

import { useEffect, useRef } from 'react'

/**
 * End-of-list sentinel that scrolls itself into view whenever `deps` change.
 * Used by the chat views to stay pinned to the newest message while the bot
 * reply streams in. `scrollIntoView` on the sentinel is robust even before
 * the container overflows.
 */
export function BottomScroll({ deps }: { deps: unknown[] }) {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    ref.current?.scrollIntoView({ behavior: 'smooth' })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps)
  return <div ref={ref} />
}
