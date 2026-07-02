import { NextRequest, NextResponse } from 'next/server'
import { getSessionUser } from '@/lib/auth/guards'
import { createServiceClient } from '@/lib/supabase/service'
import { createInviteSchema } from '@/lib/validation/schemas'
import { createClientInvite } from '@/lib/invites'

export async function POST(request: NextRequest) {
  // ── Auth: must be signed in as owner ─────────────────────────────────────
  const session = await getSessionUser()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  if (session.profile.role !== 'owner') {
    return NextResponse.json({ error: 'Forbidden: owner role required' }, { status: 403 })
  }

  // ── Parse + validate request body ────────────────────────────────────────
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const parsed = createInviteSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Validation failed', issues: parsed.error.flatten().fieldErrors },
      { status: 422 },
    )
  }

  const { email, orgName } = parsed.data
  const service = createServiceClient()

  const result = await createClientInvite(service, { email, orgName, invitedBy: session.id })
  if ('error' in result) {
    return NextResponse.json({ error: result.error }, { status: 500 })
  }
  return NextResponse.json({ inviteUrl: result.inviteUrl }, { status: 201 })
}
