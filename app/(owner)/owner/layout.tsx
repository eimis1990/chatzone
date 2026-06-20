import Link from 'next/link'
import { LayoutDashboardIcon, UsersIcon, ShieldIcon, MicVocalIcon } from 'lucide-react'
import { requireRole } from '@/lib/auth/guards'
import { SignOutButton } from '@/components/client/SignOutButton'

const NAV_LINKS = [
  { label: 'Dashboard', href: '/owner', icon: LayoutDashboardIcon },
  { label: 'Clients', href: '/owner/clients', icon: UsersIcon },
  { label: 'Voices', href: '/owner/voices', icon: MicVocalIcon },
] as const

export default async function OwnerLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const user = await requireRole('owner')

  return (
    <div className="flex min-h-svh flex-col">
      {/* Top navigation bar */}
      <header className="sticky top-0 z-40 flex h-14 items-center border-b bg-background px-4 gap-4">
        <Link
          href="/owner"
          className="flex items-center gap-2 font-semibold text-foreground"
        >
          <ShieldIcon className="size-5 text-primary" />
          <span>ChatbotZone — Owner</span>
        </Link>

        <nav className="flex items-center gap-1 ml-4">
          {NAV_LINKS.map(({ label, href, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground px-2 py-1 rounded-md hover:bg-muted transition-colors"
            >
              <Icon className="size-4" />
              {label}
            </Link>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-3">
          <span className="text-sm text-muted-foreground hidden sm:block">
            {user.email}
          </span>
          <SignOutButton />
        </div>
      </header>

      {/* Page content */}
      <main className="flex-1 p-6">{children}</main>
    </div>
  )
}
