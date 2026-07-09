import { requireRole } from '@/lib/auth/guards'
import { createServerClient } from '@/lib/supabase/server'
import { companyNameFromWebsite } from '@/lib/invites'
import { SignupsExport } from '@/components/owner/SignupsExport'
import { SignupCard, type SignupCardData } from '@/components/owner/SignupCard'

interface SignupRow {
  id: string
  email: string
  company: string | null
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
      .select('id, email, company, website, source, status, invited_at, created_at')
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
    // Their own stated company name wins; the domain guess is the fallback.
    suggestedName: s.company?.trim() || companyNameFromWebsite(s.website),
  }))

  // Group by lifecycle stage so each section's cards are uniform (New cards have
  // an invite form, Invited have a resend, Accepted are done) — no ragged rows.
  const isAccepted = (c: SignupCardData) => c.inviteStatus === 'accepted'
  const isInvited = (c: SignupCardData) =>
    !isAccepted(c) &&
    (c.status === 'invited' || c.inviteStatus === 'pending' || c.inviteStatus === 'expired')
  const newCards = cards.filter((c) => !isAccepted(c) && !isInvited(c))
  const invitedCards = cards.filter(isInvited)
  const acceptedCards = cards.filter(isAccepted)

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
        <div className="space-y-8">
          <SignupSection title="New" cards={newCards} />
          <SignupSection title="Invited" cards={invitedCards} />
          <SignupSection title="Accepted" cards={acceptedCards} />
        </div>
      )}
    </div>
  )
}

/** A labelled group of signup cards (hidden when empty). */
function SignupSection({ title, cards }: { title: string; cards: SignupCardData[] }) {
  if (cards.length === 0) return null
  return (
    <section className="space-y-3">
      <h2 className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
        {title}
        <span className="rounded-full bg-muted px-1.5 py-0.5 text-xs font-medium">{cards.length}</span>
      </h2>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {cards.map((s) => (
          <SignupCard key={s.id} signup={s} />
        ))}
      </div>
    </section>
  )
}
