import { requireRole } from '@/lib/auth/guards'
import { OwnerSidebar } from '@/components/owner/OwnerSidebar'
import { Toaster } from '@/components/ui/sonner'

export default async function OwnerLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const user = await requireRole('owner')

  // Same shell as the client app: dark mesh with a white rounded content card.
  return (
    <div className="relative isolate flex h-svh overflow-hidden bg-sidebar-mesh">
      <div className="shell-grid pointer-events-none absolute inset-x-0 bottom-0 -z-10 h-[42vh]" aria-hidden="true" />
      <OwnerSidebar userEmail={user.email ?? ''} />
      <main className="flex-1 min-h-0 min-w-0 m-3 overflow-y-auto rounded-2xl bg-background shadow-sm">
        {children}
      </main>
      <Toaster />
    </div>
  )
}
