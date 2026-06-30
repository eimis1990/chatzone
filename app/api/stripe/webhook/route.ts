import { NextResponse, type NextRequest } from 'next/server'
import type Stripe from 'stripe'
import { getStripe } from '@/lib/stripe/client'
import { getEnv } from '@/lib/env'
import { syncSubscriptionToOrg } from '@/lib/stripe/sync'
import { createServiceClient } from '@/lib/supabase/service'

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
      case 'checkout.session.completed': {
        const session = event.data.object
        // One-time "done-for-you" setup purchase — record it for the owner.
        if (session.metadata?.setup_package) {
          const svc = createServiceClient()
          await svc.from('setup_orders').upsert(
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
        }
        const sub = session.subscription
        if (sub) {
          const subId = typeof sub === 'string' ? sub : sub.id
          const full = await stripe.subscriptions.retrieve(subId)
          await syncSubscriptionToOrg(full)
        }
        break
      }
      case 'customer.subscription.created':
      case 'customer.subscription.updated':
      case 'customer.subscription.deleted': {
        await syncSubscriptionToOrg(event.data.object)
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
