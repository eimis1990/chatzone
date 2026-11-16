import { NextResponse, type NextRequest } from 'next/server'
import type Stripe from 'stripe'
import { getStripe } from '@/lib/stripe/client'
import { getEnv } from '@/lib/env'
import { reconcileSubscriptionEvent } from '@/lib/stripe/reconcile-event'
import { createServiceClient } from '@/lib/supabase/service'
import { fulfillTopup, expireStaleTopups } from '@/lib/stripe/topups'
import { getExtraConversationsPriceId, planFromPriceId } from '@/lib/stripe/plans'

// Signature verification needs the raw body + Node crypto.
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  const stripe = getStripe()
  const secret = getEnv().STRIPE_WEBHOOK_SECRET
  if (!stripe || !secret) {
    return NextResponse.json({ error: 'Billing not configured' }, { status: 503 })
  }

  const sig = req.headers.get('stripe-signature')
  if (!sig) return NextResponse.json({ error: 'Missing stripe-signature' }, { status: 400 })

  const body = await req.text()
  let event: Stripe.Event
  try {
    event = await stripe.webhooks.constructEventAsync(body, sig, secret)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'unknown'
    return NextResponse.json({ error: `Invalid signature: ${message}` }, { status: 400 })
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed':
      case 'checkout.session.async_payment_succeeded': {
        const session = event.data.object
        if (session.metadata?.topup_purchase_id || session.metadata?.extra_conversations) {
          await fulfillTopup(stripe, createServiceClient(), session, event.created)
        }
        // One-time "done-for-you" setup purchase — record it for the owner.
        if (session.metadata?.setup_package && session.payment_status === 'paid') {
          const svc = createServiceClient()
          const { error } = await svc.from('setup_orders').upsert(
            {
              org_id: session.metadata.org_id ?? null,
              package: session.metadata.setup_package,
              amount_cents: session.amount_total ?? 0,
              currency: session.currency ?? 'eur',
              stripe_session_id: session.id,
              status: 'paid',
            },
            { onConflict: 'stripe_session_id' },
          )
          if (error) throw new Error('Could not record setup payment')
        }
        const sub = session.subscription
        if (sub) {
          const subId = typeof sub === 'string' ? sub : sub.id
          await reconcileSubscriptionEvent(stripe, subId)
        }
        break
      }
      case 'customer.subscription.created':
      case 'customer.subscription.updated':
      case 'customer.subscription.deleted': {
        // Retrieve current state: an old event must not roll back a later change.
        const sub = await reconcileSubscriptionEvent(stripe, event.data.object.id)
        if (!sub) break
        const base = sub.items.data.map((item) => planFromPriceId(item.price.id)).find(Boolean)
        const customer = typeof sub.customer === 'string' ? sub.customer : sub.customer.id
        const eligible = ['active','trialing','past_due'].includes(sub.status) && base ? getExtraConversationsPriceId(base.plan) : null
        await expireStaleTopups(stripe, customer, eligible)
        break
      }
      case 'invoice.paid':
      case 'invoice.payment_failed': {
        const subscription = event.data.object.parent?.subscription_details?.subscription
        if (subscription) await reconcileSubscriptionEvent(stripe, typeof subscription === 'string' ? subscription : subscription.id)
        break
      }
      case 'charge.refunded':
      case 'charge.dispute.created':
      case 'radar.early_fraud_warning.created': {
        const object = event.data.object
        const chargeRef = event.type === 'charge.refunded' ? object.id : ('charge' in object ? object.charge : null)
        const charge = chargeRef ? await stripe.charges.retrieve(typeof chargeRef === 'string' ? chargeRef : chargeRef.id) : null
        const customer = typeof charge?.customer === 'string' ? charge.customer : charge?.customer?.id ?? null
        const payment = typeof charge?.payment_intent === 'string' ? charge.payment_intent : charge?.payment_intent?.id ?? null
        const db = createServiceClient()
        // Preserve consumed credits; refunds/disputes require an explicit,
        // auditable reconciliation rather than silently resetting usage.
        const { error } = await db.from('billing_review_events').upsert({
          stripe_event_id: event.id, stripe_customer_id: customer, stripe_payment_intent_id: payment, kind: event.type,
        }, { onConflict: 'stripe_event_id', ignoreDuplicates: true })
        if (error) throw new Error('Could not queue billing review')
        if (payment) {
          const { error: reviewError } = await db.from('conversation_topup_purchases').update({ review_reason: event.type })
            .eq('stripe_payment_intent_id', payment)
          if (reviewError) throw new Error('Could not flag top-up for review')
        }
        break
      }
      default:
        break
    }
  } catch (err) {
    // 500 makes Stripe retry — right for transient DB errors.
    const message = err instanceof Error ? err.message : 'handler error'
    return NextResponse.json({ error: message }, { status: 500 })
  }

  return NextResponse.json({ received: true })
}
