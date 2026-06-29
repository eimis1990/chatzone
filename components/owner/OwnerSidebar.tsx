'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboardIcon,
  UsersIcon,
  MicVocalIcon,
  MailIcon,
  MegaphoneIcon,
  BotIcon,
  SlidersHorizontalIcon,
  DatabaseIcon,
  type LucideIcon,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { SignOutButton } from '@/components/client/SignOutButton'

interface NavItem {
  label: string
  href: string
  icon: LucideIcon
  exact?: boolean
  /** Sub-items, shown indented (with a vertical line) when the section is active. */
  children?: { label: string; href: string; icon: LucideIcon; exact?: boolean }[]
}

const NAV: NavItem[] = [
  { label: 'Dashboard', href: '/owner', icon: LayoutDashboardIcon, exact: true },
  { label: 'Clients', href: '/owner/clients', icon: UsersIcon },
  {
    label: 'Our chatbot',
    href: '/owner/chatbot',
    icon: BotIcon,
    children: [
      { label: 'Configure', href: '/owner/chatbot', icon: SlidersHorizontalIcon, exact: true },
      { label: 'Knowledge', href: '/owner/chatbot/knowledge', icon: DatabaseIcon },
    ],
  },
  { label: 'Voices', href: '/owner/voices', icon: MicVocalIcon },
  { label: 'Signups', href: '/owner/signups', icon: MailIcon },
  { label: 'LinkedIn', href: '/owner/linkedin', icon: MegaphoneIcon },
]

export function OwnerSidebar({ userEmail }: { userEmail: string }) {
  const pathname = usePathname()

  const itemBase = 'flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm transition-colors'
  const solidGreen = 'bg-primary font-medium text-primary-foreground shadow-sm'
  const idle = 'text-sidebar-foreground/70 hover:bg-white/10 hover:text-white'
  // Active sub-item — accent text, no pill (matches the client app's sections).
  const textOnly = 'font-medium text-primary'

  const isActive = (href: string, exact?: boolean) =>
    exact ? pathname === href : pathname === href || pathname.startsWith(`${href}/`)

  return (
    <aside className="flex h-full w-64 flex-shrink-0 flex-col bg-transparent text-sidebar-foreground">
      {/* Logo */}
      <Link href="/owner" className="flex items-center gap-2 px-4 py-4 text-white">
        <img src="/loqara-logo-colorful.webp" alt="" aria-hidden="true" className="size-11 shrink-0" />
        <span className="text-2xl font-bold">
          Loqara<span className="font-[family-name:var(--font-lora)] text-[1.6rem] font-medium italic text-primary">.owner</span>
        </span>
      </Link>

      <p className="px-4 pb-1 text-xs font-medium tracking-wide text-white/45">Operator panel</p>

      <nav className="flex-1 overflow-y-auto px-2 pb-2">
        {NAV.map(({ label, href, icon: Icon, exact, children }) => {
          const active = isActive(href, exact)
          return (
            <div key={href}>
              <Link
                href={href}
                aria-current={active ? 'page' : undefined}
                className={cn(itemBase, 'mb-0.5', active ? solidGreen : idle)}
              >
                <Icon className="size-4 flex-shrink-0" aria-hidden="true" />
                <span className="flex-1">{label}</span>
              </Link>

              {/* Sub-items — revealed while the section is active, with a vertical line. */}
              {children && active && (
                <div className="mt-0.5 mb-1 ml-4 space-y-0.5 border-l border-sidebar-border pl-2">
                  {children.map((c) => {
                    const cActive = isActive(c.href, c.exact)
                    const CIcon = c.icon
                    return (
                      <Link
                        key={c.label}
                        href={c.href}
                        aria-current={cActive ? 'page' : undefined}
                        className={cn(itemBase, 'py-1.5', cActive ? textOnly : idle)}
                      >
                        <CIcon className="size-4 flex-shrink-0" aria-hidden="true" />
                        <span className="flex-1">{c.label}</span>
                      </Link>
                    )
                  })}
                </div>
              )}
            </div>
          )
        })}
      </nav>

      {/* Footer — user + sign out */}
      <div className="m-3 rounded-xl bg-[#1b1d1f] p-3 ring-1 ring-white/10">
        <p className="truncate px-1 pb-1.5 text-xs text-white/55" title={userEmail}>
          {userEmail}
        </p>
        <SignOutButton />
      </div>
    </aside>
  )
}
