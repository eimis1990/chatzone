import { beforeEach, describe, expect, it, vi } from 'vitest'
import type Stripe from 'stripe'
import type { SupabaseClient } from '@supabase/supabase-js'
vi.mock('@/lib/stripe/plans', () => ({ getExtraConversationsPriceId: (p: string) => p==='basic'?'price_200':'price_1000', planFromPriceId: () => null }))
import { fulfillTopup } from '@/lib/stripe/topups'
const insert=vi.fn(), update=vi.fn(), retrieve=vi.fn(), lineItems=vi.fn()
const purchase={id:'purchase',org_id:'org',stripe_customer_id:'cus',stripe_session_id:'cs',price_id:'price_200',conversations:200}
const session={id:'cs',mode:'payment',payment_status:'paid',customer:'cus',metadata:{topup_purchase_id:'purchase'},payment_intent:'pi'}
let orgError: unknown=null
const db={from:(table:string)=>{
  const chain={eq:()=>chain,is:()=>chain,single:async()=>({data:table==='organizations'?{id:'org'}:table==='conversation_credits'?{month:'2026-11-01'}:purchase,error:orgError}),then:(resolve: (r:unknown)=>unknown)=>Promise.resolve({error:null}).then(resolve)}
  return {select:()=>chain,insert,update:(data:unknown)=>{update(data);return chain}}
}} as unknown as SupabaseClient
const stripe={checkout:{sessions:{retrieve,listLineItems:lineItems}}} as unknown as Stripe
beforeEach(()=>{vi.clearAllMocks();orgError=null;retrieve.mockResolvedValue(session);insert.mockResolvedValue({error:null});lineItems.mockResolvedValue({has_more:false,data:[{price:{id:'price_200',currency:'eur',unit_amount:1500,recurring:null},quantity:1}]})})
describe('paid conversation credit fulfillment',()=>{
  it('Basic receives 200 from its SKU, ignoring forged metadata quantities',async()=>{
    await fulfillTopup(stripe,db,{...session,metadata:{...session.metadata,extra_conversations:'999999'}} as unknown as Stripe.Checkout.Session,Date.parse('2026-11-30T23:59:59Z')/1000)
    expect(insert).toHaveBeenCalledWith({org_id:'org',month:'2026-11-01',conversations:200,stripe_session_id:'cs'})
  })
  it('an unpaid completion never credits, even if payment succeeds later',async()=>{
    await fulfillTopup(stripe,db,{...session,payment_status:'unpaid'} as unknown as Stripe.Checkout.Session,1)
    expect(retrieve).not.toHaveBeenCalled();expect(insert).not.toHaveBeenCalled()
  })
  it('delayed payment uses the UTC month it succeeded',async()=>{
    await fulfillTopup(stripe,db,session as unknown as Stripe.Checkout.Session,Date.parse('2026-12-01T00:00:00Z')/1000)
    expect(insert.mock.calls[0][0].month).toBe('2026-12-01')
  })
  it('replays tolerate the unique credit while preserving its recorded month',async()=>{
    insert.mockResolvedValue({error:{code:'23505'}})
    await fulfillTopup(stripe,db,session as unknown as Stripe.Checkout.Session,Date.parse('2026-12-01T00:00:00Z')/1000)
    expect(update.mock.calls[0][0].credit_month).toBe('2026-11-01')
  })
  it.each([2,0])('rejects an unexpected quantity %i',async(quantity)=>{
    lineItems.mockResolvedValue({data:[{price:{id:'price_200',currency:'eur',unit_amount:1500},quantity}]})
    await expect(fulfillTopup(stripe,db,session as unknown as Stripe.Checkout.Session,1)).rejects.toThrow('SKU')
    expect(insert).not.toHaveBeenCalled()
  })
  it('rejects a mismatched recorded offer',async()=>{
    lineItems.mockResolvedValue({data:[{price:{id:'price_1000',currency:'eur',unit_amount:1500},quantity:1}]})
    await expect(fulfillTopup(stripe,db,session as unknown as Stripe.Checkout.Session,1)).rejects.toThrow('offer')
  })
  it('returns a retryable failure when the credit database is unavailable',async()=>{
    insert.mockResolvedValue({error:{code:'08006',message:'offline'}})
    await expect(fulfillTopup(stripe,db,session as unknown as Stripe.Checkout.Session,1)).rejects.toThrow('credit')
    expect(update).not.toHaveBeenCalled()
  })
  it('fails closed on an organization read failure',async()=>{
    orgError={message:'offline'}
    await expect(fulfillTopup(stripe,db,session as unknown as Stripe.Checkout.Session,1)).rejects.toThrow('organization')
    expect(insert).not.toHaveBeenCalled()
  })
})
