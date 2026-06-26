#!/usr/bin/env node
/**
 * Create (idempotently) the Loqara products + recurring prices in Stripe.
 *
 * Usage:
 *   # sandbox / test (key starts with sk_test_)
 *   node --env-file=.env.local scripts/stripe-setup.mjs
 *
 *   # live (key starts with sk_live_) — requires explicit opt-in:
 *   node --env-file=.env.local scripts/stripe-setup.mjs --live
 *
 * Requires in the environment:
 *   STRIPE_SECRET_KEY   (sk_test_… for sandbox, sk_live_… for live)
 *
 * What it does:
 *   - One Product per paid plan (Starter / Growth / Scale), tagged with
 *     metadata.loqara_plan so re-runs find it instead of duplicating.
 *   - Two recurring EUR Prices per plan (monthly, and annual = 10× monthly),
 *     each with a stable lookup_key so re-runs reuse them.
 *   - Prints the STRIPE_PRICE_* env block to paste into .env.local / Vercel.
 *
 * Safe to run repeatedly. Run once with the sandbox key, then again with the
 * live key (and --live) to mirror the same catalog into live mode.
 *
 * NOTE: amounts mirror lib/stripe/plans.ts (annual is billed at 10× monthly,
 * i.e. ~2 months free). Free and Enterprise are intentionally not created —
 * they aren't self-serve Checkout plans. Voice add-on + usage meters come in a
 * later (metering) pass.
 */

import Stripe from 'stripe'

// Plan catalog — keep in sync with lib/stripe/plans.ts.
const PLANS = [
  { plan: 'starter', name: 'Starter', monthly: 149 },
  { plan: 'growth', name: 'Growth', monthly: 249 },
  { plan: 'scale', name: 'Scale', monthly: 449 },
]
// Add-ons attach to a base subscription as an extra item (not a separate sub).
// Voice is a flat monthly fee for now; per-minute metering comes in a later pass.
const ADDONS = [{ key: 'voice', name: 'Voice agent', monthly: 49 }]
const CURRENCY = 'eur'

const key = process.env.STRIPE_SECRET_KEY
if (!key) {
  console.error(
    'Missing STRIPE_SECRET_KEY.\n' +
      'Add it to .env.local and run with --env-file=.env.local',
  )
  process.exit(1)
}

const isLive = key.startsWith('sk_live_')
const optedIntoLive = process.argv.includes('--live')
if (isLive && !optedIntoLive) {
  console.error(
    '\n⛔ This is a LIVE secret key (sk_live_…).\n' +
      '   Re-run with --live to create products in LIVE mode:\n' +
      '   node --env-file=.env.local scripts/stripe-setup.mjs --live\n',
  )
  process.exit(1)
}

const stripe = new Stripe(key)

/** Find a product by a metadata tag, or create it. */
async function findOrCreateProduct(metaKey, metaVal, name) {
  const found = await stripe.products.search({
    query: `active:'true' AND metadata['${metaKey}']:'${metaVal}'`,
    limit: 1,
  })
  if (found.data[0]) {
    console.log(`  · product ${name}: reuse ${found.data[0].id}`)
    return found.data[0]
  }
  const created = await stripe.products.create({
    name: `Loqara ${name}`,
    metadata: { [metaKey]: metaVal },
  })
  console.log(`  · product ${name}: created ${created.id}`)
  return created
}

/** Find a recurring price by lookup_key (and matching shape), or create it. */
async function findOrCreatePrice(productId, keyBase, interval, amountCents) {
  const lookup_key = `loqara_${keyBase}_${interval}`
  const existing = await stripe.prices.list({ lookup_keys: [lookup_key], active: true, limit: 1 })
  const p = existing.data[0]
  if (
    p &&
    p.unit_amount === amountCents &&
    p.currency === CURRENCY &&
    p.recurring?.interval === interval
  ) {
    console.log(`    - ${interval}: reuse ${p.id} (${lookup_key})`)
    return p
  }
  const created = await stripe.prices.create({
    product: productId,
    currency: CURRENCY,
    unit_amount: amountCents,
    recurring: { interval },
    lookup_key,
    transfer_lookup_key: true,
    nickname: `${keyBase} ${interval}`,
  })
  console.log(`    - ${interval}: created ${created.id} (${lookup_key})`)
  return created
}

async function main() {
  console.log(`\nCreating Loqara catalog in ${isLive ? 'LIVE' : 'TEST/sandbox'} mode…\n`)
  const envLines = []

  for (const { plan, name, monthly } of PLANS) {
    console.log(`${name}:`)
    const product = await findOrCreateProduct('loqara_plan', plan, name)
    const monthPrice = await findOrCreatePrice(product.id, plan, 'month', monthly * 100)
    const yearPrice = await findOrCreatePrice(product.id, plan, 'year', monthly * 10 * 100)
    const P = plan.toUpperCase()
    envLines.push(`STRIPE_PRICE_${P}_MONTH=${monthPrice.id}`)
    envLines.push(`STRIPE_PRICE_${P}_YEAR=${yearPrice.id}`)
  }

  for (const { key, name, monthly } of ADDONS) {
    console.log(`${name} (add-on):`)
    const product = await findOrCreateProduct('loqara_addon', key, name)
    const monthPrice = await findOrCreatePrice(product.id, key, 'month', monthly * 100)
    envLines.push(`STRIPE_PRICE_${key.toUpperCase()}_MONTH=${monthPrice.id}`)
  }

  console.log('\n✅ Done. Add these to .env.local (and the matching Vercel env):\n')
  console.log(envLines.join('\n'))
  console.log('')
}

main().catch((err) => {
  console.error('\nStripe setup failed:', err?.message ?? err)
  process.exit(1)
})
