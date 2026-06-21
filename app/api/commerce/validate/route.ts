import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createServerClient } from '@/lib/supabase/server'
import { validateStore, searchStore } from '@/lib/commerce'

export const maxDuration = 20

const bodySchema = z.object({
  provider: z.literal('woocommerce'),
  storeUrl: z.string().url(),
})

// Authenticated: checks a store connection and returns a couple sample products.
export async function POST(req: Request) {
  const supabase = await createServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json().catch(() => null)
  const parsed = bodySchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ ok: false, error: 'Invalid request' }, { status: 400 })

  const ok = await validateStore(parsed.data.provider, parsed.data.storeUrl)
  if (!ok) {
    return NextResponse.json({
      ok: false,
      error: 'Could not reach the WooCommerce Store API at that URL.',
    })
  }
  const sample = await searchStore(
    { enabled: true, provider: parsed.data.provider, storeUrl: parsed.data.storeUrl },
    { query: '', limit: 3 },
  ).catch(() => [])
  return NextResponse.json({ ok: true, sampleCount: sample.length, sample })
}
