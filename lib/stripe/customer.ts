import 'server-only'
import { requireStripe } from './client'
import { isMissingStripeCustomerError } from './errors'
import { createServiceClient } from '@/lib/supabase/service'
import type { Organization } from '@/lib/types'

/**
 * Remove a customer pointer that the configured Stripe account has explicitly
 * reported as missing. The customer predicate prevents clobbering a newer id
 * if another request repaired the organization first.
 */
export async function resetMissingStripeCustomer(
  orgId: string,
  missingCustomerId: string,
): Promise<void> {
  const svc = createServiceClient()
  const { error } = await svc
    .from('organizations')
    .update({
      stripe_customer_id: null,
      stripe_subscription_id: null,
      plan: 'free',
      subscription_status: 'inactive',
      billing_interval: null,
      current_period_end: null,
      cancel_at_period_end: false,
      voice_addon: false,
      visualizer_addon: false,
    })
    .eq('id', orgId)
    .eq('stripe_customer_id', missingCustomerId)

  if (error) throw new Error('Could not reset the disconnected billing account.', { cause: error })
}

/**
 * Returns the org's Stripe customer id, creating the customer on first use and
 * persisting it back to the organization. Trusted server path — callers must
 * have already verified the org belongs to the signed-in user.
 */
export async function ensureStripeCustomer(orgId: string): Promise<string> {
  const svc = createServiceClient()
  const { data: org } = await svc
    .from('organizations')
    .select('id, name, stripe_customer_id')
    .eq('id', orgId)
    .single<Pick<Organization, 'id' | 'name' | 'stripe_customer_id'>>()
  if (!org) throw new Error('Organization not found')

  const stripe = requireStripe()
  if (org.stripe_customer_id) {
    try {
      const customer = await stripe.customers.retrieve(org.stripe_customer_id)
      if (!customer.deleted) return org.stripe_customer_id
      await resetMissingStripeCustomer(orgId, org.stripe_customer_id)
    } catch (error) {
      if (!isMissingStripeCustomerError(error)) throw error
      await resetMissingStripeCustomer(orgId, org.stripe_customer_id)
    }
  }

  const customer = await stripe.customers.create({
    name: org.name,
    metadata: { org_id: orgId },
  })
  const { error } = await svc
    .from('organizations')
    .update({ stripe_customer_id: customer.id })
    .eq('id', orgId)
  if (error) throw new Error('Could not save the billing account.', { cause: error })
  return customer.id
}
