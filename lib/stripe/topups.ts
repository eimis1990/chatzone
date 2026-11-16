import 'server-only'
import type Stripe from 'stripe'
import type { SupabaseClient } from '@supabase/supabase-js'
import { conversationTopupFor } from '@/lib/plans-catalog'
import { getExtraConversationsPriceId, planFromPriceId } from './plans'
import { checkoutTaxParams } from './client'

export function topupSku(priceId: string): number | null {
  if (priceId === getExtraConversationsPriceId('basic')) return 200
  if (priceId === getExtraConversationsPriceId('starter')) return 1000
  return null
}

/** Resolve eligibility against Stripe at purchase time, then freeze the offer. */
export async function createTopupCheckout(stripe: Stripe, db: SupabaseClient, orgId: string, subscriptionId: string) {
  const sub = await stripe.subscriptions.retrieve(subscriptionId)
  const base = sub.items.data.map((item) => planFromPriceId(item.price.id)).find(Boolean)
  if (!['active', 'trialing', 'past_due'].includes(sub.status) || !base) throw new Error('An active paid Loqara plan is required.')
  const offer = conversationTopupFor(base.plan)
  const priceId = getExtraConversationsPriceId(base.plan)
  if (!offer || !priceId) throw new Error('Conversation top-ups are not configured for this plan.')
  const customer = typeof sub.customer === 'string' ? sub.customer : sub.customer.id
  const { data: org, error: orgError } = await db.from('organizations').select('stripe_customer_id').eq('id', orgId).single()
  if (orgError || org?.stripe_customer_id !== customer) throw new Error('Billing account mismatch')
  const { data: purchase, error } = await db.from('conversation_topup_purchases').insert({
    org_id: orgId, stripe_customer_id: customer, plan: base.plan, price_id: priceId, conversations: offer.conversations,
  }).select('id').single()
  if (error || !purchase) throw new Error('Could not prepare top-up purchase')
  const origin = process.env.NEXT_PUBLIC_APP_URL ?? ''
  const session = await stripe.checkout.sessions.create({
    integration_identifier: 'loqara_checkout_aqkvmztr', mode: 'payment', customer,
    line_items: [{ price: priceId, quantity: 1 }],
    metadata: { topup_purchase_id: purchase.id },
    success_url: `${origin}/app/subscription?topup=success`, cancel_url: `${origin}/app/subscription?topup=cancelled`,
    invoice_creation: { enabled: true },
    custom_text: { submit: { message: 'Credits expire at the end of the UTC calendar month in which payment succeeds. No automatic recharge.' } },
    ...checkoutTaxParams(),
  }, { idempotencyKey: `topup-${purchase.id}` })
  const { error: linkError } = await db.from('conversation_topup_purchases').update({ stripe_session_id: session.id }).eq('id', purchase.id)
  if (linkError) {
    await stripe.checkout.sessions.expire(session.id)
    throw new Error('Could not prepare top-up checkout')
  }
  return session
}

/** Idempotent fulfillment, including delayed payments and old Checkout links. */
export async function fulfillTopup(stripe: Stripe, db: SupabaseClient, eventSession: Stripe.Checkout.Session, paidEpoch: number) {
  if (eventSession.mode !== 'payment' || eventSession.payment_status !== 'paid') return
  const session = await stripe.checkout.sessions.retrieve(eventSession.id)
  if (session.payment_status !== 'paid') return
  const customer = typeof session.customer === 'string' ? session.customer : session.customer?.id
  if (!customer) throw new Error('Top-up customer missing')
  const { data: org, error: orgError } = await db.from('organizations').select('id').eq('stripe_customer_id', customer).single()
  if (orgError || !org) throw new Error('Top-up organization not found')
  const items = await stripe.checkout.sessions.listLineItems(session.id, { limit: 2 })
  const item = items.data[0]
  const credits = item?.price ? topupSku(item.price.id) : null
  if (items.data.length !== 1 || items.has_more || !credits || item.quantity !== 1 ||
      item.price?.currency !== 'eur' || item.price.unit_amount !== 1500 || item.price.recurring) {
    throw new Error('Invalid conversation top-up SKU')
  }
  const purchaseId = session.metadata?.topup_purchase_id
  if (purchaseId) {
    const { data: purchase, error } = await db.from('conversation_topup_purchases').select('*').eq('id', purchaseId).single()
    if (error || !purchase || purchase.org_id !== org.id || purchase.stripe_customer_id !== customer ||
        purchase.stripe_session_id !== session.id || purchase.price_id !== item.price.id || purchase.conversations !== credits) {
      throw new Error('Top-up offer does not match payment')
    }
  } else if (session.metadata?.org_id !== org.id || credits !== 1000) {
    // Honor the old 1,000-credit Checkout sessions created before this rollout.
    throw new Error('Unrecognized top-up purchase')
  }
  const paidAt = new Date(paidEpoch * 1000)
  const month = new Date(Date.UTC(paidAt.getUTCFullYear(), paidAt.getUTCMonth(), 1)).toISOString().slice(0, 10)
  const { error: creditError } = await db.from('conversation_credits').insert({
    org_id: org.id, month, conversations: credits, stripe_session_id: session.id,
  })
  if (creditError && creditError.code !== '23505') throw new Error(`Could not credit top-up: ${creditError.message}`)
  if (purchaseId) {
    // Read back the credited month: a later replay must not move its expiry.
    const { data: credited, error: readError } = await db.from('conversation_credits').select('month').eq('stripe_session_id', session.id).single()
    if (readError || !credited) throw new Error('Could not verify credited purchase')
    const { error } = await db.from('conversation_topup_purchases').update({
      paid_at: paidAt.toISOString(), credit_month: credited.month,
      stripe_payment_intent_id: typeof session.payment_intent === 'string' ? session.payment_intent : session.payment_intent?.id ?? null,
    }).eq('id', purchaseId).is('paid_at', null)
    if (error) throw new Error('Could not record top-up payment')
  }
}

/** Invalidate unpaid links after a tier change; already-paid offers are honored. */
export async function expireStaleTopups(stripe: Stripe, customer: string, eligiblePriceId: string | null) {
  for await (const session of stripe.checkout.sessions.list({ customer, status: 'open', limit: 100 })) {
    if (!session.metadata?.topup_purchase_id && !session.metadata?.extra_conversations) continue
    const items = await stripe.checkout.sessions.listLineItems(session.id, { limit: 2 })
    if (items.data[0]?.price?.id === eligiblePriceId) continue
    try { await stripe.checkout.sessions.expire(session.id) } catch (error) {
      const fresh = await stripe.checkout.sessions.retrieve(session.id)
      if (fresh.status === 'open') throw error
    }
  }
}
