import { requireRole } from '@/lib/auth/guards'
import { createServerClient } from '@/lib/supabase/server'
import { formatDistanceToNow } from '@/lib/date-utils'
import { Badge } from '@/components/ui/badge'
import { SignupsExport } from '@/components/owner/SignupsExport'

interface SignupRow {
  id: string
  email: string
  source: string | null
  created_at: string
}

type BadgeVariant = 'default' | 'secondary' | 'destructive' | 'outline'

export default async function SignupsPage() {
  await requireRole('owner')

  const supabase = await createServerClient()
  const [{ data: signupData }, { data: inviteData }] = await Promise.all([
    supabase.from('signups').select('id, email, source, created_at').order('created_at', { ascending: false }),
    supabase.from('invites').select('email, status, created_at').order('created_at', { ascending: false }),
  ])

  const rows = (signupData ?? []) as SignupRow[]
  const invites = (inviteData ?? []) as { email: string; status: string }[]

  // Latest invite status per email (invites are ordered newest-first).
  const inviteByEmail = new Map<string, string>()
  for (const inv of invites) {
    const key = inv.email.toLowerCase()
    if (!inviteByEmail.has(key)) inviteByEmail.set(key, inv.status)
  }

  function inviteState(email: string): { label: string; variant: BadgeVariant } {
    const s = inviteByEmail.get(email.toLowerCase())
    if (!s) return { label: 'Not invited', variant: 'outline' }
    if (s === 'accepted') return { label: 'Accepted', variant: 'default' }
    if (s === 'expired') return { label: 'Invite expired', variant: 'destructive' }
    return { label: 'Invited — waiting', variant: 'secondary' }
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-lg font-semibold">Early-access signups</h1>
          <p className="text-sm text-muted-foreground">Emails captured from the landing page.</p>
        </div>
        {rows.length > 0 && <SignupsExport rows={rows} />}
      </div>

      {rows.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed bg-card py-20 text-center">
          <p className="font-medium text-foreground">No signups yet</p>
          <p className="text-sm text-muted-foreground">
            Emails from the landing page&apos;s &ldquo;Get started&rdquo; forms will appear here.
          </p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {rows.map((s) => {
            const st = inviteState(s.email)
            return (
              <div
                key={s.id}
                className="flex flex-col gap-3 rounded-xl border bg-card p-4 shadow-sm transition-shadow hover:shadow-md"
              >
                <div className="flex items-start justify-between gap-2">
                  <a
                    href={`mailto:${s.email}`}
                    className="min-w-0 truncate font-medium hover:underline"
                    title={s.email}
                  >
                    {s.email}
                  </a>
                  <Badge variant={st.variant} className="shrink-0 whitespace-nowrap">
                    {st.label}
                  </Badge>
                </div>
                <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
                  <span className="rounded bg-muted px-1.5 py-0.5 font-medium">{s.source ?? 'unknown'}</span>
                  <span>· signed up {formatDistanceToNow(s.created_at)}</span>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
