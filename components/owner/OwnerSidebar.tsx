'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useRef, useState, type ReactNode } from 'react'
import {
  LayoutDashboardIcon,
  UsersIcon,
  MicVocalIcon,
  MailIcon,
  MegaphoneIcon,
  BotIcon,
  SlidersHorizontalIcon,
  DatabaseIcon,
  BugIcon,
  FileTextIcon,
  LayersIcon,
  BlocksIcon,
  InboxIcon,
  MessagesSquareIcon,
  BarChart3Icon,
  TargetIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  type LucideIcon,
  PresentationIcon,
  NewspaperIcon,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { SignOutButton } from '@/components/client/SignOutButton'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'

interface ChildNavItem {
  label: string
  href: string
  icon: LucideIcon
  exact?: boolean
}

interface NavItem extends ChildNavItem {
  /** Sub-items, shown while their parent section is active. */
  children?: ChildNavItem[]
}

const NAV_SECTIONS: { label: string; items: NavItem[] }[] = [
  {
    label: 'Main',
    items: [
      { label: 'Dashboard', href: '/owner', icon: LayoutDashboardIcon, exact: true },
      { label: 'Clients', href: '/owner/clients', icon: UsersIcon },
      { label: 'Demos', href: '/owner/demos', icon: PresentationIcon },
      {
        label: 'Our chatbot',
        href: '/owner/chatbot',
        icon: BotIcon,
        children: [
          { label: 'Configure', href: '/owner/chatbot', icon: SlidersHorizontalIcon, exact: true },
          { label: 'Knowledge', href: '/owner/chatbot/knowledge', icon: DatabaseIcon },
          { label: 'Inbox', href: '/owner/chatbot/inbox', icon: InboxIcon },
          { label: 'Conversations', href: '/owner/chatbot/conversations', icon: MessagesSquareIcon },
          { label: 'Leads', href: '/owner/chatbot/leads', icon: UsersIcon },
          { label: 'Analytics', href: '/owner/chatbot/analytics', icon: BarChart3Icon },
        ],
      },
    ],
  },
  {
    label: 'Growth',
    items: [
      { label: 'Signups', href: '/owner/signups', icon: MailIcon },
      { label: 'Sales leads', href: '/owner/leads', icon: TargetIcon },
      { label: 'Content', href: '/owner/content', icon: NewspaperIcon },
      { label: 'LinkedIn', href: '/owner/linkedin', icon: MegaphoneIcon },
    ],
  },
  {
    label: 'Platform',
    items: [
      {
        label: 'Versioning',
        href: '/owner/prompts',
        icon: LayersIcon,
        children: [
          { label: 'System prompts', href: '/owner/prompts', icon: FileTextIcon },
          { label: 'Components', href: '/owner/components', icon: BlocksIcon },
        ],
      },
      { label: 'Voices', href: '/owner/voices', icon: MicVocalIcon },
    ],
  },
  {
    label: 'Support',
    items: [
      { label: 'Bug reports', href: '/owner/bugs', icon: BugIcon },
    ],
  },
]

const SOLID_ACTIVE = 'bg-white font-medium text-neutral-900 shadow-sm'
const SUBMENU_ACTIVE = 'font-medium text-primary'
const IDLE = 'text-sidebar-foreground/70 hover:bg-white/10 hover:text-white'

function OwnerNavLink({
  href,
  label,
  icon: Icon,
  active,
  collapsed,
  showTooltip,
  className,
  activeClassName = SOLID_ACTIVE,
  trailing,
}: {
  href: string
  label: string
  icon: LucideIcon
  active: boolean
  collapsed: boolean
  showTooltip: boolean
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

export function OwnerSidebar({
  userEmail,
  openBugs = 0,
}: {
  userEmail: string
  openBugs?: number
}) {
  const pathname = usePathname()
  const [collapsed, setCollapsed] = useState(false)
  const [railTooltipsReady, setRailTooltipsReady] = useState(false)
  const tooltipTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    const mobileCollapseTimer = typeof window.matchMedia === 'function'
      ? window.setTimeout(() => {
          if (window.matchMedia('(max-width: 767px)').matches) setCollapsed(true)
        }, 0)
      : null

    return () => {
      if (mobileCollapseTimer !== null) window.clearTimeout(mobileCollapseTimer)
      if (tooltipTimerRef.current) clearTimeout(tooltipTimerRef.current)
    }
  }, [])

  function toggleSidebar() {
    const nextCollapsed = !collapsed
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

  const isActive = (href: string, exact?: boolean) =>
    exact ? pathname === href : pathname === href || pathname.startsWith(`${href}/`)

  return (
    <TooltipProvider delay={150}>
      <aside
        data-testid="owner-sidebar"
        data-tooltips-ready={railTooltipsReady}
        aria-label="Owner navigation"
        className={cn(
          'flex h-full shrink-0 flex-col overflow-hidden bg-transparent text-sidebar-foreground transition-[width] duration-300 ease-in-out motion-reduce:transition-none',
          collapsed ? 'w-20' : 'w-64',
        )}
      >
        <div
          className={cn(
            'relative shrink-0 transition-[height] duration-300 ease-in-out motion-reduce:transition-none',
            collapsed ? 'h-32' : 'h-[76px]',
          )}
        >
          <Link
            href="/owner"
            aria-label="Loqara owner dashboard"
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
                className="mt-1 flex w-full justify-between text-[0.6rem] font-light leading-none text-primary"
                aria-label="OWNER"
              >
                {[...'OWNER'].map((character, index) => (
                  <span key={`${character}-${index}`} aria-hidden="true">
                    {character}
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
                  aria-controls="owner-sidebar-navigation"
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
          id="owner-sidebar-navigation"
          className={cn('no-scrollbar flex min-h-0 flex-1 flex-col overflow-y-auto pb-2', collapsed ? 'gap-1' : 'px-3')}
        >
          {NAV_SECTIONS.map((section, sectionIndex) => (
            <div key={section.label} className={cn('shrink-0', collapsed && 'flex flex-col gap-1')}>
              {collapsed ? (
                sectionIndex > 0 && (
                  <span aria-hidden="true" className="mx-auto my-1 block h-px w-9 bg-white/10" />
                )
              ) : (
                <p
                  aria-hidden={collapsed || undefined}
                  className={cn(
                    'overflow-hidden px-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-white/40',
                    sectionIndex > 0 ? 'pt-4 pb-1.5' : 'pt-1 pb-1.5',
                  )}
                >
                  {section.label}
                </p>
              )}
              {section.items.map(({ label, href, icon, exact, children }) => {
            const active =
              isActive(href, exact) || (children?.some((child) => isActive(child.href, child.exact)) ?? false)
            const bugBadge = href === '/owner/bugs' && openBugs > 0 ? (
              <span
                className={cn(
                  'inline-flex items-center justify-center rounded-full bg-red-500 font-semibold text-white',
                  collapsed
                    ? 'absolute right-0.5 top-0.5 min-w-4 px-1 text-[9px] leading-4 ring-2 ring-[#0d1111]'
                    : 'min-w-5 px-1.5 text-[10px] leading-5',
                )}
                aria-label={`${openBugs} new bug ${openBugs === 1 ? 'report' : 'reports'}`}
              >
                {openBugs > 99 ? '99+' : openBugs}
              </span>
            ) : null

            return (
              <div key={href} className="shrink-0">
                <OwnerNavLink
                  href={href}
                  label={label}
                  icon={icon}
                  active={active}
                  collapsed={collapsed}
                  showTooltip={collapsed && railTooltipsReady}
                  className={collapsed ? undefined : 'mb-0.5'}
                  trailing={bugBadge}
                />

                {children && active && (
                  <div
                    data-testid="owner-active-submenu"
                    className={cn(
                      'relative flex flex-col gap-0.5 transition-[margin,padding,border-color] duration-300 ease-in-out motion-reduce:transition-none',
                      collapsed
                        ? 'my-1 border-y border-white/10 bg-white/[0.04] py-2'
                        : 'mt-0.5 mb-1',
                    )}
                  >
                    {!collapsed && (
                      <span
                        data-testid="owner-submenu-guide"
                        aria-hidden="true"
                        className="pointer-events-none absolute inset-y-0 left-4 z-10 w-px bg-sidebar-border"
                      />
                    )}
                    {children.map((child) => (
                      <OwnerNavLink
                        key={child.href}
                        href={child.href}
                        label={child.label}
                        icon={child.icon}
                        active={isActive(child.href, child.exact)}
                        collapsed={collapsed}
                        showTooltip={collapsed && railTooltipsReady}
                        activeClassName={SUBMENU_ACTIVE}
                        className={collapsed ? undefined : 'py-1.5 pl-10'}
                      />
                    ))}
                  </div>
                )}
              </div>
            )
          })}
            </div>
          ))}
        </nav>

        {collapsed ? (
          <div className="flex flex-col items-center gap-1 border-t border-white/10 px-3 py-3">
            <span
              aria-hidden="true"
              className="mb-1 grid size-8 place-items-center rounded-full bg-primary/20 text-sm font-semibold uppercase text-primary"
            >
              {userEmail[0]}
            </span>
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
                <p className="text-[10px] uppercase tracking-[0.14em] text-white/45">Owner</p>
              </div>
            </div>
            <div className="p-1.5">
              <SignOutButton />
            </div>
          </div>
        )}
      </aside>
    </TooltipProvider>
  )
}
