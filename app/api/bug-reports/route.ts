import { createServerClient } from '@/lib/supabase/server'
import { bugReportSchema } from '@/lib/validation/schemas'
import { createRateLimiter } from '@/lib/ratelimit'

// A handful of reports per user; refills slowly.
const limiter = createRateLimiter({ capacity: 5, refillPerSec: 0.1 })

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })

/** Any signed-in user can file a bug report; RLS attributes it to them. */
export async function POST(req: Request) {
  const supabase = await createServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return json({ error: 'Unauthorized' }, 401)
  if (!limiter.check(user.id)) return json({ error: 'Too many reports — please wait a moment.' }, 429)

  const parsed = bugReportSchema.safeParse(await req.json().catch(() => null))
  if (!parsed.success) {
    return json({ error: 'Please add a short summary and a description.' }, 400)
  }

  // Attach the reporter's org (clients); null for the owner.
  const { data: membership } = await supabase
    .from('organization_members')
    .select('org_id')
    .eq('user_id', user.id)
    .limit(1)
    .maybeSingle()

  const { error } = await supabase.from('bug_reports').insert({
    reporter_id: user.id,
    reporter_email: user.email ?? null,
    org_id: membership?.org_id ?? null,
    title: parsed.data.title,
    description: parsed.data.description,
    page: parsed.data.page ?? null,
    user_agent: parsed.data.userAgent ?? null,
  })
  if (error) return json({ error: 'Could not save your report. Please try again.' }, 500)

  return json({ ok: true })
}
