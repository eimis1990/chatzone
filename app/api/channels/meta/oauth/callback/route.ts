import { NextResponse, type NextRequest } from 'next/server'
import { getSessionUser } from '@/lib/auth/guards'
import { getEnv } from '@/lib/env'
import { verifyState, exchangeCodeForUserToken } from '@/lib/channels/oauth'
import { encryptSecret } from '@/lib/channels/crypto'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/** Cookie carrying the encrypted long-lived user token between the OAuth
 *  callback and the Page-selection screen. Short-lived, httpOnly. */
export const CONNECT_COOKIE = 'meta_connect'

export async function GET(req: NextRequest) {
  const env = getEnv()
  const appUrl = env.NEXT_PUBLIC_APP_URL
  const fail = (reason: string) =>
    NextResponse.redirect(new URL(`/app/channels/messenger/connect?error=${reason}`, appUrl))

  if (!env.META_APP_SECRET || !env.CHANNEL_TOKEN_KEY) return fail('not_configured')

  const params = req.nextUrl.searchParams
  if (params.get('error')) return fail('denied') // user canceled the dialog

  const state = verifyState(params.get('state') ?? '', env.META_APP_SECRET)
  const code = params.get('code')
  if (!state || !code) return fail('invalid_state')

  // The browser completing the flow must be the user who started it.
  const session = await getSessionUser()
  if (!session || session.id !== state.userId) return fail('session_mismatch')

  let userToken: string
  try {
    userToken = await exchangeCodeForUserToken(code)
  } catch (err) {
    console.error('[meta-oauth] code exchange failed:', err instanceof Error ? err.message : err)
    return fail('exchange_failed')
  }

  const res = NextResponse.redirect(
    new URL(
      `/app/channels/messenger/connect${state.botId ? `?botId=${state.botId}` : ''}`,
      appUrl,
    ),
  )
  res.cookies.set(CONNECT_COOKIE, encryptSecret(JSON.stringify({ userToken, orgId: state.orgId })), {
    httpOnly: true,
    secure: true,
    sameSite: 'lax',
    path: '/',
    maxAge: 600,
  })
  return res
}
