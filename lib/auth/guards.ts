import { redirect } from 'next/navigation'
import { createServerClient } from '@/lib/supabase/server'
import { resolveHome } from '@/lib/auth/roles'
import type { Profile, UserRole } from '@/lib/types'

export interface SessionUser {
  id: string
  email: string | null
  profile: Profile
}

/** Returns the signed-in user + profile, or null when unauthenticated. */
export async function getSessionUser(): Promise<SessionUser | null> {
  const supabase = await createServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return null

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single<Profile>()
  if (!profile) return null

  return { id: user.id, email: user.email ?? null, profile }
}

/** Redirects to /login when unauthenticated; otherwise returns the user. */
export async function requireUser(): Promise<SessionUser> {
  const session = await getSessionUser()
  if (!session) redirect('/login')
  return session
}

/** Redirects to /login when unauthenticated, or to the user's home on role mismatch. */
export async function requireRole(role: UserRole): Promise<SessionUser> {
  const session = await requireUser()
  if (session.profile.role !== role) redirect(resolveHome(session.profile.role))
  return session
}

/** Org ids the current user belongs to (empty for the owner / unauthenticated). */
export async function getUserOrgIds(): Promise<string[]> {
  const supabase = await createServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return []
  const { data } = await supabase
    .from('organization_members')
    .select('org_id')
    .eq('user_id', user.id)
  return (data ?? []).map((r) => r.org_id as string)
}
