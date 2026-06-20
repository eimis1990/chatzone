import { NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { groupVoicesByGender } from '@/lib/voices-group'
import type { PlatformVoice } from '@/lib/types'

// Authenticated: returns the owner-curated voices grouped male/female for the
// configurator picker. Reads via the service client (RLS is owner-only).
export async function GET() {
  const supabase = await createServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const svc = createServiceClient()
  const { data } = await svc
    .from('platform_voices')
    .select('*')
    .order('sort_order', { ascending: true })

  return NextResponse.json(groupVoicesByGender((data ?? []) as PlatformVoice[]))
}
