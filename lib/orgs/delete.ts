import 'server-only'
import type { SupabaseClient } from '@supabase/supabase-js'
import { getEnv } from '@/lib/env'

/**
 * Deleting a client organisation. The DB cascades everything org-scoped
 * (bots → conversations/messages/knowledge/leads/events, members, invites,
 * orders). Two things don't cascade and are handled here: ElevenLabs voice
 * agents (external) and the auth users who belonged only to this org.
 */

export interface MemberInfo {
  userId: string
  role: string
  /** Number of organisations this user belongs to, including the one being deleted. */
  membershipCount: number
}

/** Which member accounts go with the org: only those with no other org and never platform owners. */
export function usersToDeleteWithOrg(members: MemberInfo[]): string[] {
  return members.filter((m) => m.role !== 'owner' && m.membershipCount <= 1).map((m) => m.userId)
}

export type DeleteOrgResult = { ok: true; deletedUsers: number } | { ok: false; error: string }

export async function deleteOrganizationCascade(
  svc: SupabaseClient,
  orgId: string,
): Promise<DeleteOrgResult> {
  const { data: org } = await svc
    .from('organizations')
    .select('id, name, is_platform, subscription_status, stripe_subscription_id')
    .eq('id', orgId)
    .single<{
      id: string
      name: string
      is_platform: boolean
      subscription_status: string
      stripe_subscription_id: string | null
    }>()
  if (!org) return { ok: false, error: 'Organisation not found.' }
  if (org.is_platform) return { ok: false, error: "Loqara's own organisation can't be deleted." }
  // Money first: never orphan a live Stripe subscription. Cancel it in Stripe, then delete.
  if (org.stripe_subscription_id && ['trialing', 'active', 'past_due'].includes(org.subscription_status)) {
    return { ok: false, error: 'This client has a live subscription. Cancel it in Stripe first.' }
  }

  // Members + how many orgs each belongs to (to keep multi-org accounts alive).
  const { data: memberRows } = await svc
    .from('organization_members')
    .select('user_id, profiles!inner(role)')
    .eq('org_id', orgId)
  const members = ((memberRows ?? []) as unknown as { user_id: string; profiles: { role: string } }[])
  const userIds = members.map((m) => m.user_id)
  const { data: allMemberships } = userIds.length
    ? await svc.from('organization_members').select('user_id').in('user_id', userIds)
    : { data: [] as { user_id: string }[] }
  const counts = new Map<string, number>()
  for (const m of (allMemberships ?? []) as { user_id: string }[]) counts.set(m.user_id, (counts.get(m.user_id) ?? 0) + 1)
  const doomed = usersToDeleteWithOrg(
    members.map((m) => ({ userId: m.user_id, role: m.profiles.role, membershipCount: counts.get(m.user_id) ?? 1 })),
  )

  // External voice agents (best effort — a stale agent costs nothing but clutter).
  const apiKey = getEnv().ELEVENLABS_API_KEY
  if (apiKey) {
    const { data: bots } = await svc.from('bots').select('elevenlabs_agent_id').eq('org_id', orgId)
    for (const b of (bots ?? []) as { elevenlabs_agent_id: string | null }[]) {
      if (!b.elevenlabs_agent_id) continue
      await fetch(`https://api.elevenlabs.io/v1/convai/agents/${b.elevenlabs_agent_id}`, {
        method: 'DELETE',
        headers: { 'xi-api-key': apiKey },
      }).catch((err) => console.warn('[delete-org] elevenlabs agent delete failed:', err))
    }
  }

  const { error } = await svc.from('organizations').delete().eq('id', orgId)
  if (error) return { ok: false, error: `Failed to delete organisation: ${error.message}` }

  let deletedUsers = 0
  for (const id of doomed) {
    const { error: userErr } = await svc.auth.admin.deleteUser(id)
    if (userErr) console.error('[delete-org] auth user delete failed:', id, userErr.message)
    else deletedUsers++
  }
  return { ok: true, deletedUsers }
}
