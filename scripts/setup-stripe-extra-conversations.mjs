// Creates the one-time Extra-conversations top-up price (€15 / 1,000
// conversations, current month only). Idempotent — finds an existing price by
// its lookup_key before creating.
//
//   Usage: STRIPE_SECRET_KEY=sk_... node scripts/setup-stripe-extra-conversations.mjs
//
// Run once per Stripe environment (sandbox + live). Prints the price id to
// put in STRIPE_PRICE_EXTRA_CONVERSATIONS (.env.local for sandbox, Vercel for live).
import Stripe from 'stripe'

const key = process.env.STRIPE_SECRET_KEY
if (!key) {
  console.error('Set STRIPE_SECRET_KEY (sandbox or live).')
  process.exit(1)
}
const stripe = new Stripe(key)

const LOOKUP_KEY = 'extra_conversations_1000'

const existing = await stripe.prices.list({ lookup_keys: [LOOKUP_KEY], limit: 1 })
let price = existing.data[0]
if (!price) {
  price = await stripe.prices.create({
    currency: 'eur',
    unit_amount: 1500, // €15 one-time
    lookup_key: LOOKUP_KEY,
    product_data: { name: 'Extra conversations — 1,000 top-up (current month)' },
  })
  console.log('Created price:', price.id)
} else {
  console.log('Price exists:', price.id)
}

console.log(`\nSTRIPE_PRICE_EXTRA_CONVERSATIONS=${price.id}`)
