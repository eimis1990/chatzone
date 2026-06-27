'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboardIcon,
  UsersIcon,
  MicVocalIcon,
  MailIcon,
  type LucideIcon,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { LoqaraIcon } from '@/components/LoqaraIcon'
import { SignOutButton } from '@/components/client/SignOutButton'

const NAV: { label: string; href: string; icon: LucideIcon; exact?: boolean }[] = [
  { label: 'Dashboard', href: '/owner', icon: LayoutDashboardIcon, exact: true },
  { label: 'Clients', href: '/owner/clients', icon: UsersIcon },
  { label: 'Voices', href: '/owner/voices', icon: MicVocalIcon },
  { label: 'Signups', href: '/owner/signups', icon: MailIcon },
]

export function OwnerSidebar({ userEmail }: { userEmail: string }) {
  const pathname = usePathname()

  const itemBase = 'flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm transition-colors'
  const solidGreen = 'bg-primary font-medium text-primary-foreground shadow-sm'
  const idle = 'text-sidebar-foreground/70 hover:bg-white/10 hover:text-white'

  return (
    <aside className="flex h-full w-64 flex-shrink-0 flex-col bg-transparent text-sidebar-foreground">
      {/* Logo */}
      <Link href="/owner" className="flex items-center gap-1 px-4 py-4 text-white">
        <LoqaraIcon className="size-14" />
        <span className="text-2xl font-bold">
          Loqara<span className="text-primary">.owner</span>
        </span>
      </Link>

      <p className="px-4 pb-1 text-xs font-medium tracking-wide text-white/45">Operator panel</p>

      <nav className="flex-1 overflow-y-auto px-2 pb-2">
        {NAV.map(({ label, href, icon: Icon, exact }) => {
          const active = exact ? pathname === href : pathname === href || pathname.startsWith(`${href}/`)
          return (
            <Link
              key={href}
              href={href}
              aria-current={active ? 'page' : undefined}
              className={cn(itemBase, 'mb-0.5', active ? solidGreen : idle)}
            >
              <Icon className="size-4 flex-shrink-0" aria-hidden="true" />
              <span className="flex-1">{label}</span>
            </Link>
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
