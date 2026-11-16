import { beforeEach, describe, expect, it, vi } from 'vitest'
const { retrieve, update, sync } = vi.hoisted(() => ({ retrieve: vi.fn(), update: vi.fn(), sync: vi.fn() }))
vi.mock('@/lib/stripe/client', () => ({ getStripe: vi.fn(), requireStripe: () => ({ subscriptions: { retrieve, update } }) }))
vi.mock('@/lib/stripe/topups', () => ({ expireStaleTopups: vi.fn() }))
vi.mock('@/lib/stripe/sync', () => ({ syncSubscriptionToOrg: sync }))
vi.mock('@/lib/stripe/plans', () => ({
  getExtraConversationsPriceId: () => 'topup',
  getMessengerPriceId: (interval = 'month') => `messenger_${interval}`,
  getVoicePriceId: () => 'voice', getVoiceOveragePriceId: () => 'overage', getVisualizerPriceId: () => 'visualizer',
  planFromPriceId: (id: string) => id.startsWith('base_') ? { plan: 'starter', interval: id.slice(5) } : null,
}))
import { setMessengerAddon, changeBasePlan } from '@/lib/stripe/manage'
const item = (id: string, price: string) => ({ id, price: { id: price }, quantity: 1 })
beforeEach(() => { vi.clearAllMocks(); update.mockResolvedValue({ id: 'updated' }) })
describe('Messenger subscription changes', () => {
  it.each(['month', 'year'])('adds exactly one %s item and synchronizes access', async (interval) => {
    retrieve.mockResolvedValue({ status: 'active', items: { data: [item('base', `base_${interval}`)] } })
    await setMessengerAddon('sub', true)
    expect(update).toHaveBeenCalledWith('sub', { items: [{ price: `messenger_${interval}`, quantity: 1 }], proration_behavior: 'create_prorations', payment_behavior: 'error_if_incomplete' })
    expect(sync).toHaveBeenCalledWith({ id: 'updated' })
  })
  it('heals a missed webhook without buying a duplicate', async () => {
    const sub = { status: 'active', items: { data: [item('base', 'base_month'), item('msg', 'messenger_month')] } }
    retrieve.mockResolvedValue(sub)
    await setMessengerAddon('sub', true)
    expect(update).not.toHaveBeenCalled()
    expect(sync).toHaveBeenCalledWith(sub)
  })
  it('removes Messenger only, preserving the base plan and other add-ons', async () => {
    retrieve.mockResolvedValue({ status: 'active', items: { data: [item('base', 'base_year'), item('msg', 'messenger_year'), item('voice', 'voice')] } })
    await setMessengerAddon('sub', false)
    expect(update.mock.calls[0][1].items).toEqual([{ id: 'msg', deleted: true }])
  })
  it('does not activate access after a failed Stripe write', async () => {
    retrieve.mockResolvedValue({ status: 'active', items: { data: [item('base', 'base_month')] } })
    update.mockRejectedValueOnce(new Error('Payment failed'))
    await expect(setMessengerAddon('sub', true)).rejects.toThrow('Payment failed')
    expect(sync).not.toHaveBeenCalled()
  })
  it('refuses inactive subscriptions', async () => {
    retrieve.mockResolvedValue({ status: 'canceled', items: { data: [item('base', 'base_month')] } })
    await expect(setMessengerAddon('sub', true)).rejects.toThrow('active paid plan')
    expect(update).not.toHaveBeenCalled()
  })
  it('moves Messenger to the matching interval when changing the base plan', async () => {
    retrieve.mockResolvedValue({ customer: 'cus', items: { data: [item('msg', 'messenger_month'), item('base', 'base_month')] } })
    await changeBasePlan('sub', 'base_year')
    expect(update.mock.calls[0][1].items).toEqual([{ id: 'base', price: 'base_year', quantity: 1 }, { id: 'msg', price: 'messenger_year', quantity: 1 }])
  })
})
