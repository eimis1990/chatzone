'use server'

import { revalidatePath } from 'next/cache'
import { getSessionUser } from '@/lib/auth/guards'
import { createServiceClient } from '@/lib/supabase/service'
import { createClientInvite } from '@/lib/invites'
import { sendEmail, emailEnabled } from '@/lib/email'
import { clientInviteEmail } from '@/lib/notify'

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
