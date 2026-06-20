'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const NAV_TABS = [
  { label: 'Configure', href: 'configure' },
  { label: 'Knowledge', href: 'knowledge' },
  { label: 'Conversations', href: 'conversations' },
  { label: 'Leads', href: 'leads' },
  { label: 'Analytics', href: 'analytics' },
  { label: 'Embed', href: 'embed' },
] as const

export function BotTabNav({ botId }: { botId: string }) {
  const pathname = usePathname()

  return (
    <nav className="flex gap-1 border-b border-border">
      {NAV_TABS.map((tab) => {
        const href = `/app/bots/${botId}/${tab.href}`
        const isActive = pathname === href || pathname.startsWith(`${href}/`)
        return (
          <Link
            key={tab.href}
            href={href}
            className={[
              'px-3 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors',
              isActive
                ? 'border-primary text-foreground'
                : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border',
            ].join(' ')}
            aria-current={isActive ? 'page' : undefined}
          >
            {tab.label}
          </Link>
        )
      })}
    </nav>
  )
}
