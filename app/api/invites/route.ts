import { NextRequest, NextResponse } from 'next/server'
import { getSessionUser } from '@/lib/auth/guards'
import { createServiceClient } from '@/lib/supabase/service'
import { createInviteSchema } from '@/lib/validation/schemas'
import { getEnv } from '@/lib/env'

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
  const env = getEnv()
  const service = createServiceClient()

  // ── Create organization row ───────────────────────────────────────────────
  const slug = orgName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')

  const { data: org, error: orgError } = await service
    .from('organizations')
    .insert({ name: orgName, slug, status: 'active', created_by: session.id })
    .select('id')
    .single<{ id: string }>()

  if (orgError || !org) {
    console.error('[invites] org insert error:', orgError)
    return NextResponse.json({ error: 'Failed to create organization' }, { status: 500 })
  }

  // ── Create invite row ─────────────────────────────────────────────────────
  // expires_at: 7 days from now
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()

  const { data: invite, error: inviteError } = await service
    .from('invites')
    .insert({
      org_id: org.id,
      email,
      status: 'pending',
      expires_at: expiresAt,
      invited_by: session.id,
    })
    .select('token')
    .single<{ token: string }>()

  if (inviteError || !invite) {
    console.error('[invites] invite insert error:', inviteError)
    // Best-effort rollback the org we just created.
    await service.from('organizations').delete().eq('id', org.id)
    return NextResponse.json({ error: 'Failed to create invite' }, { status: 500 })
  }

  const inviteUrl = `${env.NEXT_PUBLIC_APP_URL}/accept-invite/${invite.token}`

  return NextResponse.json({ inviteUrl }, { status: 201 })
}
