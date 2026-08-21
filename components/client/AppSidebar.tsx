'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useEffect, useRef, useState, type ReactNode } from 'react'
import {
  BotIcon,
  HomeIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  SlidersHorizontalIcon,
  BlocksIcon,
  DatabaseIcon,
  MessagesSquareIcon,
  InboxIcon,
  UsersIcon,
  BarChart3Icon,
  RadarIcon,
  Code2Icon,
  SettingsIcon,
  CreditCardIcon,
  ChevronLeftIcon,
  type LucideIcon,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { SignOutButton } from '@/components/client/SignOutButton'
import { ReportBugButton } from '@/components/ReportBugButton'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'

const SECTIONS: { label: string; href: string; icon: LucideIcon }[] = [
  { label: 'Configure', href: 'configure', icon: SlidersHorizontalIcon },
  { label: 'Components', href: 'components', icon: BlocksIcon },
  { label: 'Knowledge', href: 'knowledge', icon: DatabaseIcon },
  { label: 'Inbox', href: 'inbox', icon: InboxIcon },
  { label: 'Conversations', href: 'conversations', icon: MessagesSquareIcon },
  { label: 'Leads', href: 'leads', icon: UsersIcon },
  { label: 'Analytics', href: 'analytics', icon: BarChart3Icon },
  { label: 'Demand Radar', href: 'demand-radar', icon: RadarIcon },
  { label: 'Embed', href: 'embed', icon: Code2Icon },
]

const SOLID_ACTIVE = 'bg-white font-medium text-neutral-900 shadow-sm'
const SUBMENU_ACTIVE = 'font-medium text-primary'
const IDLE = 'text-sidebar-foreground/70 hover:bg-white/10 hover:text-white'

function SidebarNavLink({
  href,
  label,
  icon: Icon,
  active,
  collapsed,
  showTooltip = false,
  className,
  activeClassName = SOLID_ACTIVE,
  trailing,
}: {
  href: string
  label: string
  icon: LucideIcon
  active: boolean
  collapsed: boolean
  showTooltip?: boolean
  className?: string
  activeClassName?: string
  trailing?: ReactNode
}) {
  const link = (
    <Link
      href={href}
      aria-current={active ? 'page' : undefined}
      aria-label={collapsed ? label : undefined}
      className={cn(
        'relative mx-auto flex shrink-0 items-center overflow-hidden text-sm outline-none transition-[width,height,padding,gap,border-radius,background-color,color] duration-300 ease-in-out motion-reduce:transition-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-inset',
        collapsed
          ? 'size-11 justify-center gap-0 rounded-[12px] p-0'
          : 'h-10 w-full gap-2.5 rounded-[12px] px-3',
        active ? activeClassName : IDLE,
        className,
      )}
    >
      <Icon
        className={cn(
          'shrink-0 transition-[width,height] duration-300 ease-in-out motion-reduce:transition-none',
          collapsed ? 'size-5' : 'size-4',
        )}
        aria-hidden="true"
      />
      <span
        aria-hidden={collapsed || undefined}
        className={cn(
          'min-w-0 flex-1 overflow-hidden whitespace-nowrap transition-[max-width,opacity,transform] duration-200 ease-out motion-reduce:transition-none',
          collapsed ? 'max-w-0 -translate-x-1 opacity-0' : 'max-w-48 translate-x-0 opacity-100',
        )}
      >
        {label}
      </span>
      {trailing}
    </Link>
  )

  return (
    <Tooltip key={showTooltip ? 'tooltip-ready' : 'tooltip-disabled'}>
      <TooltipTrigger render={link} />
      {showTooltip && (
        <TooltipContent side="right" sideOffset={10}>
          {label}
        </TooltipContent>
      )}
    </Tooltip>
  )
}

export interface BotLite {
  id: string
  name: string
  status: string
  /** Conversations awaiting/in human handoff (requested + live). */
  inboxCount?: number
}

export function AppSidebar({
  bots,
  userEmail,
  organizationName = 'Client',
}: {
  bots: BotLite[]
  userEmail: string
  organizationName?: string
}) {
  const pathname = usePathname()
  const router = useRouter()
  const activeBotId = pathname.match(/^\/app\/bots\/([^/]+)/)?.[1] ?? null
  const activeBot = bots.find((bot) => bot.id === activeBotId) ?? null
  // The bot list is route-derived, not stateful: open only while on the
  // My Bots screen or inside one of the bots, closed everywhere else.
  const botsOpen = pathname.startsWith('/app/bots')
  const [collapsed, setCollapsed] = useState(false)
  const [railTooltipsReady, setRailTooltipsReady] = useState(false)
  const tooltipTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const companyLabel = organizationName.trim().toUpperCase() || 'CLIENT'
  const companyCharacters = Array.from(companyLabel)
  const companyFontSize = Math.max(
    4,
    Math.min(9.6, 10.4 - Math.max(0, companyCharacters.length - 8) * 0.32),
  )

  const expandedItem =
    'flex h-10 w-full shrink-0 items-center gap-2.5 rounded-[12px] px-3 text-sm outline-none transition-colors focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-inset'
  const selectedBot = 'font-medium text-primary'
  const selectedSection = SUBMENU_ACTIVE

  useEffect(() => {
    return () => {
      if (tooltipTimerRef.current) clearTimeout(tooltipTimerRef.current)
    }
  }, [])

  function changeCollapsed(nextCollapsed: boolean) {
    if (tooltipTimerRef.current) clearTimeout(tooltipTimerRef.current)
    setRailTooltipsReady(false)
    setCollapsed(nextCollapsed)

    if (nextCollapsed) {
      const reduceMotion =
        typeof window.matchMedia === 'function' &&
        window.matchMedia('(prefers-reduced-motion: reduce)').matches
      tooltipTimerRef.current = setTimeout(() => {
        setRailTooltipsReady(true)
        tooltipTimerRef.current = null
      }, reduceMotion ? 0 : 350)
    }
  }

  function toggleSidebar() {
    changeCollapsed(!collapsed)
  }

  function handleBotsToggle() {
    if (collapsed) changeCollapsed(false)
    router.push('/app/bots')
  }

  return (
    <TooltipProvider delay={150}>
      <aside
        data-testid="client-sidebar"
        data-tooltips-ready={railTooltipsReady}
        aria-label="Client navigation"
        className={cn(
          'flex h-full shrink-0 flex-col overflow-hidden bg-transparent text-sidebar-foreground transition-[width] duration-300 ease-in-out motion-reduce:transition-none',
          collapsed ? 'w-20' : 'w-72',
        )}
      >
        <div
          className={cn(
            'relative shrink-0 transition-[height] duration-300 ease-in-out motion-reduce:transition-none',
            collapsed ? 'h-32' : 'h-[76px]',
          )}
        >
          <Link
            href="/app"
            aria-label="Loqara home"
            className={cn(
              'absolute top-4 flex h-11 items-center overflow-hidden text-white outline-none transition-[left,width,gap] duration-300 ease-in-out motion-reduce:transition-none focus-visible:ring-2 focus-visible:ring-primary',
              collapsed ? 'left-[18px] w-11 justify-center gap-0 rounded-xl' : 'left-4 w-36 gap-2',
            )}
          >
            <img
              src="/loqara-logo-colorful.webp"
              alt=""
              aria-hidden="true"
              className="size-11 shrink-0"
            />
            <span
              aria-hidden={collapsed || undefined}
              className={cn(
                'inline-flex shrink-0 flex-col overflow-hidden transition-[width,opacity,transform] duration-200 ease-out motion-reduce:transition-none',
                collapsed
                  ? 'w-0 -translate-x-1 opacity-0'
                  : 'w-20 translate-x-0 opacity-100',
              )}
            >
              <span className="text-2xl font-bold leading-none">Loqara</span>
              <span
                className="mt-1 flex w-full items-center justify-between font-light leading-none text-primary"
                style={{ fontSize: `${companyFontSize}px` }}
                aria-label={companyLabel}
                title={organizationName}
              >
                {companyCharacters.map((character, index) => (
                  <span key={`${character}-${index}`} aria-hidden="true">
                    {character === ' ' ? '\u00a0' : character}
                  </span>
                ))}
              </span>
            </span>
          </Link>

          <Tooltip key={`${collapsed}-${railTooltipsReady}`}>
            <TooltipTrigger
              render={
                <button
                  type="button"
                  onClick={toggleSidebar}
                  aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
                  aria-expanded={!collapsed}
                  aria-controls="client-sidebar-navigation"
                  className={cn(
                    'absolute flex size-9 items-center justify-center rounded-full border border-white/15 text-white/60 outline-none transition-[top,right,background-color,color] duration-300 ease-in-out motion-reduce:transition-none hover:bg-white/10 hover:text-white focus-visible:ring-2 focus-visible:ring-primary',
                    collapsed ? 'right-[22px] top-[72px]' : 'right-4 top-5',
                  )}
                />
              }
            >
              {collapsed ? (
                <ChevronRightIcon className="size-4" aria-hidden="true" />
              ) : (
                <ChevronLeftIcon className="size-4" aria-hidden="true" />
              )}
            </TooltipTrigger>
            {(!collapsed || railTooltipsReady) && (
              <TooltipContent side="right" sideOffset={10}>
                {collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
              </TooltipContent>
            )}
          </Tooltip>
        </div>

        <nav
          id="client-sidebar-navigation"
          className={cn('no-scrollbar flex min-h-0 flex-1 flex-col overflow-y-auto pb-2', collapsed ? 'gap-1' : 'px-3')}
        >
          {!collapsed && (
            <p className="shrink-0 px-3 pt-1 pb-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-white/40">
              Main
            </p>
          )}
          <SidebarNavLink
            href="/app"
            label="Home"
            icon={HomeIcon}
            active={pathname === '/app'}
            collapsed={collapsed}
            showTooltip={collapsed && railTooltipsReady}
            className={collapsed ? undefined : 'mb-0.5'}
          />

          <Tooltip key={`${collapsed}-${railTooltipsReady}`}>
            <TooltipTrigger
              render={
                <button
                  type="button"
                  onClick={handleBotsToggle}
                  aria-expanded={collapsed ? undefined : botsOpen}
                  aria-label={collapsed ? 'My Bots' : undefined}
                  className={cn(
                    'relative mx-auto flex shrink-0 items-center overflow-hidden text-sm outline-none transition-[width,height,padding,gap,border-radius,background-color,color] duration-300 ease-in-out motion-reduce:transition-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-inset',
                    collapsed
                      ? 'size-11 justify-center gap-0 rounded-[12px] p-0'
                      : 'h-10 w-full gap-2.5 rounded-[12px] px-3',
                    activeBotId || pathname === '/app/bots'
                      ? SOLID_ACTIVE
                      : IDLE,
                  )}
                />
              }
            >
              <BotIcon
                className={cn(
                  'shrink-0 transition-[width,height] duration-300 ease-in-out motion-reduce:transition-none',
                  collapsed ? 'size-5' : 'size-4',
                )}
                aria-hidden="true"
              />
              <span
                aria-hidden={collapsed || undefined}
                className={cn(
                  'min-w-0 flex-1 overflow-hidden whitespace-nowrap text-left font-medium transition-[max-width,opacity,transform] duration-200 ease-out motion-reduce:transition-none',
                  collapsed
                    ? 'max-w-0 -translate-x-1 opacity-0'
                    : 'max-w-48 translate-x-0 opacity-100',
                  !activeBotId && pathname !== '/app/bots' && !collapsed && 'text-white',
                )}
              >
                My Bots
              </span>
              {!collapsed && (botsOpen ? (
                <ChevronDownIcon className="size-4" aria-hidden="true" />
              ) : (
                <ChevronRightIcon className="size-4" aria-hidden="true" />
              ))}
              {collapsed && activeBot?.inboxCount ? (
                <span
                  className="absolute right-1 top-1 size-2 rounded-full bg-primary ring-2 ring-[#0d1111]"
                  aria-label={`${activeBot.inboxCount} awaiting a human`}
                />
              ) : null}
            </TooltipTrigger>
            {collapsed && railTooltipsReady && (
              <TooltipContent side="right" sideOffset={10}>
                My Bots
              </TooltipContent>
            )}
          </Tooltip>

          {!collapsed && botsOpen && (
            <div
              data-testid="client-bot-list"
              className="mt-0.5 flex shrink-0 flex-col gap-0.5"
            >
              {bots.length === 0 && (
                <p className="px-3 py-1.5 text-xs text-muted-foreground">
                  No bots yet
                </p>
              )}
              {bots.map((bot) => {
                const active = bot.id === activeBotId
                return (
                  <div key={bot.id} className="shrink-0">
                    <Link
                      href={`/app/bots/${bot.id}/configure`}
                      className={cn(expandedItem, 'pl-3', active ? selectedBot : IDLE)}
                    >
                      <span
                        className={cn(
                          'size-1.5 shrink-0 rounded-full',
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

                    {active && (
                      <div className="mt-0.5 mb-1 ml-4 flex flex-col gap-0.5 border-l border-sidebar-border pl-2">
                        {SECTIONS.map((section) => {
                          const href = `/app/bots/${bot.id}/${section.href}`
                          const isActive = pathname === href || pathname.startsWith(`${href}/`)
                          return (
                            <SidebarNavLink
                              key={section.href}
                              href={href}
                              label={section.label}
                              icon={section.icon}
                              active={isActive}
                              collapsed={false}
                              showTooltip={false}
                              activeClassName={selectedSection}
                              className="py-1.5"
                              trailing={section.href === 'inbox' && bot.inboxCount ? (
                                <span className="inline-flex min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-semibold leading-4 text-primary-foreground">
                                  {bot.inboxCount}
                                </span>
                              ) : null}
                            />
                          )
                        })}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}

          {collapsed && activeBot && (
            <div
              data-testid="client-active-submenu"
              className="my-1 flex shrink-0 flex-col gap-1 border-y border-white/10 bg-white/[0.04] py-2"
            >
              {SECTIONS.map((section) => {
                const href = `/app/bots/${activeBot.id}/${section.href}`
                const isActive = pathname === href || pathname.startsWith(`${href}/`)
                return (
                  <SidebarNavLink
                    key={section.href}
                    href={href}
                    label={section.label}
                    icon={section.icon}
                    active={isActive}
                    collapsed
                    showTooltip={railTooltipsReady}
                    activeClassName={selectedSection}
                    trailing={section.href === 'inbox' && activeBot.inboxCount ? (
                      <span
                        className="absolute right-1 top-1 flex min-w-3.5 items-center justify-center rounded-full bg-primary px-1 text-[9px] font-semibold leading-3.5 text-primary-foreground ring-2 ring-[#0d1111]"
                        aria-label={`${activeBot.inboxCount} awaiting a human`}
                      >
                        {activeBot.inboxCount}
                      </span>
                    ) : null}
                  />
                )
              })}
            </div>
          )}

          {collapsed ? (
            <span aria-hidden="true" className="mx-auto my-1 block h-px w-9 shrink-0 bg-white/10" />
          ) : (
            <p className="shrink-0 px-3 pt-4 pb-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-white/40">
              Account
            </p>
          )}
          <SidebarNavLink
            href="/app/team"
            label="Team"
            icon={UsersIcon}
            active={pathname === '/app/team'}
            collapsed={collapsed}
            showTooltip={collapsed && railTooltipsReady}
          />
          <SidebarNavLink
            href="/app/subscription"
            label="Subscription"
            icon={CreditCardIcon}
            active={pathname === '/app/subscription'}
            collapsed={collapsed}
            showTooltip={collapsed && railTooltipsReady}
            className={collapsed ? undefined : 'mt-0.5'}
          />
          <SidebarNavLink
            href="/app/settings"
            label="Settings"
            icon={SettingsIcon}
            active={pathname === '/app/settings'}
            collapsed={collapsed}
            showTooltip={collapsed && railTooltipsReady}
            className={collapsed ? undefined : 'mt-0.5'}
          />
        </nav>

        {collapsed ? (
          <div className="flex flex-col items-center gap-1 border-t border-white/10 px-3 py-3">
            <span
              aria-hidden="true"
              className="mb-1 grid size-8 place-items-center rounded-full bg-primary/20 text-sm font-semibold uppercase text-primary"
            >
              {userEmail[0]}
            </span>
            <ReportBugButton compact />
            <SignOutButton compact />
          </div>
        ) : (
          <div className="m-3 overflow-hidden rounded-2xl border border-white/10 bg-white/[0.04]">
            <div className="flex items-center gap-2.5 border-b border-white/10 bg-white/[0.03] px-3 py-2.5">
              <span
                aria-hidden="true"
                className="grid size-8 shrink-0 place-items-center rounded-full bg-primary/20 text-sm font-semibold uppercase text-primary"
              >
                {userEmail[0]}
              </span>
              <div className="min-w-0">
                <p className="truncate text-xs font-medium text-white/90" title={userEmail}>
                  {userEmail}
                </p>
                <p className="truncate text-[10px] uppercase tracking-[0.14em] text-white/45" title={organizationName}>
                  {organizationName}
                </p>
              </div>
            </div>
            <div className="p-1.5">
              <ReportBugButton />
              <SignOutButton />
            </div>
          </div>
        )}
      </aside>
    </TooltipProvider>
  )
}
