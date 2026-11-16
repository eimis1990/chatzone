import { expect, it, vi } from 'vitest'
import type Stripe from 'stripe'
const {sync}=vi.hoisted(()=>({sync:vi.fn()}))
vi.mock('@/lib/stripe/sync',()=>({syncSubscriptionToOrg:sync}))
vi.mock('@/lib/stripe/plans',()=>({planFromPriceId:(id:string)=>id==='basic'?{plan:'basic',interval:'month'}:null}))
import { reconcileSubscriptionEvent } from '@/lib/stripe/reconcile-event'
const sub=(id:string,status:string)=>({id,status,customer:'cus',items:{data:[{price:{id:'basic'}}]}})
it('a late cancellation event retains the newer active subscription',async()=>{
 const current=sub('new','active'),old=sub('old','canceled')
 const stripe={subscriptions:{retrieve:async()=>old,list:async()=>({data:[current,old]})}} as unknown as Stripe
 expect(await reconcileSubscriptionEvent(stripe,'old')).toEqual(current)
 expect(sync).toHaveBeenLastCalledWith(current)
})
it('an incomplete checkout does not grant Basic',async()=>{
 sync.mockClear();const incomplete=sub('new','incomplete')
 const stripe={subscriptions:{retrieve:async()=>incomplete,list:async()=>({data:[incomplete]})}} as unknown as Stripe
 expect(await reconcileSubscriptionEvent(stripe,'new')).toBeNull();expect(sync).not.toHaveBeenCalled()
})
