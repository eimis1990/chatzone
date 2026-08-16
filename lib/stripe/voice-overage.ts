import 'server-only'
import { getStripe } from './client'
import { createServiceClient } from '@/lib/supabase/service'
import { isInternalOrg } from '@/lib/entitlements'

/** Billing Meter event name — must match scripts/setup-stripe-voice-overage.mjs. */
export const VOICE_OVERAGE_METER_EVENT = 'voice_overage_minutes'

/**
 * Report billable overage minutes to Stripe's voice meter. No-ops when Stripe
 * is unconfigured, the org has no customer / no active voice add-on, or is an
 * internal org. Throws on Stripe API failure — the caller decides whether
 * that's fatal (the webhook logs and continues: usage is already safely in
 * voice_usage, so a missed event can be reconciled from there).
 */
export async function reportVoiceOverage(orgId: string, minutes: number): Promise<void> {
  if (minutes <= 0) return
  const stripe = getStripe()
  if (!stripe) return
  const svc = createServiceClient()
  const { data: org } = await svc
    .from('organizations')
    .select('stripe_customer_id, voice_addon, is_demo, is_platform')
    .eq('id', orgId)
    .single<{
      stripe_customer_id: string | null
      voice_addon: boolean | null
      is_demo: boolean | null
      is_platform: boolean | null
    }>()
  if (!org?.stripe_customer_id || !org.voice_addon || isInternalOrg(org)) return
  await stripe.billing.meterEvents.create({
    event_name: VOICE_OVERAGE_METER_EVENT,
    payload: { stripe_customer_id: org.stripe_customer_id, value: String(minutes) },
  })
}
