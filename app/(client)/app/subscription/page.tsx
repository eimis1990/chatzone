import { requireRole, getUserOrgIds } from '@/lib/auth/guards'
import { createServerClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { BillingPanel } from '@/components/client/BillingPanel'
import { isStripeConfigured, getStripe } from '@/lib/stripe/client'
import { getPriceId, PLANS, PURCHASABLE_PLANS } from '@/lib/stripe/plans'
import { ensureStripeCustomer } from '@/lib/stripe/customer'
import type { Plan, BillingInterval, SubscriptionStatus } from '@/lib/types'

export default async function SubscriptionPage() {
  await requireRole('client')
  const orgIds = await getUserOrgIds()
  const orgId = orgIds[0] ?? null

  const billing = {
    plan: 'free' as Plan,
    status: 'inactive' as SubscriptionStatus,
    interval: null as BillingInterval | null,
    currentPeriodEnd: null as string | null,
    cancelAtPeriodEnd: false,
    hasCustomer: false,
  }
  if (orgId) {
    const sb = await createServerClient()
    const { data, error } = await sb
      .from('organizations')
      .select(
        'plan, subscription_status, billing_interval, current_period_end, cancel_at_period_end, stripe_customer_id',
      )
      .eq('id', orgId)
      .single()
    if (!error && data) {
      const d = data as {
        plan: Plan | null
        subscription_status: SubscriptionStatus | null
        billing_interval: BillingInterval | null
        current_period_end: string | null
        cancel_at_period_end: boolean | null
        stripe_customer_id: string | null
      }
      billing.plan = d.plan ?? 'free'
      billing.status = d.subscription_status ?? 'inactive'
      billing.interval = d.billing_interval ?? null
      billing.currentPeriodEnd = d.current_period_end ?? null
      billing.cancelAtPeriodEnd = d.cancel_at_period_end ?? false
      billing.hasCustomer = Boolean(d.stripe_customer_id)
    }
  }

  const planOptions = PURCHASABLE_PLANS.map((pl) => ({
    plan: pl,
    name: PLANS[pl].name,
    monthly: PLANS[pl].monthly,
    conversations: PLANS[pl].conversations,
    blurb: PLANS[pl].blurb,
    features: PLANS[pl].features,
  }))

  /** Start a Stripe Checkout session for a plan+interval (org verified). */
  async function startCheckout(
    plan: Plan,
    interval: BillingInterval,
  ): Promise<{ url?: string; error?: string }> {
    'use server'
    const ids = await getUserOrgIds()
    const oid = ids[0]
    if (!oid) return { error: 'No organization found.' }
    const stripe = getStripe()
    if (!stripe) return { error: 'Billing is not enabled yet.' }
    const priceId = getPriceId(plan, interval)
    if (!priceId) return { error: `No Stripe price configured for ${plan} (${interval}).` }
    try {
      const customerId = await ensureStripeCustomer(oid)
      const base = process.env.NEXT_PUBLIC_APP_URL ?? ''
      const session = await stripe.checkout.sessions.create({
        mode: 'subscription',
        customer: customerId,
        line_items: [{ price: priceId, quantity: 1 }],
        success_url: `${base}/app/subscription?billing=success`,
        cancel_url: `${base}/app/subscription?billing=cancelled`,
        allow_promotion_codes: true,
        subscription_data: { metadata: { org_id: oid } },
      })
      return { url: session.url ?? undefined }
    } catch (err) {
      return { error: err instanceof Error ? err.message : 'Could not start checkout.' }
    }
  }

  /** Open the Stripe Billing Customer Portal (org verified). */
  async function openPortal(): Promise<{ url?: string; error?: string }> {
    'use server'
    const ids = await getUserOrgIds()
    const oid = ids[0]
    if (!oid) return { error: 'No organization found.' }
    const stripe = getStripe()
    if (!stripe) return { error: 'Billing is not enabled yet.' }
    const svc = createServiceClient()
    const { data } = await svc
      .from('organizations')
      .select('stripe_customer_id')
      .eq('id', oid)
      .single<{ stripe_customer_id: string | null }>()
    if (!data?.stripe_customer_id) return { error: 'No billing account yet — pick a plan first.' }
    try {
      const base = process.env.NEXT_PUBLIC_APP_URL ?? ''
      const session = await stripe.billingPortal.sessions.create({
        customer: data.stripe_customer_id,
        return_url: `${base}/app/subscription`,
      })
      return { url: session.url }
    } catch (err) {
      return { error: err instanceof Error ? err.message : 'Could not open billing portal.' }
    }
  }

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-lg font-semibold">Subscription</h1>
        <p className="text-sm text-muted-foreground">
          Choose a plan, upgrade or downgrade, and manage your billing details.
        </p>
      </div>

      <BillingPanel
        billingEnabled={isStripeConfigured()}
        plan={billing.plan}
        status={billing.status}
        interval={billing.interval}
        currentPeriodEnd={billing.currentPeriodEnd}
        cancelAtPeriodEnd={billing.cancelAtPeriodEnd}
        hasCustomer={billing.hasCustomer}
        plans={planOptions}
        startCheckout={startCheckout}
        openPortal={openPortal}
      />
    </div>
  )
}
