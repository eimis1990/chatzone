import type { SupabaseClient } from '@supabase/supabase-js'
import { getEnv } from '@/lib/env'

/**
 * Create a client organization + a 7-day invite for its first admin.
 * Shared by the owner "Create client" flow (POST /api/invites) and the
 * one-click "Send invitation" on /owner/signups.
 */
export async function createClientInvite(
  service: SupabaseClient,
  params: { email: string; orgName: string; invitedBy: string },
): Promise<{ inviteUrl: string; orgId: string } | { error: string }> {
  const { email, orgName, invitedBy } = params
  const slug = orgName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')

  const { data: org, error: orgError } = await service
    .from('organizations')
    .insert({ name: orgName, slug, status: 'active', created_by: invitedBy })
    .select('id')
    .single<{ id: string }>()
  if (orgError || !org) {
    console.error('[invites] org insert error:', orgError)
    return { error: 'Failed to create organization' }
  }

  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
  const { data: invite, error: inviteError } = await service
    .from('invites')
    .insert({
      org_id: org.id,
      email,
      status: 'pending',
      expires_at: expiresAt,
      invited_by: invitedBy,
    })
    .select('token')
    .single<{ token: string }>()
  if (inviteError || !invite) {
    console.error('[invites] invite insert error:', inviteError)
    // Best-effort rollback the org we just created.
    await service.from('organizations').delete().eq('id', org.id)
    return { error: 'Failed to create invite' }
  }

  return {
    inviteUrl: `${getEnv().NEXT_PUBLIC_APP_URL}/accept-invite/${invite.token}`,
    orgId: org.id,
  }
}

/** Derive a presentable company name from a website URL ("https://www.homebynb.lt/x" → "Homebynb"). */
export function companyNameFromWebsite(website: string | null | undefined): string {
  if (!website) return ''
  try {
    const host = new URL(/^https?:\/\//i.test(website) ? website : `https://${website}`).hostname
    const label = host.replace(/^www\./i, '').split('.')[0] ?? ''
    return label ? label.charAt(0).toUpperCase() + label.slice(1) : ''
  } catch {
    return ''
  }
}

export interface InviteRef {
  email: string
  status: string
  created_at: string
}

/**
 * The invite that belongs to THIS signup: same email and sent at/after the
 * signup was recorded. Older invites (e.g. an already-onboarded client who
 * signs up again after the owner deleted the previous signup row) don't count,
 * so the fresh row shows up as New instead of jumping straight to Accepted.
 * `invites` must be ordered newest-first.
 */
export function inviteStatusForSignup(
  signup: { email: string; created_at: string },
  invites: InviteRef[],
): string | null {
  const email = signup.email.toLowerCase()
  const match = invites.find(
    (inv) => inv.email.toLowerCase() === email && inv.created_at >= signup.created_at,
  )
  return match?.status ?? null
}

