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

  // Same shell as the client app: the desktop content surface meets the
  // sidebar directly while retaining its outer top, right, and bottom gutter.
  return (
    <>
      <div className="relative isolate flex h-svh overflow-hidden bg-sidebar-mesh">
        <OwnerSidebar userEmail={user.email ?? ''} openBugs={openBugs ?? 0} />
        <main className="my-3 mr-3 min-h-0 min-w-0 flex-1 overflow-y-auto rounded-2xl bg-background shadow-sm">
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
