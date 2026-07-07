import { PhoneIcon, MailIcon, UsersIcon } from 'lucide-react'
import { requireRole, getUserOrgIds } from '@/lib/auth/guards'
import { createServerClient } from '@/lib/supabase/server'
import { formatDistanceToNow } from '@/lib/date-utils'
import type { Lead } from '@/lib/types'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const PHONE_RE = /^[+()\d][\d\s()+-]{5,}$/

/** Pull the first email/phone-looking value out of a lead's dynamic fields. */
function contacts(fields: Record<string, string>) {
  let email: string | null = null
  let phone: string | null = null
  for (const [k, v] of Object.entries(fields)) {
    const val = String(v ?? '').trim()
    if (!email && (EMAIL_RE.test(val) || /e-?mail|paštas|paste/i.test(k))) email = val
    else if (!phone && (PHONE_RE.test(val) || /phone|tel|telefon/i.test(k))) phone = val
  }
  return { email, phone }
}

/** Cross-bot leads for the mobile portal — newest first, tap to call/email. */
export default async function MobileLeadsPage() {
  await requireRole('client')
  const orgId = (await getUserOrgIds())[0] ?? null
  const supabase = await createServerClient()

  const { data: botRows } = orgId
    ? await supabase.from('bots').select('id, name').eq('org_id', orgId)
    : { data: [] }
  const botName = new Map((botRows ?? []).map((b) => [b.id as string, b.name as string]))
  const botIds = [...botName.keys()]

  const { data: rawLeads } = botIds.length
    ? await supabase
        .from('leads')
        .select('id, bot_id, fields, created_at')
        .in('bot_id', botIds)
        .order('created_at', { ascending: false })
        .limit(200)
    : { data: [] }
  const leads = (rawLeads ?? []) as Lead[]

  return (
    <div className="space-y-4 p-4">
      <div>
        <h1 className="text-lg font-semibold">Leads</h1>
        <p className="text-sm text-muted-foreground">
          {leads.length} captured across your bots — tap to call or email.
        </p>
      </div>

      {leads.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed bg-card py-16 text-center">
          <UsersIcon className="size-6 text-muted-foreground/50" aria-hidden="true" />
          <p className="font-medium">No leads yet</p>
          <p className="text-sm text-muted-foreground">
            Leads appear here when visitors fill in your bot&apos;s contact form.
          </p>
        </div>
      ) : (
        <ul className="space-y-2.5">
          {leads.map((lead) => {
            const { email, phone } = contacts(lead.fields)
            // Prefer a name-ish field for the title; fall back to first value.
            const title =
              Object.entries(lead.fields).find(([k]) => /name|vard/i.test(k))?.[1] ||
              Object.values(lead.fields)[0] ||
              'Lead'
            const detail = Object.entries(lead.fields)
              .map(([k, v]) => `${k}: ${v}`)
              .join(' · ')
            return (
              <li key={lead.id} className="rounded-xl border bg-card p-3.5">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate font-medium">{title}</p>
                    <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">{detail}</p>
                    <p className="mt-1 text-[11px] text-muted-foreground/70">
                      {botName.get(lead.bot_id) ?? 'Bot'} · {formatDistanceToNow(lead.created_at)}
                    </p>
                  </div>
                  <div className="flex flex-shrink-0 gap-1.5">
                    {phone && (
                      <a
                        href={`tel:${phone.replace(/\s/g, '')}`}
                        aria-label={`Call ${title}`}
                        className="flex size-9 items-center justify-center rounded-full bg-primary/10 text-primary transition-colors hover:bg-primary/20"
                      >
                        <PhoneIcon className="size-4" />
                      </a>
                    )}
                    {email && (
                      <a
                        href={`mailto:${email}`}
                        aria-label={`Email ${title}`}
                        className="flex size-9 items-center justify-center rounded-full bg-primary/10 text-primary transition-colors hover:bg-primary/20"
                      >
                        <MailIcon className="size-4" />
                      </a>
                    )}
                  </div>
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
