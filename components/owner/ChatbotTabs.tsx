'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { SlidersHorizontalIcon, DatabaseIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

const TABS = [
  { label: 'Configure', href: '/owner/chatbot', icon: SlidersHorizontalIcon, exact: true },
  { label: 'Knowledge', href: '/owner/chatbot/knowledge', icon: DatabaseIcon },
]

/** Sub-nav for Loqara's own bot — mirrors the client app's per-bot submenu. */
export function ChatbotTabs() {
  const pathname = usePathname()
  return (
    <nav className="flex gap-1">
      {TABS.map(({ label, href, icon: Icon, exact }) => {
        const active = exact ? pathname === href : pathname.startsWith(href)
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? 'page' : undefined}
            className={cn(
              'flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors',
              active ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted',
            )}
          >
            <Icon className="size-4" aria-hidden="true" />
            {label}
          </Link>
        )
      })}
    </nav>
  )
}
