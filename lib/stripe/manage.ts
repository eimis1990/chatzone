import 'server-only'
import { requireStripe, getStripe } from './client'
import { getVoicePriceId, getVisualizerPriceId, planFromPriceId } from './plans'
import { syncSubscriptionToOrg } from './sync'
import { createServiceClient } from '@/lib/supabase/service'

const PAYING_STATUSES = ['active', 'trialing', 'past_due']

/**
 * The org's current live Stripe subscription id, read straight from Stripe (the
 * org row can lag a missed webhook). Returns null if the org has no customer or
 * no active subscription. Use this to decide Checkout vs in-place change so we
 * never create a duplicate subscription.
 */
export async function activeSubscriptionId(orgId: string): Promise<string | null> {
  const stripe = getStripe()
  if (!stripe) return null
  const svc = createServiceClient()
  const { data } = await svc
    .from('organizations')
    .select('stripe_customer_id')
    .eq('id', orgId)
    .single<{ stripe_customer_id: string | null }>()
  if (!data?.stripe_customer_id) return null
  const subs = await stripe.subscriptions.list({
    customer: data.stripe_customer_id,
    status: 'all',
    limit: 10,
  })
  const active = subs.data.find((s) => PAYING_STATUSES.includes(s.status))
  return active?.id ?? null
}

/**
 * Pull the org's current subscription straight from Stripe and sync it. Used on
 * return from Checkout so the plan reflects immediately without waiting on the
 * webhook (the webhook still handles renewals / out-of-band changes). Idempotent.
 */
export async function reconcileOrgFromStripe(orgId: string): Promise<void> {
  const stripe = getStripe()
  if (!stripe) return
  const svc = createServiceClient()
  const { data } = await svc
    .from('organizations')
    .select('stripe_customer_id')
    .eq('id', orgId)
    .single<{ stripe_customer_id: string | null }>()
  if (!data?.stripe_customer_id) return

  const subs = await stripe.subscriptions.list({
    customer: data.stripe_customer_id,
    status: 'all',
    limit: 5,
  })
  const sub = subs.data.find((s) => PAYING_STATUSES.includes(s.status)) ?? subs.data[0]
  if (sub) await syncSubscriptionToOrg(sub)
}

/**
 * Swap the base plan price on an existing subscription, leaving any add-on
 * items in place. Use this for plan/interval changes once a customer already
 * has a subscription — sending them back through Checkout would create a
 * second subscription instead of switching.
 */
export async function changeBasePlan(subscriptionId: string, newPriceId: string): Promise<void> {
  const stripe = requireStripe()
  const voicePriceId = getVoicePriceId()
  const sub = await stripe.subscriptions.retrieve(subscriptionId)
  const baseItem =
    sub.items.data.find((i) => i.price?.id !== voicePriceId && planFromPriceId(i.price?.id ?? '')) ??
    sub.items.data.find((i) => i.price?.id !== voicePriceId)
  if (!baseItem) throw new Error('No base plan item found on the subscription.')

  const updated = await stripe.subscriptions.update(subscriptionId, {
    items: [{ id: baseItem.id, price: newPriceId }],
    proration_behavior: 'create_prorations',
  })
  await syncSubscriptionToOrg(updated)
}

/** Add or remove a recurring add-on item (by price) on an existing subscription. */
async function setAddonItem(subscriptionId: string, priceId: string, enabled: boolean): Promise<void> {
  const stripe = requireStripe()
  const sub = await stripe.subscriptions.retrieve(subscriptionId)
  const existing = sub.items.data.find((i) => i.price?.id === priceId)

  if (enabled && !existing) {
    const updated = await stripe.subscriptions.update(subscriptionId, {
      items: [{ price: priceId }],
      proration_behavior: 'create_prorations',
    })
    await syncSubscriptionToOrg(updated)
  } else if (!enabled && existing) {
    const updated = await stripe.subscriptions.update(subscriptionId, {
      items: [{ id: existing.id, deleted: true }],
      proration_behavior: 'create_prorations',
    })
    await syncSubscriptionToOrg(updated)
  }
}

/** Add or remove the Voice add-on item on an existing subscription. */
export async function setVoiceAddon(subscriptionId: string, enabled: boolean): Promise<void> {
  const priceId = getVoicePriceId()
  if (!priceId) throw new Error('Voice add-on price is not configured.')
  await setAddonItem(subscriptionId, priceId, enabled)
}

/** Add or remove the Room visualizer add-on item on an existing subscription. */
export async function setVisualizerAddon(subscriptionId: string, enabled: boolean): Promise<void> {
  const priceId = getVisualizerPriceId()
  if (!priceId) throw new Error('Room visualizer add-on price is not configured.')
  await setAddonItem(subscriptionId, priceId, enabled)
}
