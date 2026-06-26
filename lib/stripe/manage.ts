import 'server-only'
import { requireStripe } from './client'
import { getVoicePriceId, planFromPriceId } from './plans'
import { syncSubscriptionToOrg } from './sync'

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

/** Add or remove the Voice add-on item on an existing subscription. */
export async function setVoiceAddon(subscriptionId: string, enabled: boolean): Promise<void> {
  const stripe = requireStripe()
  const voicePriceId = getVoicePriceId()
  if (!voicePriceId) throw new Error('Voice add-on price is not configured.')

  const sub = await stripe.subscriptions.retrieve(subscriptionId)
  const existing = sub.items.data.find((i) => i.price?.id === voicePriceId)

  if (enabled && !existing) {
    const updated = await stripe.subscriptions.update(subscriptionId, {
      items: [{ price: voicePriceId }],
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
