'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { HomeIcon, InboxIcon, UsersIcon, MenuIcon, type LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Tab {
  label: string
  href: string
  icon: LucideIcon
  /** Active also for nested paths (e.g. /app/inbox/123). */
  match: (path: string) => boolean
}

const TABS: Tab[] = [
  { label: 'Home', href: '/app', icon: HomeIcon, match: (p) => p === '/app' || p.startsWith('/app/bots') },
  { label: 'Inbox', href: '/app/inbox', icon: InboxIcon, match: (p) => p.startsWith('/app/inbox') },
  { label: 'Leads', href: '/app/leads', icon: UsersIcon, match: (p) => p.startsWith('/app/leads') },
  { label: 'More', href: '/app/more', icon: MenuIcon, match: (p) => p.startsWith('/app/more') },
]

/**
 * Mobile bottom navigation for the client portal (hidden at md+). The desktop
 * sidebar's job is split here into the four things a client does on a phone:
 * check in (Home), take over a chat (Inbox), follow up (Leads), everything
 * else (More). `inboxCount` = conversations awaiting/in human handoff.
 */
export function MobileTabBar({ inboxCount = 0 }: { inboxCount?: number }) {
  const pathname = usePathname()

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-40 flex border-t border-white/10 bg-[#1b1d1f] md:hidden"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      aria-label="Primary"
    >
      {TABS.map(({ label, href, icon: Icon, match }) => {
        const active = match(pathname)
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? 'page' : undefined}
            className={cn(
              'relative flex flex-1 flex-col items-center gap-0.5 py-2.5 text-[11px] font-medium transition-colors',
              active ? 'text-primary' : 'text-white/55 hover:text-white',
            )}
          >
            <span className="relative">
              <Icon className="size-5" aria-hidden="true" />
              {href === '/app/inbox' && inboxCount > 0 && (
                <span
                  className="absolute -right-2 -top-1.5 inline-flex min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[9px] font-semibold leading-4 text-white"
                  aria-label={`${inboxCount} awaiting reply`}
                >
                  {inboxCount > 9 ? '9+' : inboxCount}
                </span>
              )}
            </span>
            {label}
          </Link>
        )
      })}
    </nav>
  )
}
