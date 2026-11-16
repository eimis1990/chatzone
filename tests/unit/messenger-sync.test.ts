import { beforeEach, describe, expect, it, vi } from 'vitest'
import type Stripe from 'stripe'
const { write, selected } = vi.hoisted(() => ({ write: vi.fn(), selected: vi.fn() }))
vi.mock('@/lib/supabase/service', () => ({ createServiceClient: () => ({ from: () => ({ update: write }) }) }))
vi.mock('@/lib/bots/enforce-limit', () => ({ enforceActiveBotLimit: vi.fn() }))
vi.mock('@/lib/stripe/plans', () => ({ getVoicePriceId: () => null, getVisualizerPriceId: () => null, getMessengerPriceId: (i='month') => `msg_${i}`, planFromPriceId: (id: string) => id === 'base' ? {plan:'starter',interval:'month'} : null }))
import { syncSubscriptionToOrg } from '@/lib/stripe/sync'
beforeEach(() => { vi.clearAllMocks(); selected.mockResolvedValue({ data: [], error: null }); write.mockReturnValue({ eq: () => ({ select: selected }) }) })
describe('Messenger webhook synchronization', () => {
  it.each([['active',true,true],['active',false,false],['canceled',true,false],['unpaid',true,false],['trialing',true,true]])('syncs %s with item %s to access %s', async (status, hasItem, expected) => {
    await syncSubscriptionToOrg({id:'sub', customer:'customer',status,items:{data:[{price:{id:'base'}},...(hasItem ? [{price:{id:'msg_month'},quantity:1}] : [])]}} as Stripe.Subscription)
    expect(write.mock.calls[0][0].messenger_addon).toBe(expected)
  })
  it('propagates failed writes so Stripe retries instead of losing entitlement changes', async () => {
    selected.mockResolvedValue({ data:null, error:{message:'DB offline'} })
    await expect(syncSubscriptionToOrg({id:'sub',customer:'customer',status:'active',items:{data:[]}} as unknown as Stripe.Subscription)).rejects.toThrow('DB offline')
  })
})
