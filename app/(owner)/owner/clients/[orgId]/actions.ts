'use server'

import { revalidatePath } from 'next/cache'
import { requireRole } from '@/lib/auth/guards'
import { createServiceClient } from '@/lib/supabase/service'
import { createBotInOrg } from '@/lib/bots/create'
import { duplicateDemoBot } from '@/lib/bots/duplicate'
import { sendEmail, emailEnabled } from '@/lib/email'
import { clientInviteEmail } from '@/lib/notify'
import { getEnv } from '@/lib/env'
import type { OrgStatus } from '@/lib/types'

/**
 * Toggles an organisation's status between 'active' and 'suspended'.
 * Only the owner role may call this action.
 */
export async function toggleOrgStatus(
  orgId: string,
  currentStatus: 'active' | 'suspended',
): Promise<void> {
  await requireRole('owner')

  const nextStatus: OrgStatus = currentStatus === 'active' ? 'suspended' : 'active'

  const service = createServiceClient()
  const { error } = await service
    .from('organizations')
    .update({ status: nextStatus })
    .eq('id', orgId)

  if (error) {
    throw new Error(`Failed to update organisation status: ${error.message}`)
  }
}

/**
 * Create a bot for a client org on the client's behalf (owner "done-for-you"
 * setup) — used when a client accepted their invite but never created a first
 * bot. Owner-only; enforces the client plan's bot limit like the client flow.
 */
export async function createBotForOrg(
  orgId: string,
  name: string,
): Promise<{ id?: string; error?: string }> {
  await requireRole('owner')
  return createBotInOrg(orgId, name)
}

/**
 * Re-send a client's invitation email. If the invite has expired (or isn't
 * pending), it's renewed in place with a fresh 7-day window; the link (token)
 * is reused, so an expired link starts working again. Owner-only.
 */
export async function resendClientInvite(
  inviteId: string,
): Promise<{ ok: boolean; error?: string; emailed?: boolean }> {
  await requireRole('owner')
  const svc = createServiceClient()

  const { data: invite } = await svc
    .from('invites')
    .select('id, org_id, email, token, status, expires_at')
    .eq('id', inviteId)
    .single<{
      id: string
      org_id: string
      email: string
      token: string
      status: string
      expires_at: string
    }>()
  if (!invite) return { ok: false, error: 'Invite not found.' }
  if (invite.status === 'accepted') return { ok: false, error: 'This invite was already accepted.' }

  // Renew when expired or otherwise not pending; reuse the token/link.
  const stale = invite.status !== 'pending' || invite.expires_at <= new Date().toISOString()
  if (stale) {
    const { error } = await svc
      .from('invites')
      .update({
        status: 'pending',
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      })
      .eq('id', invite.id)
    if (error) return { ok: false, error: 'Failed to renew the invitation.' }
  }

  const { data: org } = await svc
    .from('organizations')
    .select('name')
    .eq('id', invite.org_id)
    .single<{ name: string }>()
  const inviteUrl = `${getEnv().NEXT_PUBLIC_APP_URL}/accept-invite/${invite.token}`

  let emailed = false
  if (emailEnabled()) {
    emailed = await sendEmail({
      to: [invite.email],
      ...clientInviteEmail(org?.name ?? 'your workspace', inviteUrl),
    })
  }

  revalidatePath(`/owner/clients/${invite.org_id}`)
  return { ok: true, emailed }
}

/**
 * Duplicate a fully-configured demo bot into a client's org — config, knowledge
 * (sources + chunks with embeddings), and the synced product index all come
 * along, so a pitched demo becomes the client's working bot in one click.
 * Owner-only; the heavy lifting lives in lib/bots/duplicate.ts.
 */
export async function createBotFromDemo(
  orgId: string,
  demoBotId: string,
): Promise<{ id?: string; error?: string }> {
  await requireRole('owner')
  const res = await duplicateDemoBot(orgId, demoBotId)
  if (res.id) revalidatePath(`/owner/clients/${orgId}`)
  return res
}
