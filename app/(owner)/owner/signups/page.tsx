import { requireRole } from '@/lib/auth/guards'
import { createServerClient } from '@/lib/supabase/server'
import { formatDistanceToNow } from '@/lib/date-utils'
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
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Early-access signups</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {rows.length} {rows.length === 1 ? 'person has' : 'people have'} requested access from the
            landing page.
          </p>
        </div>
        <SignupsExport rows={rows} />
      </div>

      {rows.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed py-20 text-center">
          <p className="font-medium text-foreground">No signups yet</p>
          <p className="text-sm text-muted-foreground">
            Emails from the landing page&apos;s &ldquo;Get started&rdquo; forms will appear here.
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/40">
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Email</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Source</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Signed up</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {rows.map((s) => (
                <tr key={s.id} className="transition-colors hover:bg-muted/30">
                  <td className="px-4 py-3 font-medium">
                    <a href={`mailto:${s.email}`} className="hover:underline">
                      {s.email}
                    </a>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{s.source ?? '—'}</td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {formatDistanceToNow(s.created_at)}
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
