import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createServerClient } from '@/lib/supabase/server'
import { validateStore, validateOrderAccess } from '@/lib/commerce'

export const maxDuration = 20

const bodySchema = z.object({
  provider: z.enum(['woocommerce', 'shopify']).default('woocommerce'),
  storeUrl: z.string().optional(),
  shopifyDomain: z.string().optional(),
  shopifyToken: z.string().optional(),
  // 'store' = catalog connectivity; 'orders' = WooCommerce REST creds (order lookup).
  mode: z.enum(['store', 'orders']).default('store'),
  restKey: z.string().optional(),
  restSecret: z.string().optional(),
})

// Authenticated: checks a store connection (catalog or order REST access).
export async function POST(req: Request) {
  const supabase = await createServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json().catch(() => null)
  const parsed = bodySchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ ok: false, error: 'Invalid request' }, { status: 400 })

  if (parsed.data.mode === 'orders') {
    const result = await validateOrderAccess(
      'woocommerce',
      parsed.data.storeUrl ?? '',
      parsed.data.restKey ?? '',
      parsed.data.restSecret ?? '',
    )
    return NextResponse.json(result)
  }

  const { ok, total } = await validateStore({
    provider: parsed.data.provider,
    storeUrl: parsed.data.storeUrl,
    shopifyDomain: parsed.data.shopifyDomain,
    shopifyToken: parsed.data.shopifyToken,
  })
  if (!ok) {
    return NextResponse.json({
      ok: false,
      error:
        parsed.data.provider === 'shopify'
          ? 'Could not reach Shopify with that domain and token.'
          : 'Could not reach the WooCommerce Store API at that URL.',
    })
  }
  return NextResponse.json({ ok: true, total })
}
