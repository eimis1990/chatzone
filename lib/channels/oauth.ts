import crypto from 'node:crypto'
import { getEnv } from '@/lib/env'

/**
 * Facebook Login for Business helpers for the Messenger connect flow
 * (docs/CHANNELS_IMPLEMENTATION.md §OAuth): signed short-lived state,
 * code exchange, and Page listing. All server-only.
 */

const GRAPH = 'https://graph.facebook.com/v23.0'
export const OAUTH_SCOPES = [
  'pages_show_list',
  'pages_messaging',
  'pages_manage_metadata',
  'pages_read_engagement',
  'business_management',
]

export interface OAuthState {
  orgId: string
  userId: string
  botId: string | null
  nonce: string
  exp: number // unix seconds
}

function hmac(payload: string, secret: string): string {
  return crypto.createHmac('sha256', secret).update(payload).digest('base64url')
}

/** Signs the state payload (10-minute expiry) with the app secret. */
export function signState(state: Omit<OAuthState, 'nonce' | 'exp'>, secret: string): string {
  const full: OAuthState = {
    ...state,
    nonce: crypto.randomBytes(12).toString('base64url'),
    exp: Math.floor(Date.now() / 1000) + 600,
  }
  const payload = Buffer.from(JSON.stringify(full)).toString('base64url')
  return `${payload}.${hmac(payload, secret)}`
}

/** Verifies signature + expiry; returns the state or null (fail closed). */
export function verifyState(token: string, secret: string): OAuthState | null {
  const [payload, sig] = token.split('.')
  if (!payload || !sig) return null
  const expected = hmac(payload, secret)
  const a = Buffer.from(sig)
  const b = Buffer.from(expected)
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null
  try {
    const state = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')) as OAuthState
    if (!state.exp || state.exp < Math.floor(Date.now() / 1000)) return null
    return state
  } catch {
    return null
  }
}

/** Facebook Login dialog URL. Uses a Business Login configuration when set. */
export function buildAuthUrl(state: string): string {
  const env = getEnv()
  const params = new URLSearchParams({
    client_id: env.META_APP_ID ?? '',
    redirect_uri: `${env.NEXT_PUBLIC_APP_URL}/api/channels/meta/oauth/callback`,
    state,
    response_type: 'code',
  })
  if (env.META_LOGIN_CONFIG_ID) params.set('config_id', env.META_LOGIN_CONFIG_ID)
  else params.set('scope', OAUTH_SCOPES.join(','))
  return `https://www.facebook.com/v23.0/dialog/oauth?${params}`
}

async function graphGet<T>(path: string, params: Record<string, string>): Promise<T> {
  const res = await fetch(`${GRAPH}${path}?${new URLSearchParams(params)}`)
  const data = (await res.json().catch(() => null)) as
    | (T & { error?: { message?: string } })
    | null
  if (!res.ok || !data || data.error) {
    throw new Error(`Graph ${path} failed (${res.status}): ${data?.error?.message ?? 'unknown'}`)
  }
  return data
}

/** Exchanges the OAuth code, then upgrades to a long-lived user token. */
export async function exchangeCodeForUserToken(code: string): Promise<string> {
  const env = getEnv()
  if (!env.META_APP_ID || !env.META_APP_SECRET) throw new Error('Meta OAuth not configured')
  const short = await graphGet<{ access_token: string }>('/oauth/access_token', {
    client_id: env.META_APP_ID,
    client_secret: env.META_APP_SECRET,
    redirect_uri: `${env.NEXT_PUBLIC_APP_URL}/api/channels/meta/oauth/callback`,
    code,
  })
  const long = await graphGet<{ access_token: string }>('/oauth/access_token', {
    grant_type: 'fb_exchange_token',
    client_id: env.META_APP_ID,
    client_secret: env.META_APP_SECRET,
    fb_exchange_token: short.access_token,
  })
  return long.access_token
}

export interface ConnectablePage {
  id: string
  name: string
  access_token: string
  picture: string | null
}

/** Pages the authorizing user can administer (long-lived page tokens). */
export async function fetchUserPages(userToken: string): Promise<ConnectablePage[]> {
  const data = await graphGet<{
    data?: Array<{
      id: string
      name: string
      access_token: string
      picture?: { data?: { url?: string } }
    }>
  }>('/me/accounts', {
    access_token: userToken,
    fields: 'id,name,access_token,picture{url}',
    limit: '100',
  })
  return (data.data ?? []).map((p) => ({
    id: p.id,
    name: p.name,
    access_token: p.access_token,
    picture: p.picture?.data?.url ?? null,
  }))
}

/** Subscribes the Page to the app's webhook fields (page token auth). */
export async function subscribePageToApp(pageToken: string): Promise<void> {
  const res = await fetch(
    `${GRAPH}/me/subscribed_apps?${new URLSearchParams({
      subscribed_fields: 'messages,messaging_postbacks',
      access_token: pageToken,
    })}`,
    { method: 'POST' },
  )
  const data = (await res.json().catch(() => null)) as {
    success?: boolean
    error?: { message?: string }
  } | null
  if (!res.ok || !data?.success) {
    throw new Error(`Page webhook subscribe failed: ${data?.error?.message ?? res.status}`)
  }
}
