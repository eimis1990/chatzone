import { NextResponse, type NextRequest } from 'next/server'
import { updateSession } from '@/lib/supabase/middleware'
import { routeDecision } from '@/lib/auth/roles'
import type { UserRole } from '@/lib/types'

export async function middleware(request: NextRequest) {
  const { supabase, response, user } = await updateSession(request)

  let role: UserRole | null = null
  if (user) {
    const { data } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single<{ role: UserRole }>()
    role = data?.role ?? null
  }

  const decision = routeDecision({ pathname: request.nextUrl.pathname, role })
  if (decision.type === 'redirect') {
    const url = request.nextUrl.clone()
    url.pathname = decision.to
    url.search = ''
    return NextResponse.redirect(url)
  }

  return response
}

export const config = {
  matcher: [
    /*
     * Run on all routes except Next internals and static files. The widget
     * loader (/widget.js) and embed/api routes are handled as public by
     * routeDecision, so they pass through.
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|js)$).*)',
  ],
}
