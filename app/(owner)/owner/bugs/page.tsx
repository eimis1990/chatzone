import { requireRole } from '@/lib/auth/guards'
import { createServerClient } from '@/lib/supabase/server'
import { BugReportsTable } from '@/components/owner/BugReportsTable'
import type { BugReport } from '@/lib/types'

export const metadata = { title: 'Bug reports' }

export default async function BugReportsPage() {
  await requireRole('owner')

  const supabase = await createServerClient()
  const { data } = await supabase
    .from('bug_reports')
    .select('id, reporter_email, org_id, title, description, page, user_agent, status, created_at, updated_at')
    .order('created_at', { ascending: false })

  const rows = (data ?? []) as BugReport[]
  const openCount = rows.filter((r) => r.status === 'open').length

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-lg font-semibold">Bug reports</h1>
        <p className="text-sm text-muted-foreground">
          {rows.length === 0
            ? 'Reports filed from the app appear here.'
            : `${rows.length} total · ${openCount} new`}
        </p>
      </div>

      {rows.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed bg-card py-20 text-center">
          <p className="font-medium text-foreground">No bugs reported</p>
          <p className="text-sm text-muted-foreground">
            When someone uses &ldquo;Report a bug&rdquo; in the sidebar, it shows up here.
          </p>
        </div>
      ) : (
        <BugReportsTable rows={rows} />
      )}
    </div>
  )
}
