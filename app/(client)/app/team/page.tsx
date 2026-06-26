import Link from 'next/link'
import { UsersIcon } from 'lucide-react'
import { requireRole, getUserOrgIds } from '@/lib/auth/guards'
import { createServiceClient } from '@/lib/supabase/service'
import { entitlementsFor } from '@/lib/entitlements'
import { TeamPanel, type TeamMember, type TeamInvite } from '@/components/client/TeamPanel'
import type { Plan, MemberRole } from '@/lib/types'

const INVITE_TTL_MS = 7 * 24 * 60 * 60 * 1000

async function memberRole(
  svc: ReturnType<typeof createServiceClient>,
  orgId: string,
  userId: string,
): Promise<MemberRole | null> {
  const { data } = await svc
    .from('organization_members')
    .select('role')
    .eq('org_id', orgId)
    .eq('user_id', userId)
    .single<{ role: MemberRole }>()
  return data?.role ?? null
}

export default async function TeamPage() {
  const session = await requireRole('client')
  const orgIds = await getUserOrgIds()
  const orgId = orgIds[0] ?? null

  const svc = createServiceClient()
  const { data: org } = orgId
    ? await svc.from('organizations').select('plan').eq('id', orgId).single<{ plan: Plan | null }>()
    : { data: null }
  const teamsEnabled = entitlementsFor(org?.plan ?? 'free').teams

  // Gated state — no Scale plan, no team management.
  if (!orgId || !teamsEnabled) {
    return (
      <div className="space-y-6 p-6">
        <div>
          <h1 className="text-lg font-semibold">Team</h1>
          <p className="text-sm text-muted-foreground">Invite teammates and manage roles.</p>
        </div>
        <div className="flex max-w-xl flex-col items-start gap-3 rounded-xl border border-dashed bg-card p-6">
          <span className="flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <UsersIcon className="size-5" />
          </span>
          <p className="text-sm text-muted-foreground">
            Teams &amp; roles are available on the <span className="font-medium text-foreground">Scale</span> plan.
            Invite teammates, assign admin/member roles, and collaborate on your bots.
          </p>
          <Link
            href="/app/subscription"
            className="rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary-hover"
          >
            Upgrade to Scale
          </Link>
        </div>
      </div>
    )
  }

  const callerRole = await memberRole(svc, orgId, session.id)
  const isAdmin = callerRole === 'admin'

  // Members: organization_members + profile names + auth emails.
  const { data: memberRows } = await svc
    .from('organization_members')
    .select('user_id, role, created_at')
    .eq('org_id', orgId)
    .order('created_at', { ascending: true })
  const rows = (memberRows ?? []) as { user_id: string; role: MemberRole; created_at: string }[]

  const { data: profiles } = await svc
    .from('profiles')
    .select('id, full_name')
    .in(
      'id',
      rows.map((r) => r.user_id),
    )
  const nameById = new Map((profiles ?? []).map((p) => [p.id as string, p.full_name as string | null]))

  const members: TeamMember[] = await Promise.all(
    rows.map(async (r) => {
      const { data } = await svc.auth.admin.getUserById(r.user_id)
      return {
        userId: r.user_id,
        name: nameById.get(r.user_id) ?? null,
        email: data.user?.email ?? '—',
        role: r.role,
        isSelf: r.user_id === session.id,
      }
    }),
  )

  const base = process.env.NEXT_PUBLIC_APP_URL ?? ''
  const { data: inviteRows } = await svc
    .from('invites')
    .select('id, email, role, token, created_at')
    .eq('org_id', orgId)
    .eq('status', 'pending')
    .order('created_at', { ascending: false })
  const invites: TeamInvite[] = ((inviteRows ?? []) as {
    id: string
    email: string
    role: MemberRole
    token: string
  }[]).map((i) => ({ id: i.id, email: i.email, role: i.role, url: `${base}/accept-invite/${i.token}` }))

  /** Invite a teammate (admin only). Returns a shareable accept link. */
  async function inviteTeammate(
    email: string,
    role: MemberRole,
  ): Promise<{ url?: string; error?: string }> {
    'use server'
    const me = await requireRole('client')
    const ids = await getUserOrgIds()
    const oid = ids[0]
    if (!oid) return { error: 'No organization found.' }
    const s = createServiceClient()
    const { data: o } = await s.from('organizations').select('plan').eq('id', oid).single<{ plan: Plan | null }>()
    if (!entitlementsFor(o?.plan ?? 'free').teams) return { error: 'Team is available on the Scale plan.' }
    if ((await memberRole(s, oid, me.id)) !== 'admin') return { error: 'Only admins can invite teammates.' }

    const clean = email.trim().toLowerCase()
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(clean)) return { error: 'Enter a valid email address.' }
    const safeRole: MemberRole = role === 'admin' ? 'admin' : 'member'

    const { data: invite, error } = await s
      .from('invites')
      .insert({
        org_id: oid,
        email: clean,
        role: safeRole,
        status: 'pending',
        expires_at: new Date(Date.now() + INVITE_TTL_MS).toISOString(),
        invited_by: me.id,
      })
      .select('token')
      .single<{ token: string }>()
    if (error || !invite) return { error: 'Could not create the invite. Please try again.' }
    return { url: `${process.env.NEXT_PUBLIC_APP_URL ?? ''}/accept-invite/${invite.token}` }
  }

  /** Revoke a pending invite (admin only). */
  async function revokeInvite(inviteId: string): Promise<{ ok?: boolean; error?: string }> {
    'use server'
    const me = await requireRole('client')
    const ids = await getUserOrgIds()
    const oid = ids[0]
    if (!oid) return { error: 'No organization found.' }
    const s = createServiceClient()
    if ((await memberRole(s, oid, me.id)) !== 'admin') return { error: 'Only admins can manage invites.' }
    await s.from('invites').delete().eq('id', inviteId).eq('org_id', oid).eq('status', 'pending')
    return { ok: true }
  }

  /** Remove a member (admin only; can't remove yourself or the last admin). */
  async function removeMember(userId: string): Promise<{ ok?: boolean; error?: string }> {
    'use server'
    const me = await requireRole('client')
    const ids = await getUserOrgIds()
    const oid = ids[0]
    if (!oid) return { error: 'No organization found.' }
    const s = createServiceClient()
    if ((await memberRole(s, oid, me.id)) !== 'admin') return { error: 'Only admins can remove members.' }
    if (userId === me.id) return { error: 'You can’t remove yourself.' }

    // Don't strip the org of its last admin.
    const { data: admins } = await s
      .from('organization_members')
      .select('user_id')
      .eq('org_id', oid)
      .eq('role', 'admin')
    const target = await memberRole(s, oid, userId)
    if (target === 'admin' && (admins ?? []).length <= 1) {
      return { error: 'You can’t remove the last admin.' }
    }
    await s.from('organization_members').delete().eq('org_id', oid).eq('user_id', userId)
    return { ok: true }
  }

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-lg font-semibold">Team</h1>
        <p className="text-sm text-muted-foreground">
          Invite teammates to your organization and manage their roles.
        </p>
      </div>
      <TeamPanel
        isAdmin={isAdmin}
        members={members}
        invites={invites}
        inviteTeammate={inviteTeammate}
        revokeInvite={revokeInvite}
        removeMember={removeMember}
      />
    </div>
  )
}
