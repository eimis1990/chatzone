import Link from 'next/link'
import { BotIcon } from 'lucide-react'
import { requireRole } from '@/lib/auth/guards'
import { SignOutButton } from '@/components/client/SignOutButton'

export default async function ClientLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const user = await requireRole('client')

  return (
    <div className="flex min-h-svh flex-col">
      {/* Top navigation bar */}
      <header className="sticky top-0 z-40 flex h-14 items-center border-b bg-background px-4 gap-4">
        <Link
          href="/app"
          className="flex items-center gap-2 font-semibold text-foreground"
        >
          <BotIcon className="size-5 text-primary" />
          <span>ChatbotZone</span>
        </Link>

        <nav className="flex items-center gap-1 ml-4">
          <Link
            href="/app"
            className="text-sm text-muted-foreground hover:text-foreground px-2 py-1 rounded-md hover:bg-muted transition-colors"
          >
            My Bots
          </Link>
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
