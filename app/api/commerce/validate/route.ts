import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createServerClient } from '@/lib/supabase/server'
import { validateStore, validateOrderAccess } from '@/lib/commerce'

export const maxDuration = 20

const bodySchema = z.object({
  provider: z.enum(['woocommerce', 'shopify', 'magento', 'verskis', 'feed']).default('woocommerce'),
  storeUrl: z.string().optional(),
  shopifyDomain: z.string().optional(),
  shopifyToken: z.string().optional(),
  feedUrl: z.string().optional(),
  // 'store' = catalog connectivity; 'orders' = REST creds (order lookup).
  mode: z.enum(['store', 'orders']).default('store'),
  restKey: z.string().optional(),
  restSecret: z.string().optional(),
  // Magento integration access token (order lookup).
  magentoToken: z.string().optional(),
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
    // Magento authenticates with a single integration token (passed in restKey slot).
    const result =
      parsed.data.provider === 'magento'
        ? await validateOrderAccess('magento', parsed.data.storeUrl ?? '', parsed.data.magentoToken ?? '', '')
        : await validateOrderAccess(
            parsed.data.provider,
            parsed.data.storeUrl ?? '',
            parsed.data.restKey ?? '',
            parsed.data.restSecret ?? '',
          )
    return NextResponse.json(result)
  }

  let { ok, total } = await validateStore({
    provider: parsed.data.provider,
    storeUrl: parsed.data.storeUrl,
    shopifyDomain: parsed.data.shopifyDomain,
    shopifyToken: parsed.data.shopifyToken,
    feedUrl: parsed.data.feedUrl,
  })

  // WooCommerce is the default selection, so store owners commonly paste a
  // URL without knowing the underlying platform. Recognize Verskis and tell
  // the client to persist the correct provider instead of leaving a config
  // that passes once but fails when chat searches later.
  let detectedProvider: 'verskis' | undefined
  if (!ok && parsed.data.provider === 'woocommerce' && parsed.data.storeUrl) {
    const detected = await validateStore({
      provider: 'verskis',
      storeUrl: parsed.data.storeUrl,
    })
    if (detected.ok) {
      ok = true
      total = detected.total
      detectedProvider = 'verskis'
    }
  }
  if (!ok) {
    const errors: Record<string, string> = {
      shopify: 'Could not reach Shopify with that domain and token.',
      magento: 'Could not reach the Magento GraphQL API at that URL.',
      verskis: 'Could not read the Verskis storefront at that URL.',
      feed: 'Could not read a product feed at that URL (expects JSON, XML, or CSV).',
      woocommerce: 'Could not reach the WooCommerce Store API at that URL.',
    }
    return NextResponse.json({ ok: false, error: errors[parsed.data.provider] ?? errors.woocommerce })
  }
  return NextResponse.json({ ok: true, total, ...(detectedProvider ? { detectedProvider } : {}) })
}
