import { beforeEach, expect, it, vi } from 'vitest'
import type { NextRequest } from 'next/server'
const h = vi.hoisted(() => ({ construct: vi.fn(), fulfill: vi.fn(), reconcile: vi.fn(), upsert: vi.fn() }))
vi.mock('@/lib/stripe/client', () => ({ getStripe: () => ({ webhooks: { constructEventAsync: h.construct } }) }))
vi.mock('@/lib/env', () => ({ getEnv: () => ({ STRIPE_WEBHOOK_SECRET: 'test-secret' }) }))
vi.mock('@/lib/stripe/reconcile-event', () => ({ reconcileSubscriptionEvent: h.reconcile }))
vi.mock('@/lib/stripe/topups', () => ({ fulfillTopup: h.fulfill, expireStaleTopups: vi.fn() }))
vi.mock('@/lib/stripe/plans', () => ({ getExtraConversationsPriceId: vi.fn(), planFromPriceId: vi.fn() }))
vi.mock('@/lib/supabase/service', () => ({ createServiceClient: () => ({ from: () => ({ upsert: h.upsert }) }) }))
import { POST } from '@/app/api/stripe/webhook/route'
const request = () => new Request('https://example.test/api/stripe/webhook', {
  method: 'POST', body: '{}', headers: { 'stripe-signature': 'signature' },
}) as NextRequest
beforeEach(() => { vi.clearAllMocks(); h.fulfill.mockResolvedValue(undefined); h.upsert.mockResolvedValue({error:null}) })
it.each(['checkout.session.completed', 'checkout.session.async_payment_succeeded'])('routes %s through payment-aware fulfillment', async (type) => {
  const session = { id:'cs', metadata:{topup_purchase_id:'purchase'}, payment_status:'paid' }
  h.construct.mockResolvedValue({type,created:123,data:{object:session}})
  expect((await POST(request())).status).toBe(200)
  expect(h.fulfill).toHaveBeenCalledWith(expect.anything(), expect.anything(), session, 123)
})
it('returns 500 so a failed credit write is retried', async () => {
  h.construct.mockResolvedValue({type:'checkout.session.async_payment_succeeded',created:123,data:{object:{metadata:{topup_purchase_id:'purchase'}}}})
  h.fulfill.mockRejectedValue(new Error('database unavailable'))
  expect((await POST(request())).status).toBe(500)
})
it('an unpaid setup checkout never creates a paid order', async () => {
  h.construct.mockResolvedValue({type:'checkout.session.completed',data:{object:{metadata:{setup_package:'essential'},payment_status:'unpaid'}}})
  expect((await POST(request())).status).toBe(200); expect(h.upsert).not.toHaveBeenCalled()
})
it('a paid setup order remains idempotent and database failures are retryable', async () => {
  h.construct.mockResolvedValue({type:'checkout.session.async_payment_succeeded',data:{object:{id:'cs_setup',metadata:{setup_package:'essential',org_id:'org'},payment_status:'paid',amount_total:74900,currency:'eur'}}})
  expect((await POST(request())).status).toBe(200)
  expect(h.upsert).toHaveBeenCalledWith(expect.objectContaining({stripe_session_id:'cs_setup',status:'paid',amount_cents:74900}),{onConflict:'stripe_session_id'})
  h.upsert.mockResolvedValue({error:{message:'offline'}})
  expect((await POST(request())).status).toBe(500)
})
it('invalid signatures cannot reach payment fulfillment', async () => {
  h.construct.mockRejectedValue(new Error('signature mismatch'))
  expect((await POST(request())).status).toBe(400); expect(h.fulfill).not.toHaveBeenCalled()
})
