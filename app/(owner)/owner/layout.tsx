import type { Metadata } from 'next'
import { requireRole } from '@/lib/auth/guards'
import { createServerClient } from '@/lib/supabase/server'
import { OwnerSidebar } from '@/components/owner/OwnerSidebar'
import { Toaster } from '@/components/ui/sonner'

// Owner console is private — auth protects it; this keeps crawlers from indexing it.
export const metadata: Metadata = { robots: { index: false, follow: false } }

export default async function OwnerLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const user = await requireRole('owner')

  // Badge the sidebar with the count of untriaged ("open") bug reports.
  const supabase = await createServerClient()
  const { count: openBugs } = await supabase
    .from('bug_reports')
    .select('id', { count: 'exact', head: true })
    .eq('status', 'open')

  // Same shell as the client app: dark mesh with a white rounded content card.
  return (
    <>
      <div className="relative isolate flex h-svh overflow-hidden bg-sidebar-mesh">
        <div className="shell-grid pointer-events-none absolute inset-x-0 bottom-0 -z-10 h-[42vh]" aria-hidden="true" />
        <OwnerSidebar userEmail={user.email ?? ''} openBugs={openBugs ?? 0} />
        <main className="flex-1 min-h-0 min-w-0 m-3 overflow-y-auto rounded-2xl bg-background shadow-sm">
          {children}
        </main>
      </div>
      {/* OUTSIDE the isolate stacking context: the widget preview portals to
          document.body (z-45), which out-stacks anything inside the layout —
          toasts must live at the same body level to render above it. */}
      <Toaster />
    </>
  )
}
