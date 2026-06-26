import { MailIcon } from 'lucide-react'
import { requireRole } from '@/lib/auth/guards'
import { createServerClient } from '@/lib/supabase/server'
import { formatDistanceToNow } from '@/lib/date-utils'
import { StatCard } from '@/components/client/charts/StatCard'
import { SignupsExport } from '@/components/owner/SignupsExport'

interface SignupRow {
  id: string
  email: string
  source: string | null
  created_at: string
}

export default async function SignupsPage() {
  await requireRole('owner')

  const supabase = await createServerClient()
  const { data } = await supabase
    .from('signups')
    .select('id, email, source, created_at')
    .order('created_at', { ascending: false })

  const rows = (data ?? []) as SignupRow[]

  return (
    <div className="max-w-4xl space-y-6 p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-lg font-semibold">Early-access signups</h1>
          <p className="text-sm text-muted-foreground">Emails captured from the landing page.</p>
        </div>
        {rows.length > 0 && <SignupsExport rows={rows} />}
      </div>

      <div className="grid grid-cols-2 gap-4 sm:max-w-xs">
        <StatCard label="Signups" value={rows.length} icon={MailIcon} accent="green" />
      </div>

      {rows.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed bg-card py-20 text-center">
          <p className="font-medium text-foreground">No signups yet</p>
          <p className="text-sm text-muted-foreground">
            Emails from the landing page&apos;s &ldquo;Get started&rdquo; forms will appear here.
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border bg-card">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/40">
                <th className="px-5 py-3 text-left font-medium text-muted-foreground">Email</th>
                <th className="px-5 py-3 text-left font-medium text-muted-foreground">Source</th>
                <th className="px-5 py-3 text-left font-medium text-muted-foreground">Signed up</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {rows.map((s) => (
                <tr key={s.id} className="transition-colors hover:bg-muted/30">
                  <td className="px-5 py-3 font-medium">
                    <a href={`mailto:${s.email}`} className="hover:underline">
                      {s.email}
                    </a>
                  </td>
                  <td className="px-5 py-3 text-muted-foreground">{s.source ?? '—'}</td>
                  <td className="px-5 py-3 text-muted-foreground">{formatDistanceToNow(s.created_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
