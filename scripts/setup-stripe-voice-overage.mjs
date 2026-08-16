// Creates the voice-overage Billing Meter + metered price (€0.20/min).
// Idempotent — safe to re-run; finds existing objects by event name / meter.
//
//   Usage: STRIPE_SECRET_KEY=sk_... node scripts/setup-stripe-voice-overage.mjs
//
// Run once per Stripe environment (sandbox + live). Prints the price id to
// put in STRIPE_PRICE_VOICE_OVERAGE (.env.local for sandbox, Vercel for live).
import Stripe from 'stripe'

const key = process.env.STRIPE_SECRET_KEY
if (!key) {
  console.error('Set STRIPE_SECRET_KEY (sandbox or live).')
  process.exit(1)
}
const stripe = new Stripe(key)

const EVENT_NAME = 'voice_overage_minutes'

const meters = await stripe.billing.meters.list({ status: 'active', limit: 100 })
let meter = meters.data.find((m) => m.event_name === EVENT_NAME)
if (!meter) {
  meter = await stripe.billing.meters.create({
    display_name: 'Voice overage minutes',
    event_name: EVENT_NAME,
    default_aggregation: { formula: 'sum' },
    customer_mapping: { event_payload_key: 'stripe_customer_id', type: 'by_id' },
    value_settings: { event_payload_key: 'value' },
  })
  console.log('Created meter:', meter.id)
} else {
  console.log('Meter exists:', meter.id)
}

const prices = await stripe.prices.list({ limit: 100, active: true })
let price = prices.data.find((p) => p.recurring?.meter === meter.id)
if (!price) {
  price = await stripe.prices.create({
    currency: 'eur',
    unit_amount: 20, // €0.20 per minute
    billing_scheme: 'per_unit',
    recurring: { interval: 'month', usage_type: 'metered', meter: meter.id },
    product_data: { name: 'Voice agent — extra minutes' },
  })
  console.log('Created price:', price.id)
} else {
  console.log('Price exists:', price.id)
}

console.log(`\nSTRIPE_PRICE_VOICE_OVERAGE=${price.id}`)
