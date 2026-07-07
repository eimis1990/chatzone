'use client'

import Link from 'next/link'

/** Minimal top bar for the mobile client portal (hidden at md+): brand only.
 *  Account + sign-out live in the More tab. */
export function MobileTopBar() {
  return (
    <header className="sticky top-0 z-30 flex h-14 flex-shrink-0 items-center gap-2 border-b border-border bg-white px-4 md:hidden">
      <Link href="/app" className="flex items-center gap-2">
        <img src="/loqara-logo-colorful.webp" alt="" aria-hidden="true" className="size-8 shrink-0" />
        <span className="text-lg font-bold">
          Loqara<span className="text-primary">.</span>
        </span>
      </Link>
    </header>
  )
}
