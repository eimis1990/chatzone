'use client'

import { useSyncExternalStore } from 'react'

const QUERY = '(prefers-reduced-motion: reduce)'

function subscribe(onChange: () => void) {
  const mq = window.matchMedia(QUERY)
  mq.addEventListener('change', onChange)
  return () => mq.removeEventListener('change', onChange)
}

/**
 * Reduced-motion preference, read the one way that survives hydration: a
 * matchMedia store with a `false` server snapshot. Branching render output on
 * framer's `useReducedMotion` mismatches the server HTML (it resolves false
 * during SSR, true on a client that asked for less motion); React re-renders
 * this after hydration instead of warning.
 */
export function useReduce(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => window.matchMedia(QUERY).matches,
    () => false,
  )
}
