import 'server-only'
import type Stripe from 'stripe'
import { requireStripe, getStripe } from './client'
import { expireStaleTopups } from './topups'
import { getExtraConversationsPriceId } from './plans'
import { resetMissingStripeCustomer } from './customer'
import { isMissingStripeCustomerError } from './errors'
import { getVoicePriceId, getVoiceOveragePriceId, getVisualizerPriceId, getMessengerPriceId, planFromPriceId } from './plans'
import { syncSubscriptionToOrg } from './sync'
import { createServiceClient } from '@/lib/supabase/service'

const PAYING_STATUSES = ['active', 'trialing', 'past_due']

async function subscriptionsForOrg(
  orgId: string,
  limit: number,
): Promise<Stripe.Subscription[]> {
  const stripe = getStripe()
  if (!stripe) return []
  const svc = createServiceClient()
  const { data } = await svc
    .from('organizations')
    .select('stripe_customer_id')
    .eq('id', orgId)
    .single<{ stripe_customer_id: string | null }>()
  const customerId = data?.stripe_customer_id
  if (!customerId) return []

  try {
    const subscriptions = await stripe.subscriptions.list({
      customer: customerId,
      status: 'all',
      limit,
    })
    return subscriptions.data
  } catch (error) {
    if (!isMissingStripeCustomerError(error)) throw error
    await resetMissingStripeCustomer(orgId, customerId)
    return []
  }
}

/**
 * The org's current live Stripe subscription id, read straight from Stripe (the
 * org row can lag a missed webhook). Returns null if the org has no customer or
 * no active subscription. Use this to decide Checkout vs in-place change so we
 * never create a duplicate subscription.
 */
export async function activeSubscriptionId(orgId: string): Promise<string | null> {
  const subscriptions = await subscriptionsForOrg(orgId, 10)
  const active = subscriptions.find((subscription) =>
    PAYING_STATUSES.includes(subscription.status),
  )
  return active?.id ?? null
}

/**
 * Pull the org's current subscription straight from Stripe and sync it. Used on
 * return from Checkout so the plan reflects immediately without waiting on the
 * webhook (the webhook still handles renewals / out-of-band changes). Idempotent.
 */
export async function reconcileOrgFromStripe(orgId: string): Promise<void> {
  const subscriptions = await subscriptionsForOrg(orgId, 5)
  // Never sync from an `incomplete` subscription: right after Checkout the new
  // subscription can sit in that state for a few seconds, and syncing it would
  // briefly write the org back to Free (the UI then shows the old plan until a
  // manual refresh). Prefer a paying sub; otherwise the newest settled one.
  const sub =
    subscriptions.find((subscription) => PAYING_STATUSES.includes(subscription.status)) ??
    subscriptions.find(
      (subscription) =>
        subscription.status !== 'incomplete' && subscription.status !== 'incomplete_expired',
    )
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
  // Exclude every add-on price when locating the base item — otherwise the
  // fallback could mistake an add-on for the plan and "upgrade" it away.
  const addonPriceIds = new Set(
    [getVoicePriceId(), getVoiceOveragePriceId(), getVisualizerPriceId(), getMessengerPriceId(), getMessengerPriceId('year')].filter(Boolean),
  )
  const sub = await stripe.subscriptions.retrieve(subscriptionId)
  if (!planFromPriceId(newPriceId)) throw new Error('Unrecognized base plan price.')
  const notAddon = (i: { price?: { id?: string } | null }) => !addonPriceIds.has(i.price?.id ?? '')
  const baseItem =
    sub.items.data.find((i) => notAddon(i) && planFromPriceId(i.price?.id ?? ''))
  if (!baseItem) throw new Error('No base plan item found on the subscription.')

  const messengerIds = [getMessengerPriceId(), getMessengerPriceId('year')].filter(Boolean)
  const messenger = sub.items.data.find((item) => messengerIds.includes(item.price.id))
  const newInterval = planFromPriceId(newPriceId)?.interval
  const messengerPrice = newInterval ? getMessengerPriceId(newInterval) : null
  if (messenger && !messengerPrice) throw new Error('Messenger price is not configured for that billing interval.')
  if (newInterval === 'year' && sub.items.data.some((i) => [getVoicePriceId(), getVisualizerPriceId()].includes(i.price.id))) {
    await ensureFlexibleBilling(stripe, sub)
  }
  const updated = await stripe.subscriptions.update(subscriptionId, {
    items: [
      { id: baseItem.id, price: newPriceId, quantity: 1 },
      ...(messenger && messengerPrice ? [{ id: messenger.id, price: messengerPrice, quantity: 1 }] : []),
    ],
    proration_behavior: 'create_prorations',
    payment_behavior: 'error_if_incomplete',
  })
  await syncSubscriptionToOrg(updated)
  const customer = typeof sub.customer === 'string' ? sub.customer : sub.customer.id
  await expireStaleTopups(stripe, customer, getExtraConversationsPriceId(planFromPriceId(newPriceId)!.plan))
}

