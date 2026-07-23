import { requireRole, getUserOrgIds } from '@/lib/auth/guards'
import { createServerClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { BillingPanel } from '@/components/client/BillingPanel'
import { isStripeConfigured, getStripe, checkoutTaxParams } from '@/lib/stripe/client'
import { getPriceId, getVoicePriceId, getVisualizerPriceId, getSetupPriceId, PLANS, DISPLAY_PLANS, VOICE_ADDON, VISUALIZER_ADDON } from '@/lib/stripe/plans'
import { SETUP_PACKAGES } from '@/lib/setup-packages'
import { ensureStripeCustomer } from '@/lib/stripe/customer'
import {
  changeBasePlan,
  setVoiceAddon,
  setVisualizerAddon,
  reconcileOrgFromStripe,
  activeSubscriptionId,
} from '@/lib/stripe/manage'
import { entitlementsFor } from '@/lib/entitlements'
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
        'plan, subscription_status, billing_interval, current_period_end, cancel_at_period_end, stripe_customer_id, stripe_subscription_id, voice_addon, visualizer_addon',
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
      visualizer_addon: boolean | null
    }>
    return {
      plan: d.plan ?? ('free' as Plan),
      status: d.subscription_status ?? ('inactive' as SubscriptionStatus),
      interval: d.billing_interval ?? null,
      currentPeriodEnd: d.current_period_end ?? null,
      cancelAtPeriodEnd: d.cancel_at_period_end ?? false,
      hasCustomer: Boolean(d.stripe_customer_id),
      voiceActive: Boolean(d.voice_addon),
      visualizerActive: Boolean(d.visualizer_addon),
      subscriptionId: d.stripe_subscription_id ?? null,
    }
  }

  // Usage this calendar month: conversations started + bots in use vs the plan.
  async function loadUsage(oid: string) {
    const sb = await createServerClient()
    const { data: bots } = await sb.from('bots').select('id').eq('org_id', oid)
    const botIds = (bots ?? []).map((b) => (b as { id: string }).id)
    if (!botIds.length) return { conversationsUsed: 0, botsUsed: 0 }
    const now = new Date()
    const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)).toISOString()
    const { count } = await sb
      .from('conversations')
      .select('id', { count: 'exact', head: true })
      .in('bot_id', botIds)
      .gte('started_at', monthStart)
    return { conversationsUsed: count ?? 0, botsUsed: botIds.length }
  }

  // Which one-time setup packages this org has already paid for.
  async function loadPurchasedSetups(oid: string) {
    const sb = await createServerClient()
    const { data: orders } = await sb
      .from('setup_orders')
      .select('package')
      .eq('org_id', oid)
      .eq('status', 'paid')
    return (orders ?? []).map((o) => (o as { package: string }).package)
  }

  // These three reads are independent — fetch them in one round-trip batch
  // instead of three sequential awaits.
  let billing
  let usage: { conversationsUsed: number; botsUsed: number }
  let purchasedSetups: string[]
  if (orgId) {
    ;[billing, usage, purchasedSetups] = await Promise.all([
      loadBilling(orgId),
      loadUsage(orgId),
      loadPurchasedSetups(orgId),
    ])
  } else {
    billing = {
      plan: 'free' as Plan,
      status: 'inactive' as SubscriptionStatus,
      interval: null as BillingInterval | null,
      currentPeriodEnd: null as string | null,
      cancelAtPeriodEnd: false,
      hasCustomer: false,
      voiceActive: false,
      visualizerActive: false,
      subscriptionId: null as string | null,
    }
    usage = { conversationsUsed: 0, botsUsed: 0 }
    purchasedSetups = []
  }

  // Sync from Stripe on return from Checkout, OR self-heal a missed webhook
  // (we have a Stripe customer but the row says "not paying"). Then re-read.
  const stale = billing.hasCustomer && !PAYING.includes(billing.status)
  if (orgId && isStripeConfigured() && (sp?.billing === 'success' || stale)) {
    await reconcileOrgFromStripe(orgId)
    billing = await loadBilling(orgId)
  }

  const isPaying = PAYING.includes(billing.status) && Boolean(billing.subscriptionId)
  const ent = entitlementsFor(billing.plan)

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

    try {
      // Source of truth is Stripe, not the (possibly stale) org row — this is
      // what prevents a second Checkout creating a duplicate subscription.
      const existingSubId = await activeSubscriptionId(oid)
      if (existingSubId) {
        await changeBasePlan(existingSubId, priceId)
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
        ...checkoutTaxParams(),
      })
      return { url: session.url ?? undefined }
    } catch (err) {
      return { error: err instanceof Error ? err.message : 'Could not update your plan.' }
    }
  }

  /** Buy a one-time "done-for-you" setup package (Stripe Checkout, mode: payment). */
  async function buySetup(pkg: 'essential' | 'ecommerce'): Promise<{ url?: string; error?: string }> {
    'use server'
    const ids = await getUserOrgIds()
    const oid = ids[0]
    if (!oid) return { error: 'No organization found.' }
    const stripe = getStripe()
    if (!stripe) return { error: 'Billing is not enabled yet.' }
    const priceId = getSetupPriceId(pkg)
    if (!priceId) return { error: 'This setup package isn’t configured yet.' }
    try {
      const customerId = await ensureStripeCustomer(oid)
      const base = process.env.NEXT_PUBLIC_APP_URL ?? ''
      const session = await stripe.checkout.sessions.create({
        mode: 'payment',
        customer: customerId,
        line_items: [{ price: priceId, quantity: 1 }],
        success_url: `${base}/app/subscription?setup=success`,
        cancel_url: `${base}/app/subscription?setup=cancelled`,
        metadata: { org_id: oid, setup_package: pkg },
        payment_intent_data: { metadata: { org_id: oid, setup_package: pkg } },
        // One-time payments don't invoice by default — enable so setup
        // packages produce a proper (tax-itemized) invoice for the client.
        invoice_creation: { enabled: true },
        ...checkoutTaxParams(),
      })
      return { url: session.url ?? undefined }
    } catch (err) {
      return { error: err instanceof Error ? err.message : 'Could not start checkout.' }
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

    try {
      const existingSubId = await activeSubscriptionId(oid)
      if (!existingSubId) {
        return { error: 'Add a paid plan first, then you can enable the voice agent.' }
      }
      await setVoiceAddon(existingSubId, enabled)
      return { ok: true }
    } catch (err) {
      return { error: err instanceof Error ? err.message : 'Could not update the voice add-on.' }
    }
  }

  /** Add or remove the Product visualizer add-on on the existing subscription. */
  async function setVisualizer(enabled: boolean): Promise<{ ok?: boolean; error?: string }> {
    'use server'
    const ids = await getUserOrgIds()
    const oid = ids[0]
    if (!oid) return { error: 'No organization found.' }
    const stripe = getStripe()
    if (!stripe) return { error: 'Billing is not enabled yet.' }
    if (!getVisualizerPriceId()) return { error: 'Product visualizer add-on isn\u2019t configured yet.' }

    try {
      const existingSubId = await activeSubscriptionId(oid)
      if (!existingSubId) {
        return { error: 'Add a paid plan first, then you can enable the product visualizer.' }
      }
      await setVisualizerAddon(existingSubId, enabled)
      return { ok: true }
    } catch (err) {
      return { error: err instanceof Error ? err.message : 'Could not update the product visualizer add-on.' }
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
        usage={{
          conversationsUsed: usage.conversationsUsed,
          conversationsLimit: ent.conversations,
          botsUsed: usage.botsUsed,
          botsLimit: ent.maxBots,
        }}
        voiceActive={billing.voiceActive}
        voiceConfigured={Boolean(getVoicePriceId())}
        voice={{
          name: VOICE_ADDON.name,
          monthly: VOICE_ADDON.monthly,
          blurb: VOICE_ADDON.blurb,
          features: [...VOICE_ADDON.features],
        }}
        visualizerActive={billing.visualizerActive}
        visualizerConfigured={Boolean(getVisualizerPriceId())}
        visualizer={{
          name: VISUALIZER_ADDON.name,
          monthly: VISUALIZER_ADDON.monthly,
          blurb: VISUALIZER_ADDON.blurb,
          features: [...VISUALIZER_ADDON.features],
        }}
        plans={planOptions}
        setupPackages={SETUP_PACKAGES.map((p) => ({
          id: p.id,
          name: p.name,
          price: p.price,
          blurb: p.blurb,
          features: [...p.features],
        }))}
        purchasedSetups={purchasedSetups}
        selectPlan={selectPlan}
        setVoice={setVoice}
        setVisualizer={setVisualizer}
        buySetup={buySetup}
        openPortal={openPortal}
      />
    </div>
  )
}
