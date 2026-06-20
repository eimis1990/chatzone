import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createServiceClient } from '@/lib/supabase/service'
import type { Invite } from '@/lib/types'

const acceptSchema = z.object({
  token: z.string().min(1),
  fullName: z.string().min(1).max(120),
  password: z.string().min(8),
})

export async function POST(request: NextRequest) {
  // ── Parse + validate ──────────────────────────────────────────────────────
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const parsed = acceptSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Validation failed', issues: parsed.error.flatten().fieldErrors },
      { status: 422 },
    )
  }

  const { token, fullName, password } = parsed.data
  const service = createServiceClient()

  // ── Look up the invite ────────────────────────────────────────────────────
  const { data: invite } = await service
    .from('invites')
    .select('*')
    .eq('token', token)
    .single<Invite>()

  if (!invite) {
    return NextResponse.json({ error: 'Invalid or expired invite.' }, { status: 404 })
  }

  if (invite.status !== 'pending') {
    return NextResponse.json(
      { error: 'This invite has already been used or has expired.' },
      { status: 409 },
    )
  }

  if (new Date(invite.expires_at) < new Date()) {
    // Mark as expired so subsequent lookups are fast.
    await service.from('invites').update({ status: 'expired' }).eq('id', invite.id)
    return NextResponse.json({ error: 'This invite link has expired.' }, { status: 410 })
  }

  // ── Create auth user ──────────────────────────────────────────────────────
  // The DB trigger auto-creates a `profiles` row with role = 'client'.
  const { data: authData, error: createError } = await service.auth.admin.createUser({
    email: invite.email,
    password,
    email_confirm: true, // skip email confirmation since the invite proves ownership
    user_metadata: { full_name: fullName },
  })

  if (createError || !authData.user) {
    console.error('[accept-invite] createUser error:', createError)

    // Friendly message for the common "already registered" case.
    if (createError?.message?.toLowerCase().includes('already registered')) {
      return NextResponse.json(
        { error: 'An account with this email already exists. Please sign in instead.' },
        { status: 409 },
      )
    }

    return NextResponse.json({ error: 'Failed to create account. Please try again.' }, { status: 500 })
  }

  const newUserId = authData.user.id

  // ── Update profile with full name (trigger creates the row; we update it) ─
  const { error: profileError } = await service
    .from('profiles')
    .update({ full_name: fullName })
    .eq('id', newUserId)

  if (profileError) {
    // Non-fatal — the account is created; just log.
    console.warn('[accept-invite] profile update error:', profileError)
  }

  // ── Insert organization_members row ───────────────────────────────────────
  const { error: memberError } = await service.from('organization_members').insert({
    org_id: invite.org_id,
    user_id: newUserId,
    role: 'admin',
  })

  if (memberError) {
    console.error('[accept-invite] organization_members insert error:', memberError)
    // Best-effort: delete the auth user we just created to avoid orphans.
    await service.auth.admin.deleteUser(newUserId)
    return NextResponse.json(
      { error: 'Failed to add you to the organization. Please contact your administrator.' },
      { status: 500 },
    )
  }

  // ── Mark invite as accepted ───────────────────────────────────────────────
  const { error: acceptError } = await service
    .from('invites')
    .update({ status: 'accepted' })
    .eq('id', invite.id)

  if (acceptError) {
    // Not a fatal error for the user; they are registered and in the org.
    console.warn('[accept-invite] invite accept update error:', acceptError)
  }

  return NextResponse.json({ ok: true }, { status: 201 })
}
