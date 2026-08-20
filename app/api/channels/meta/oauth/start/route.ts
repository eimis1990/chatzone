import { NextResponse, type NextRequest } from 'next/server'
import { getSessionUser, getUserOrgIds } from '@/lib/auth/guards'
import { getEnv } from '@/lib/env'
import { signState, buildAuthUrl } from '@/lib/channels/oauth'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/** Starts the Messenger connect flow: signed state → Facebook Login dialog. */
export async function GET(req: NextRequest) {
  const env = getEnv()
  if (!env.META_APP_ID || !env.META_APP_SECRET || !env.CHANNEL_TOKEN_KEY) {
    return NextResponse.json({ error: 'Messenger connect is not configured' }, { status: 503 })
  }
  const session = await getSessionUser()
  const orgId = (await getUserOrgIds())[0]
  if (!session || !orgId) {
    return NextResponse.redirect(new URL('/login', env.NEXT_PUBLIC_APP_URL))
  }
  const botId = req.nextUrl.searchParams.get('botId')
  const state = signState({ orgId, userId: session.id, botId }, env.META_APP_SECRET)
  return NextResponse.redirect(buildAuthUrl(state))
}
