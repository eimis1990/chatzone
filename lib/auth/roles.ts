import type { UserRole } from '@/lib/types'

/** Landing route for an authenticated user of the given role. */
export function resolveHome(role: UserRole): string {
  return role === 'owner' ? '/owner' : '/app'
}

export type RouteDecision = { type: 'allow' } | { type: 'redirect'; to: string }

/** Path prefixes that never require authentication. */
const PUBLIC_PREFIXES = [
  '/login',
  '/accept-invite',
  '/reset-password',
  '/embed',
  '/widget.js',
  '/api/chat',
  '/api/widget-config',
  '/auth',
]

const AUTH_PAGES = ['/login', '/accept-invite', '/reset-password']

function hasPrefix(pathname: string, prefixes: string[]): boolean {
  return prefixes.some((p) => pathname === p || pathname.startsWith(p + '/'))
}

/**
 * Pure routing policy used by middleware. `role` is null for unauthenticated
 * requests. Decides allow vs. redirect without touching any framework APIs, so
 * it is fully unit-testable.
 */
export function routeDecision(opts: {
  pathname: string
  role: UserRole | null
}): RouteDecision {
  const { pathname, role } = opts

  // An authenticated user hitting an auth page goes to their home.
  if (role && hasPrefix(pathname, AUTH_PAGES)) {
    return { type: 'redirect', to: resolveHome(role) }
  }

  if (hasPrefix(pathname, PUBLIC_PREFIXES)) return { type: 'allow' }

  const inOwnerArea = pathname === '/owner' || pathname.startsWith('/owner/')
  const inClientArea = pathname === '/app' || pathname.startsWith('/app/')

  if (!inOwnerArea && !inClientArea) return { type: 'allow' }

  if (!role) return { type: 'redirect', to: '/login' }
  if (inOwnerArea && role !== 'owner') return { type: 'redirect', to: '/app' }
  if (inClientArea && role !== 'client') return { type: 'redirect', to: '/owner' }

  return { type: 'allow' }
}