/** New Basic Checkout uses flexible billing; migrate legacy mixed intervals only
 * when the customer explicitly requests that combination. Prices stay unchanged. */
async function ensureFlexibleBilling(stripe: Stripe, sub: Stripe.Subscription) {
  if (sub.billing_mode?.type !== 'flexible') {
    await stripe.subscriptions.migrate(sub.id, { billing_mode: { type: 'flexible' } })
  }
}

async function setAddonItems(subscriptionId: string, prices: string[], enabled: boolean) {
  const stripe = requireStripe()
  const sub = await stripe.subscriptions.retrieve(subscriptionId)
  const base = sub.items.data.map((item) => planFromPriceId(item.price.id)).find(Boolean)
  if (!base || !PAYING_STATUSES.includes(sub.status)) throw new Error('An active paid Loqara plan is required.')
  if (enabled && base.interval === 'year') await ensureFlexibleBilling(stripe, sub)
  const changes: Stripe.SubscriptionUpdateParams.Item[] = []
  for (const price of prices) {
    const existing = sub.items.data.find((i) => i.price.id === price)
    if (enabled && !existing) changes.push({ price })
    if (!enabled && existing) changes.push({ id: existing.id, deleted: true })
  }
  if (!changes.length) { await syncSubscriptionToOrg(sub); return }
  const updated = await stripe.subscriptions.update(subscriptionId, {
    items: changes, proration_behavior: 'create_prorations', payment_behavior: 'error_if_incomplete',
  })
  await syncSubscriptionToOrg(updated)
}

export async function setVoiceAddon(subscriptionId: string, enabled: boolean): Promise<void> {
  const price = getVoicePriceId()
  const overage = getVoiceOveragePriceId()
  if (!price || !overage) throw new Error('Voice add-on billing is not configured.')
  await setAddonItems(subscriptionId, [price, overage], enabled)
}

export async function setVisualizerAddon(subscriptionId: string, enabled: boolean): Promise<void> {
  const price = getVisualizerPriceId()
  if (!price) throw new Error('Visualizer add-on price is not configured.')
  await setAddonItems(subscriptionId, [price], enabled)
}

/** One paid Messenger Page per org. Changes follow the existing base-plan interval. */
export async function setMessengerAddon(subscriptionId: string, enabled: boolean): Promise<void> {
  const stripe = requireStripe()
  const sub = await stripe.subscriptions.retrieve(subscriptionId)
  if (!PAYING_STATUSES.includes(sub.status)) throw new Error('An active paid plan is required.')
  const base = sub.items.data.map((item) => planFromPriceId(item.price.id)).find(Boolean)
  if (!base) throw new Error('A paid Loqara plan is required.')
  const priceId = getMessengerPriceId(base.interval)
  if (!priceId) throw new Error('Messenger add-on price is not configured.')
  const ids = [getMessengerPriceId(), getMessengerPriceId('year')].filter(Boolean)
  const existing = sub.items.data.filter((item) => ids.includes(item.price.id))
  if ((enabled && existing.length) || (!enabled && !existing.length)) {
    // Heal a missed webhook even when Stripe already has the requested state.
    await syncSubscriptionToOrg(sub)
    return
  }
  const updated = await stripe.subscriptions.update(subscriptionId, {
    items: enabled ? [{ price: priceId, quantity: 1 }] : existing.map((item) => ({ id: item.id, deleted: true })),
    proration_behavior: 'create_prorations',
    payment_behavior: 'error_if_incomplete',
  })
  await syncSubscriptionToOrg(updated)
}
