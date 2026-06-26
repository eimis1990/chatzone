import 'server-only'
import type Stripe from 'stripe'
import { createServiceClient } from '@/lib/supabase/service'
import { planFromPriceId } from './plans'
import type { Plan, BillingInterval, SubscriptionStatus } from '@/lib/types'

/** Map Stripe's subscription status onto ours (unknowns → inactive). */
function mapStatus(status: Stripe.Subscription.Status): SubscriptionStatus {
  switch (status) {
    case 'trialing':
      return 'trialing'
    case 'active':
      return 'active'
    case 'past_due':
      return 'past_due'
    case 'canceled':
      return 'canceled'
    case 'unpaid':
      return 'unpaid'
    default:
      // incomplete, incomplete_expired, paused, …
      return 'inactive'
  }
}

/** Period end is on the item in newer API versions, on the sub in older ones. */
function periodEndIso(sub: Stripe.Subscription): string | null {
  const item = sub.items?.data?.[0] as { current_period_end?: number } | undefined
  const epoch =
    item?.current_period_end ??
    (sub as unknown as { current_period_end?: number }).current_period_end
  return typeof epoch === 'number' ? new Date(epoch * 1000).toISOString() : null
}

/**
 * Mirror a Stripe subscription onto its organization row (matched by
 * stripe_customer_id). Called from the webhook and after Checkout completes.
 * When the subscription isn't in a paying state we drop the org back to Free.
 */
export async function syncSubscriptionToOrg(sub: Stripe.Subscription): Promise<void> {
  const svc = createServiceClient()
  const customerId = typeof sub.customer === 'string' ? sub.customer : sub.customer.id

  const priceId = sub.items?.data?.[0]?.price?.id ?? null
  const match = priceId ? planFromPriceId(priceId) : null
  const status = mapStatus(sub.status)

  const paying = status === 'active' || status === 'trialing' || status === 'past_due'
  const plan: Plan = paying && match ? match.plan : 'free'
  const interval: BillingInterval | null = paying && match ? match.interval : null

  await svc
    .from('organizations')
    .update({
      stripe_subscription_id: sub.id,
      plan,
      subscription_status: status,
      billing_interval: interval,
      current_period_end: periodEndIso(sub),
      cancel_at_period_end: sub.cancel_at_period_end ?? false,
    })
    .eq('stripe_customer_id', customerId)
}
