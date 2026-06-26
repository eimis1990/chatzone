import 'server-only'
import { requireStripe } from './client'
import { createServiceClient } from '@/lib/supabase/service'
import type { Organization } from '@/lib/types'

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
  if (org.stripe_customer_id) return org.stripe_customer_id

  const stripe = requireStripe()
  const customer = await stripe.customers.create({
    name: org.name,
    metadata: { org_id: orgId },
  })
  await svc.from('organizations').update({ stripe_customer_id: customer.id }).eq('id', orgId)
  return customer.id
}
