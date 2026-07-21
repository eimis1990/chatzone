import type { Metadata } from 'next'
import type { ReactNode } from 'react'

// The embed iframe is widget chrome, not standalone content — never index it.
export const metadata: Metadata = { robots: { index: false, follow: false } }

/**
 * Minimal layout for the embedded chat iframe. A nested route layout must NOT
 * render <html>/<body> (only the root layout may) — doing so causes hydration
 * errors. We just provide a full-height, transparent wrapper so the rounded
 * chat card shows through inside the widget iframe.
 */
export default function EmbedLayout({ children }: { children: ReactNode }) {
  return (
    <div
      id="embed-root"
      style={{ height: '100dvh', overflow: 'hidden', background: 'transparent' }}
    >
      {children}
    </div>
  )
}
