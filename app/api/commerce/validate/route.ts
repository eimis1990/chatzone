import { getOrganizationPolicy } from '@/lib/organization-policy-server'
import { getUserOrgIds } from '@/lib/auth/guards'
import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createServerClient } from '@/lib/supabase/server'
import { validateStore, validateOrderAccess } from '@/lib/commerce'

export const maxDuration = 20

const bodySchema = z.object({
  botId: z.string().uuid().optional(),
  provider: z
    .enum(['woocommerce', 'woocommerce_legacy', 'shopify', 'magento', 'verskis', 'feed', 'travelline', 'travelline_webpms'])
    .default('woocommerce'),
  storeUrl: z.string().optional(),
  shopifyDomain: z.string().optional(),
  shopifyToken: z.string().optional(),
  feedUrl: z.string().optional(),
  tlWebPmsKey: z.string().trim().optional(),
  tlClientId: z.string().optional(),
  tlClientSecret: z.string().optional(),
  tlPropertyId: z.string().optional(),
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

  let orgId: string | undefined
  if (parsed.data.botId) {
    const { data: bot } = await supabase.from('bots').select('org_id').eq('id', parsed.data.botId).single()
    orgId = bot?.org_id
  } else orgId = (await getUserOrgIds())[0]
  if (!orgId) return NextResponse.json({ ok: false, error: 'Bot not found.' }, { status: 404 })
  const { entitlements } = await getOrganizationPolicy(supabase, orgId)
  if (parsed.data.mode === 'orders' && !entitlements.orderLookup) return NextResponse.json({ ok: false, error: 'Order lookup requires Starter or above.' }, { status: 403 })
  if (parsed.data.mode === 'store' && !entitlements.productSearch) return NextResponse.json({ ok: false, error: 'Product search requires Basic or above.' }, { status: 403 })

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
    tlWebPmsKey: parsed.data.tlWebPmsKey,
    tlClientId: parsed.data.tlClientId,
    tlClientSecret: parsed.data.tlClientSecret,
    tlPropertyId: parsed.data.tlPropertyId,
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
      woocommerce_legacy: 'Could not reach the legacy WooCommerce catalogue. Use the canonical store URL (including https).',
      travelline_webpms: 'Could not read room inventory. Check the TravelLine WebPMS API key.',
      travelline: 'Could not authenticate with TravelLine — check the client ID, secret, and property ID.',
    }
    return NextResponse.json({ ok: false, error: errors[parsed.data.provider] ?? errors.woocommerce })
  }
  return NextResponse.json({ ok: true, total, ...(detectedProvider ? { detectedProvider } : {}) })
}
