import 'server-only'
import type Stripe from 'stripe'
import { syncSubscriptionToOrg } from './sync'
import { planFromPriceId } from './plans'

/** Reconcile the customer's current subscription, not an old event snapshot.
 * A late cancellation of an older subscription must not remove a newer plan. */
export async function reconcileSubscriptionEvent(stripe: Stripe, subscriptionId: string) {
  const eventSub = await stripe.subscriptions.retrieve(subscriptionId)
  const customer = typeof eventSub.customer === 'string' ? eventSub.customer : eventSub.customer.id
  const subscriptions = await stripe.subscriptions.list({ customer, status: 'all', limit: 100 })
  const recognized = subscriptions.data.filter((sub) => sub.items.data.some((item) => planFromPriceId(item.price.id)))
  const current = recognized.find((sub) => ['active','trialing','past_due'].includes(sub.status)) ??
    recognized.find((sub) => !['incomplete','incomplete_expired'].includes(sub.status))
  if (!current) return null // incomplete Checkout has not earned access
  await syncSubscriptionToOrg(current)
  return current
}
