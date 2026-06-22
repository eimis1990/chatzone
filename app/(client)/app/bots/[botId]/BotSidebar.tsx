'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  SlidersHorizontalIcon,
  DatabaseIcon,
  MessagesSquareIcon,
  UsersIcon,
  BarChart3Icon,
  Code2Icon,
  type LucideIcon,
} from 'lucide-react'
import { cn } from '@/lib/utils'

const NAV: { label: string; href: string; icon: LucideIcon }[] = [
  { label: 'Configure', href: 'configure', icon: SlidersHorizontalIcon },
  { label: 'Knowledge', href: 'knowledge', icon: DatabaseIcon },
  { label: 'Conversations', href: 'conversations', icon: MessagesSquareIcon },
  { label: 'Leads', href: 'leads', icon: UsersIcon },
  { label: 'Analytics', href: 'analytics', icon: BarChart3Icon },
  { label: 'Embed', href: 'embed', icon: Code2Icon },
]

interface BotSidebarProps {
  botId: string
  name: string
  status: string
}

export function BotSidebar({ botId, name, status }: BotSidebarProps) {
  const pathname = usePathname()

  return (
    <aside className="flex h-full w-56 flex-shrink-0 flex-col border-r bg-background">
      {/* Bot identity */}
      <div className="flex items-center gap-2 px-3 py-3 border-b">
        <span
          className={cn(
            'size-2 rounded-full flex-shrink-0',
            status === 'active' ? 'bg-green-500' : 'bg-muted-foreground/40',
          )}
          aria-hidden="true"
        />
        <span className="truncate text-sm font-semibold" title={name}>
          {name}
        </span>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto p-2">
        {NAV.map((item) => {
          const href = `/app/bots/${botId}/${item.href}`
          const active = pathname === href || pathname.startsWith(`${href}/`)
          const Icon = item.icon
          return (
            <Link
              key={item.href}
              href={href}
              aria-current={active ? 'page' : undefined}
              className={cn(
                'flex items-center gap-2.5 rounded-md px-2.5 py-2 text-sm font-medium transition-colors',
                active
                  ? 'bg-muted text-foreground'
                  : 'text-muted-foreground hover:bg-muted/60 hover:text-foreground',
              )}
            >
              <Icon className="size-4 flex-shrink-0" aria-hidden="true" />
              {item.label}
            </Link>
          )
        })}
      </nav>
    </aside>
  )
}
