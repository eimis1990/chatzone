import { requireRole } from '@/lib/auth/guards'
import { createServerClient } from '@/lib/supabase/server'
import { companyNameFromWebsite } from '@/lib/invites'
import { SignupsExport } from '@/components/owner/SignupsExport'
import { SignupCard, type SignupCardData } from '@/components/owner/SignupCard'

interface SignupRow {
  id: string
  email: string
  website: string | null
  source: string | null
  status: string | null
  invited_at: string | null
  created_at: string
}

export default async function SignupsPage() {
  await requireRole('owner')

  const supabase = await createServerClient()
  const [{ data: signupData }, { data: inviteData }] = await Promise.all([
    supabase
      .from('signups')
      .select('id, email, website, source, status, invited_at, created_at')
      .order('created_at', { ascending: false }),
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

  const cards: SignupCardData[] = rows.map((s) => ({
    ...s,
    inviteStatus: inviteByEmail.get(s.email.toLowerCase()) ?? null,
    suggestedName: companyNameFromWebsite(s.website),
  }))

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-lg font-semibold">Signups</h1>
          <p className="text-sm text-muted-foreground">
            Prospects from the landing page — send an invitation to turn one into a client.
          </p>
        </div>
        {rows.length > 0 && <SignupsExport rows={rows} />}
      </div>

      {rows.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed bg-card py-20 text-center">
          <p className="font-medium text-foreground">No signups yet</p>
          <p className="text-sm text-muted-foreground">
            Requests from the landing page&apos;s &ldquo;Get started&rdquo; dialog will appear here.
          </p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {cards.map((s) => (
            <SignupCard key={s.id} signup={s} />
          ))}
        </div>
      )}
    </div>
  )
}
