'use server'

import { revalidatePath } from 'next/cache'
import { getSessionUser } from '@/lib/auth/guards'
import { createServiceClient } from '@/lib/supabase/service'
import { createClientInvite } from '@/lib/invites'
import { sendEmail, emailEnabled } from '@/lib/email'
import { clientInviteEmail } from '@/lib/notify'
import { getEnv } from '@/lib/env'

/**
 * Re-send an invitation email for an already-invited signup. Reuses the
 * pending invite when it's still valid; mints a fresh 7-day token for the
 * SAME organization when the old one expired.
 */
export async function resendInvitation(
  signupId: string,
): Promise<{ ok: true; inviteUrl: string; emailed: boolean } | { ok: false; error: string }> {
  const session = await getSessionUser()
  if (!session || session.profile.role !== 'owner') {
    return { ok: false, error: 'Owner role required' }
  }
  const svc = createServiceClient()
  const { data: signup } = await svc
    .from('signups')
    .select('id, email')
    .eq('id', signupId)
    .single<{ id: string; email: string }>()
  if (!signup) return { ok: false, error: 'Signup not found.' }

  const { data: invite } = await svc
    .from('invites')
    .select('org_id, token, status, expires_at')
    .eq('email', signup.email)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle<{ org_id: string; token: string; status: string; expires_at: string }>()
  if (!invite) return { ok: false, error: 'No invitation found — use Send invitation instead.' }
  if (invite.status === 'accepted') return { ok: false, error: 'Already accepted.' }

  let token = invite.token
  const expired = invite.status !== 'pending' || invite.expires_at <= new Date().toISOString()
  if (expired) {
    const { data: fresh, error: freshErr } = await svc
      .from('invites')
      .insert({
        org_id: invite.org_id,
        email: signup.email,
        status: 'pending',
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        invited_by: session.id,
      })
      .select('token')
      .single<{ token: string }>()
    if (freshErr || !fresh) return { ok: false, error: 'Failed to renew the invitation.' }
    token = fresh.token
  }

  const { data: org } = await svc
    .from('organizations')
    .select('name')
    .eq('id', invite.org_id)
    .single<{ name: string }>()
  const inviteUrl = `${getEnv().NEXT_PUBLIC_APP_URL}/accept-invite/${token}`
  let emailed = false
  if (emailEnabled()) {
    emailed = await sendEmail({
      to: [signup.email],
      ...clientInviteEmail(org?.name ?? 'your workspace', inviteUrl),
    })
  }
  await svc.from('signups').update({ invited_at: new Date().toISOString() }).eq('id', signup.id)
  revalidatePath('/owner/signups')
  return { ok: true, inviteUrl, emailed }
}

/** Remove a signup from the list entirely (does not touch any created org/invite). */
export async function deleteSignup(signupId: string): Promise<{ ok: boolean; error?: string }> {
  const session = await getSessionUser()
  if (!session || session.profile.role !== 'owner') {
    return { ok: false, error: 'Owner role required' }
  }
  const svc = createServiceClient()
  const { error } = await svc.from('signups').delete().eq('id', signupId)
  if (error) return { ok: false, error: error.message }
  revalidatePath('/owner/signups')
  return { ok: true }
}

/**
 * One click from /owner/signups: turn a prospect into a client — create their
 * organization, generate the 7-day invite, and email them the signup link.
 */
export async function sendInvitation(
  signupId: string,
  orgName: string,
): Promise<{ ok: true; inviteUrl: string; emailed: boolean } | { ok: false; error: string }> {
  const session = await getSessionUser()
  if (!session || session.profile.role !== 'owner') {
    return { ok: false, error: 'Owner role required' }
  }
  const name = orgName.trim()
  if (!name) return { ok: false, error: 'Enter a company name.' }
  if (name.length > 80) return { ok: false, error: 'Company name is too long.' }

  const svc = createServiceClient()
  const { data: signup } = await svc
    .from('signups')
    .select('id, email, status')
    .eq('id', signupId)
    .single<{ id: string; email: string; status: string | null }>()
  if (!signup) return { ok: false, error: 'Signup not found.' }
  if (signup.status === 'invited') return { ok: false, error: 'Already invited.' }

  const result = await createClientInvite(svc, {
    email: signup.email,
    orgName: name,
    invitedBy: session.id,
  })
  if ('error' in result) return { ok: false, error: result.error }

  // Email the prospect their signup link (fall back to manual copy if email
  // is unconfigured or fails — the URL is returned either way).
  let emailed = false
  if (emailEnabled()) {
    emailed = await sendEmail({
      to: [signup.email],
      ...clientInviteEmail(name, result.inviteUrl),
    })
  }

  await svc
    .from('signups')
    .update({ status: 'invited', invited_at: new Date().toISOString() })
    .eq('id', signup.id)

  revalidatePath('/owner/signups')
  return { ok: true, inviteUrl: result.inviteUrl, emailed }
}
