import { requireRole } from '@/lib/auth/guards'
import { createServerClient } from '@/lib/supabase/server'
import { formatDistanceToNow } from '@/lib/date-utils'
import { BugStatusSelect } from '@/components/owner/BugStatusSelect'
import type { BugReport } from '@/lib/types'

export const metadata = { title: 'Bug reports' }

export default async function BugReportsPage() {
  await requireRole('owner')

  const supabase = await createServerClient()
  const { data } = await supabase
    .from('bug_reports')
    .select('id, reporter_email, org_id, title, description, page, status, created_at, updated_at')
    .order('created_at', { ascending: false })

  const rows = (data ?? []) as BugReport[]
  const openCount = rows.filter((r) => r.status !== 'resolved').length

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-lg font-semibold">Bug reports</h1>
        <p className="text-sm text-muted-foreground">
          {rows.length === 0
            ? 'Reports filed from the app appear here.'
            : `${rows.length} total · ${openCount} open`}
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
        <div className="overflow-x-auto rounded-xl border bg-card">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-xs uppercase tracking-wide text-muted-foreground">
                <th className="px-4 py-3 font-medium whitespace-nowrap">Reported</th>
                <th className="px-4 py-3 font-medium">Reporter</th>
                <th className="px-4 py-3 font-medium">Bug</th>
                <th className="px-4 py-3 font-medium">Page</th>
                <th className="px-4 py-3 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((b) => (
                <tr key={b.id} className="border-b align-top last:border-0">
                  <td
                    className="whitespace-nowrap px-4 py-3 text-muted-foreground"
                    title={new Date(b.created_at).toLocaleString()}
                  >
                    {formatDistanceToNow(b.created_at)}
                  </td>
                  <td className="px-4 py-3">
                    {b.reporter_email ? (
                      <a href={`mailto:${b.reporter_email}`} className="hover:underline">
                        {b.reporter_email}
                      </a>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </td>
                  <td className="max-w-md px-4 py-3">
                    <p className="font-medium text-foreground">{b.title}</p>
                    <p className="mt-0.5 whitespace-pre-wrap text-muted-foreground">{b.description}</p>
                  </td>
                  <td className="px-4 py-3">
                    {b.page ? (
                      <code className="rounded bg-muted px-1.5 py-0.5 text-xs">{b.page}</code>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <BugStatusSelect id={b.id} status={b.status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
