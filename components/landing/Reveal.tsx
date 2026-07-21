import type { ReactNode } from 'react'

interface RevealProps {
  children: ReactNode
  className?: string
}

interface RevealSlideProps {
  children: ReactNode
  className?: string
}

/**
 * Layout wrapper retained for call-site compatibility. Marketing content must
 * be visible in the server-rendered document, so it never starts translated or
 * transparent and does not depend on scroll observers to become readable.
 */
export function RevealSlide({ children, className }: RevealSlideProps) {
  return <div className={className}>{children}</div>
}

/** Server-visible layout wrapper retained for call-site compatibility. */
export function Reveal({ children, className }: RevealProps) {
  return <div className={className}>{children}</div>
}
