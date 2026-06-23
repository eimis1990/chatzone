'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState } from 'react'
import {
  BotIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  SlidersHorizontalIcon,
  DatabaseIcon,
  MessagesSquareIcon,
  InboxIcon,
  UsersIcon,
  BarChart3Icon,
  Code2Icon,
  SettingsIcon,
  type LucideIcon,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { SignOutButton } from '@/components/client/SignOutButton'

const SECTIONS: { label: string; href: string; icon: LucideIcon }[] = [
  { label: 'Configure', href: 'configure', icon: SlidersHorizontalIcon },
  { label: 'Knowledge', href: 'knowledge', icon: DatabaseIcon },
  { label: 'Inbox', href: 'inbox', icon: InboxIcon },
  { label: 'Conversations', href: 'conversations', icon: MessagesSquareIcon },
  { label: 'Leads', href: 'leads', icon: UsersIcon },
  { label: 'Analytics', href: 'analytics', icon: BarChart3Icon },
  { label: 'Embed', href: 'embed', icon: Code2Icon },
]

export interface BotLite {
  id: string
  name: string
  status: string
  /** Conversations awaiting/in human handoff (requested + live). */
  inboxCount?: number
}

export function AppSidebar({ bots, userEmail }: { bots: BotLite[]; userEmail: string }) {
  const pathname = usePathname()
  const activeBotId = pathname.match(/^\/app\/bots\/([^/]+)/)?.[1] ?? null
  const [botsOpen, setBotsOpen] = useState(true)

  const itemBase =
    'flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm transition-colors'
  const activePill = 'bg-sidebar-accent font-medium text-sidebar-accent-foreground shadow-sm'
  const idle = 'text-sidebar-foreground/70 hover:bg-white/10 hover:text-white'

  return (
    <aside className="flex h-full w-64 flex-shrink-0 flex-col bg-transparent text-sidebar-foreground">
      {/* Logo */}
      <Link
        href="/app"
        className="flex items-center gap-2 px-4 py-4 font-semibold text-white"
      >
        <MessagesSquareIcon className="size-5 text-white" />
        <span>Chatzone</span>
      </Link>

      <p className="px-4 pb-1 text-xs font-medium tracking-wide text-white/45">
        My Panel
      </p>

      <nav className="flex-1 overflow-y-auto px-2 pb-2">
        {/* My Bots — collapsible group */}
        <button
          type="button"
          onClick={() => setBotsOpen((v) => !v)}
          aria-expanded={botsOpen}
          className={cn(itemBase, idle, 'w-full')}
        >
          <BotIcon className="size-4 flex-shrink-0" aria-hidden="true" />
          <span className="flex-1 text-left font-medium text-white">My Bots</span>
          {botsOpen ? (
            <ChevronDownIcon className="size-4" aria-hidden="true" />
          ) : (
            <ChevronRightIcon className="size-4" aria-hidden="true" />
          )}
        </button>

        {botsOpen && (
          <div className="mt-0.5 space-y-0.5">
            {bots.length === 0 && (
              <p className="px-3 py-1.5 text-xs text-muted-foreground">No bots yet</p>
            )}
            {bots.map((bot) => {
              const active = bot.id === activeBotId
              return (
                <div key={bot.id}>
                  <Link
                    href={`/app/bots/${bot.id}/configure`}
                    className={cn(itemBase, 'pl-3', active ? activePill : idle)}
                  >
                    <span
                      className={cn(
                        'size-1.5 flex-shrink-0 rounded-full',
                        bot.status === 'active' ? 'bg-primary' : 'bg-muted-foreground/40',
                      )}
                      aria-hidden="true"
                    />
                    <span className="flex-1 truncate">{bot.name}</span>
                    {bot.inboxCount ? (
                      <span
                        className="ml-1 inline-flex min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-semibold leading-4 text-primary-foreground"
                        title={`${bot.inboxCount} awaiting a human`}
                      >
                        {bot.inboxCount}
                      </span>
                    ) : null}
                  </Link>

                  {/* Selected bot expands to its sections */}
                  {active && (
                    <div className="mt-0.5 mb-1 ml-4 space-y-0.5 border-l border-sidebar-border pl-2">
                      {SECTIONS.map((s) => {
                        const href = `/app/bots/${bot.id}/${s.href}`
                        const isActive = pathname === href || pathname.startsWith(`${href}/`)
                        const Icon = s.icon
                        return (
                          <Link
                            key={s.href}
                            href={href}
                            aria-current={isActive ? 'page' : undefined}
                            className={cn(
                              itemBase,
                              'py-1.5',
                              isActive ? activePill : idle,
                            )}
                          >
                            <Icon className="size-4 flex-shrink-0" aria-hidden="true" />
                            <span className="flex-1">{s.label}</span>
                            {s.href === 'inbox' && bot.inboxCount ? (
                              <span className="inline-flex min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-semibold leading-4 text-primary-foreground">
                                {bot.inboxCount}
                              </span>
                            ) : null}
                          </Link>
                        )
                      })}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}

        {/* Org-level settings */}
        <Link
          href="/app/settings"
          aria-current={pathname === '/app/settings' ? 'page' : undefined}
          className={cn(
            itemBase,
            'mt-1',
            pathname === '/app/settings' ? activePill : idle,
          )}
        >
          <SettingsIcon className="size-4 flex-shrink-0" aria-hidden="true" />
          Settings
        </Link>
      </nav>

      {/* Footer — user + sign out, as a floating white card */}
      <div className="m-3 rounded-xl bg-white/70 p-3 shadow-sm ring-1 ring-black/5 backdrop-blur-sm">
        <p className="px-1 pb-1.5 text-xs text-muted-foreground truncate" title={userEmail}>
          {userEmail}
        </p>
        <SignOutButton />
      </div>
    </aside>
  )
}
