'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { SlidersHorizontalIcon, DatabaseIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

/** Configure / Knowledge tabs for the owner editing a client's bot. */
export function OwnerBotTabs({ orgId, botId }: { orgId: string; botId: string }) {
  const pathname = usePathname()
  const base = `/owner/clients/${orgId}/bots/${botId}`
  const tabs = [
    { label: 'Configure', href: `${base}/configure`, icon: SlidersHorizontalIcon },
    { label: 'Knowledge', href: `${base}/knowledge`, icon: DatabaseIcon },
  ]

  return (
    <nav className="flex shrink-0 gap-1 border-b bg-card px-4">
      {tabs.map((t) => {
        const active = pathname === t.href
        const Icon = t.icon
        return (
          <Link
            key={t.href}
            href={t.href}
            aria-current={active ? 'page' : undefined}
            className={cn(
              'flex items-center gap-1.5 border-b-2 px-3 py-2.5 text-sm font-medium transition-colors',
              active
                ? 'border-primary text-foreground'
                : 'border-transparent text-muted-foreground hover:text-foreground',
            )}
          >
            <Icon className="size-4" aria-hidden="true" />
            {t.label}
          </Link>
        )
      })}
    </nav>
  )
}
