// Idempotent catalog provisioning. No customer, payment, or subscription writes.
import Stripe from 'stripe'
import { config } from 'dotenv'
import { writeFileSync } from 'node:fs'
config({ path: '.env.local', quiet: true })
const live = process.argv.includes('--live')
const key = live ? process.env.STRIPE_LIVE_SECRET_KEY : process.env.STRIPE_SECRET_KEY
if (!key || (live !== key.startsWith('sk_live_'))) throw new Error('Stripe environment mismatch')
const stripe = new Stripe(key, { apiVersion: '2026-10-28.endive' })
const expected = live ? 'acct_1U5pvCBPga6Qu0zH' : 'acct_1U5pvKBtWM4Edzrx'
try {
  const account = await stripe.accounts.retrieve()
  if (account.id !== expected) throw new Error('Unexpected Stripe account')
  const products = await stripe.products.list({ active: true, limit: 100 })
  async function product(sku, name, description) {
    return products.data.find((p) => p.metadata.loqara_sku === sku) ?? await stripe.products.create({
      name, description, tax_code: 'txcd_10103001', metadata: { loqara_sku: sku, rollout: 'basic-2026-11' },
    }, { idempotencyKey: `basic-rollout-product-${sku}` })
  }
  const basic = await product('basic','Loqara Basic','400 text conversations per UTC calendar month, 1 bot, 1 visitor language. Live handoff, leads, dictation, analytics and product search. Loqara badge retained; order lookup requires Starter.')
  const pack = await product('basic_conversations_200','Basic: 200 extra conversations','One-time pack. Expires at the end of the UTC calendar month in which payment succeeds. No automatic recharge.')
  const prices = {}
  for (const [env, lookup_key, prod, unit_amount, interval] of [
    ['STRIPE_PRICE_BASIC_MONTH','loqara_basic_month',basic.id,4900,'month'],
    ['STRIPE_PRICE_BASIC_YEAR','loqara_basic_year',basic.id,49000,'year'],
    ['STRIPE_PRICE_BASIC_CONVERSATIONS','loqara_basic_conversations_200',pack.id,1500,null],
  ]) {
    let price = (await stripe.prices.list({ lookup_keys: [lookup_key], active: true, limit: 10 })).data[0]
    if (!price) price = await stripe.prices.create({ product: prod, unit_amount, currency:'eur', tax_behavior:'exclusive', lookup_key,
      ...(interval ? { recurring: { interval } } : {}), metadata: { rollout:'basic-2026-11' },
    }, { idempotencyKey: `basic-rollout-price-${lookup_key}` })
    if (price.unit_amount !== unit_amount || price.currency !== 'eur' || price.product !== prod ||
        (price.recurring?.interval ?? null) !== interval || price.livemode !== live || price.tax_behavior !== 'exclusive') throw new Error(`Unexpected price: ${lookup_key}`)
    prices[env] = price.id
  }
  const report = { account:account.id, livemode:live, apiVersion:'2026-10-28.endive', prices }
  writeFileSync(`/tmp/loqara-basic-${live ? 'live' : 'sandbox'}-catalog.json`, JSON.stringify(report,null,2))
  console.log(JSON.stringify(report))
} catch (error) { console.error(error.message); process.exitCode=1 }
