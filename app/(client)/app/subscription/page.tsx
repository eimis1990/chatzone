import { requireRole, getUserOrgIds } from '@/lib/auth/guards'
import { createServerClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { BillingPanel } from '@/components/client/BillingPanel'
import { isStripeConfigured, getStripe } from '@/lib/stripe/client'
import { getPriceId, getVoicePriceId, PLANS, DISPLAY_PLANS, VOICE_ADDON } from '@/lib/stripe/plans'
import { ensureStripeCustomer } from '@/lib/stripe/customer'
import { changeBasePlan, setVoiceAddon, reconcileOrgFromStripe } from '@/lib/stripe/manage'
import type { Plan, BillingInterval, SubscriptionStatus } from '@/lib/types'

const PAYING: SubscriptionStatus[] = ['active', 'trialing', 'past_due']

export default async function SubscriptionPage({
  searchParams,
}: {
  searchParams: Promise<{ billing?: string }>
}) {
  await requireRole('client')
  const orgIds = await getUserOrgIds()
  const orgId = orgIds[0] ?? null

  const sp = await searchParams

  async function loadBilling(oid: string) {
    const sb = await createServerClient()
    const { data, error } = await sb
      .from('organizations')
      .select(
        'plan, subscription_status, billing_interval, current_period_end, cancel_at_period_end, stripe_customer_id, stripe_subscription_id, voice_addon',
      )
      .eq('id', oid)
      .single()
    const d = (!error && data ? data : {}) as Partial<{
      plan: Plan
      subscription_status: SubscriptionStatus
      billing_interval: BillingInterval | null
      current_period_end: string | null
      cancel_at_period_end: boolean | null
      stripe_customer_id: string | null
      stripe_subscription_id: string | null
      voice_addon: boolean | null
    }>
    return {
      plan: d.plan ?? ('free' as Plan),
      status: d.subscription_status ?? ('inactive' as SubscriptionStatus),
      interval: d.billing_interval ?? null,
      currentPeriodEnd: d.current_period_end ?? null,
      cancelAtPeriodEnd: d.cancel_at_period_end ?? false,
      hasCustomer: Boolean(d.stripe_customer_id),
      voiceActive: Boolean(d.voice_addon),
      subscriptionId: d.stripe_subscription_id ?? null,
    }
  }

  let billing = orgId
    ? await loadBilling(orgId)
    : {
        plan: 'free' as Plan,
        status: 'inactive' as SubscriptionStatus,
        interval: null as BillingInterval | null,
        currentPeriodEnd: null as string | null,
        cancelAtPeriodEnd: false,
        hasCustomer: false,
        voiceActive: false,
        subscriptionId: null as string | null,
      }

  // Sync from Stripe on return from Checkout, OR self-heal a missed webhook
  // (we have a Stripe customer but the row says "not paying"). Then re-read.
  const stale = billing.hasCustomer && !PAYING.includes(billing.status)
  if (orgId && isStripeConfigured() && (sp?.billing === 'success' || stale)) {
    await reconcileOrgFromStripe(orgId)
    billing = await loadBilling(orgId)
  }

  const isPaying = PAYING.includes(billing.status) && Boolean(billing.subscriptionId)

  const planOptions = DISPLAY_PLANS.map((pl) => ({
    plan: pl,
    name: PLANS[pl].name,
    monthly: PLANS[pl].monthly,
    conversations: PLANS[pl].conversations,
    blurb: PLANS[pl].blurb,
    features: [...PLANS[pl].features],
    purchasable: PLANS[pl].purchasable,
    popular: pl === 'starter',
  }))

  /**
   * Choose a plan. If the org isn't subscribed yet → Stripe Checkout (returns a
   * URL). If it already has a subscription → swap the base item in place
   * (proration), no second subscription. Returns {url} | {ok} | {error}.
   */
  async function selectPlan(
    plan: Plan,
    interval: BillingInterval,
  ): Promise<{ url?: string; ok?: boolean; error?: string }> {
    'use server'
    const ids = await getUserOrgIds()
    const oid = ids[0]
    if (!oid) return { error: 'No organization found.' }
    const stripe = getStripe()
    if (!stripe) return { error: 'Billing is not enabled yet.' }
    const priceId = getPriceId(plan, interval)
    if (!priceId) return { error: `No Stripe price configured for ${plan} (${interval}).` }

    const svc = createServiceClient()
    const { data: org } = await svc
      .from('organizations')
      .select('subscription_status, stripe_subscription_id')
      .eq('id', oid)
      .single<{ subscription_status: SubscriptionStatus | null; stripe_subscription_id: string | null }>()

    const paying =
      org?.subscription_status &&
      PAYING.includes(org.subscription_status) &&
      org.stripe_subscription_id

    try {
      if (paying && org?.stripe_subscription_id) {
        await changeBasePlan(org.stripe_subscription_id, priceId)
        return { ok: true }
      }
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
      return { error: err instanceof Error ? err.message : 'Could not update your plan.' }
    }
  }

  /** Add or remove the Voice add-on on the existing subscription. */
  async function setVoice(enabled: boolean): Promise<{ ok?: boolean; error?: string }> {
    'use server'
    const ids = await getUserOrgIds()
    const oid = ids[0]
    if (!oid) return { error: 'No organization found.' }
    const stripe = getStripe()
    if (!stripe) return { error: 'Billing is not enabled yet.' }
    if (!getVoicePriceId()) return { error: 'Voice add-on isn’t configured yet.' }

    const svc = createServiceClient()
    const { data: org } = await svc
      .from('organizations')
      .select('subscription_status, stripe_subscription_id')
      .eq('id', oid)
      .single<{ subscription_status: SubscriptionStatus | null; stripe_subscription_id: string | null }>()

    if (
      !org?.stripe_subscription_id ||
      !org.subscription_status ||
      !PAYING.includes(org.subscription_status)
    ) {
      return { error: 'Add a paid plan first, then you can enable the voice agent.' }
    }
    try {
      await setVoiceAddon(org.stripe_subscription_id, enabled)
      return { ok: true }
    } catch (err) {
      return { error: err instanceof Error ? err.message : 'Could not update the voice add-on.' }
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
    <div className="space-y-8 p-6">
      <div>
        <h1 className="text-lg font-semibold">Subscription</h1>
        <p className="text-sm text-muted-foreground">
          Choose a plan, upgrade or downgrade, add the voice agent, and manage your billing.
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
        isPaying={isPaying}
        voiceActive={billing.voiceActive}
        voiceConfigured={Boolean(getVoicePriceId())}
        voice={{
          name: VOICE_ADDON.name,
          monthly: VOICE_ADDON.monthly,
          blurb: VOICE_ADDON.blurb,
          features: [...VOICE_ADDON.features],
        }}
        plans={planOptions}
        selectPlan={selectPlan}
        setVoice={setVoice}
        openPortal={openPortal}
      />
    </div>
  )
}
