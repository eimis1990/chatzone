import type { Metadata } from 'next'
import type { ReactNode } from 'react'

// Auth screens are functional, not content — keep them out of search indexes.
// Authentication is the security boundary; this only controls indexing.
export const metadata: Metadata = { robots: { index: false, follow: false } }

export default function AuthLayout({ children }: { children: ReactNode }) {
  return children
}
