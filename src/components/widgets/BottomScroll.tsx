'use client'

import { useEffect, useRef } from 'react'

/**
 * End-of-list sentinel that scrolls the chat container to the newest message
 * whenever `deps` change. Used by the chat views to stay pinned to the newest
 * line while the bot reply streams in.
 *
 * It scrolls the nearest scrollable ancestor directly instead of calling
 * `scrollIntoView`, which also scrolls the page — that yanked the whole home
 * page down to the mini chat when its messages first loaded.
 */
export function BottomScroll({ deps }: { deps: unknown[] }) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    let parent = ref.current?.parentElement ?? null
    while (parent) {
      const style = getComputedStyle(parent)
      const scrolls = /(auto|scroll)/.test(style.overflowY)
      if (scrolls && parent.scrollHeight > parent.clientHeight) {
        parent.scrollTo({ top: parent.scrollHeight, behavior: 'smooth' })
        return
      }
      parent = parent.parentElement
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps)

  return <div ref={ref} />
}
