'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const VERSIONS = [
  { href: '/v1', label: '1', title: 'Version 1 — Studio' },
  { href: '/v2', label: '2', title: 'Version 2 — Glass wall' },
]

/**
 * Fixed vertical version switcher for the two landing candidates. Deliberately
 * world-neutral (dark translucent) so it reads as harness chrome on both the
 * charcoal studio and the white glass wall rather than belonging to either.
 * ponytail: two hardcoded entries — a registry earns its keep at three.
 */
export function VersionTabs() {
  const pathname = usePathname()

  return (
    <nav
      aria-label="Landing version"
      className="fixed top-3 right-3 z-[2147483645] flex flex-col overflow-hidden rounded-md border border-white/15 bg-black/65 backdrop-blur-md sm:top-4 sm:right-4"
      style={{ boxShadow: '0 6px 20px -6px rgba(0,0,0,0.7)' }}
    >
      {VERSIONS.map((v) => {
        const active = pathname === v.href
        return (
          <Link
            key={v.href}
            href={v.href}
            title={v.title}
            aria-current={active ? 'page' : undefined}
            className={`flex size-8 items-center justify-center text-[13px] font-semibold tabular-nums transition-colors duration-150 [&:not(:first-child)]:border-t [&:not(:first-child)]:border-white/15 ${
              active ? 'bg-white text-black' : 'text-white/60 hover:bg-white/12 hover:text-white'
            }`}
          >
            {v.label}
          </Link>
        )
      })}
    </nav>
  )
}
