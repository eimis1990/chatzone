import { requireRole, getUserOrgIds } from '@/lib/auth/guards'
import { createServerClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { SettingsPanel } from '@/components/client/SettingsPanel'
import { BillingPanel } from '@/components/client/BillingPanel'
import { isStripeConfigured, getStripe } from '@/lib/stripe/client'
import { getPriceId, PLANS, PURCHASABLE_PLANS } from '@/lib/stripe/plans'
import { ensureStripeCustomer } from '@/lib/stripe/customer'
import type { Plan, BillingInterval, SubscriptionStatus } from '@/lib/types'

export default async function SettingsPage() {
  await requireRole('client')
  const orgIds = await getUserOrgIds()
  const orgId = orgIds[0] ?? null

  let retentionDays: number | null = null
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
    const { data } = await sb
      .from('organizations')
      .select('retention_days')
      .eq('id', orgId)
      .single<{ retention_days: number | null }>()
    retentionDays = data?.retention_days ?? null

    // Billing columns may not exist before migration 0014 — tolerate the error.
    const { data: b, error: bErr } = await sb
      .from('organizations')
      .select(
        'plan, subscription_status, billing_interval, current_period_end, cancel_at_period_end, stripe_customer_id',
      )
      .eq('id', orgId)
      .single()
    if (!bErr && b) {
      const d = b as {
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
        success_url: `${base}/app/settings?billing=success`,
        cancel_url: `${base}/app/settings?billing=cancelled`,
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
        return_url: `${base}/app/settings`,
      })
      return { url: session.url }
    } catch (err) {
      return { error: err instanceof Error ? err.message : 'Could not open billing portal.' }
    }
  }

  /** Set the org conversation-retention window (service client; org verified). */
  async function setRetention(days: number | null): Promise<void> {
    'use server'
    const ids = await getUserOrgIds()
    const oid = ids[0]
    if (!oid) return
    const svc = createServiceClient()
    await svc.from('organizations').update({ retention_days: days }).eq('id', oid)
  }

  /** Erase org data (conversations+messages and/or leads). Org verified first. */
  async function deleteData(scope: 'conversations' | 'leads' | 'all'): Promise<{ ok: boolean }> {
    'use server'
    const ids = await getUserOrgIds()
    const oid = ids[0]
    if (!oid) return { ok: false }
    const svc = createServiceClient()
    const { data: bots } = await svc.from('bots').select('id').eq('org_id', oid)
    const botIds = (bots ?? []).map((b) => (b as { id: string }).id)
    if (!botIds.length) return { ok: true }
    if (scope === 'conversations' || scope === 'all') {
      await svc.from('conversations').delete().in('bot_id', botIds) // cascades messages
    }
    if (scope === 'leads' || scope === 'all') {
      await svc.from('leads').delete().in('bot_id', botIds)
    }
    return { ok: true }
  }

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-lg font-semibold">Settings</h1>
        <p className="text-sm text-muted-foreground">
          Data retention, export, and privacy controls for your organization.
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

      <SettingsPanel
        retentionDays={retentionDays}
        setRetention={setRetention}
        deleteData={deleteData}
      />
    </div>
  )
}
