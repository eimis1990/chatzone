import { beforeEach, describe, expect, it, vi } from 'vitest'
import { defaultBotConfig } from '@/lib/validation/schemas'
const state=vi.hoisted(()=>({plan:'basic',order:vi.fn(),validateOrder:vi.fn()}))
const botId='7d9a1f9e-1111-4111-8111-444455556666'
vi.mock('@/lib/supabase/service',()=>({createServiceClient:()=>({from:(table:string)=>{const q={select:()=>q,eq:()=>q,single:async()=>({data:table==='organizations'?{plan:state.plan}:{id:botId,org_id:'org',status:'active',config:{...defaultBotConfig('Test'),commerce:{enabled:true,provider:'woocommerce',storeUrl:'https://store.example',restKey:'key',restSecret:'secret'}}}})};return q}})}))
vi.mock('@/lib/supabase/server',()=>({createServerClient:async()=>({auth:{getUser:async()=>({data:{user:{id:'user'}}})},from:()=>{const q={select:()=>q,eq:()=>q,single:async()=>({data:{id:botId,org_id:'org',plan:state.plan}})};return q}})}))
vi.mock('@/lib/auth/guards',()=>({getUserOrgIds:async()=>['org']}))
vi.mock('@/lib/commerce',()=>({getOrderStatus:state.order,summarizeOrder:()=>'',validateOrderAccess:state.validateOrder,validateStore:vi.fn()}))
import { POST as widgetOrder } from '@/app/api/widget/order/route'
import { POST as previewOrder } from '@/app/api/preview/order/route'
import { POST as validate } from '@/app/api/commerce/validate/route'
const req=(body:unknown)=>new Request('https://www.loqara.com/api/test',{method:'POST',body:JSON.stringify(body),headers:{'content-type':'application/json'}})
beforeEach(()=>{vi.clearAllMocks();state.plan='basic';state.order.mockResolvedValue({found:false})})
describe('order access is enforced before store reads',()=>{
 it.each(['free','basic'])('%s cannot use the public order endpoint',async(plan)=>{state.plan=plan;const r=await widgetOrder(req({publicKey:'key',orderId:'123',email:'a@example.com'}));expect(r.status).toBe(403);expect(state.order).not.toHaveBeenCalled()})
 it('Basic cannot bypass the gate in preview',async()=>{expect((await previewOrder(req({botId,orderId:'123',email:'a@example.com'}))).status).toBe(403);expect(state.order).not.toHaveBeenCalled()})
 it('Basic cannot validate order credentials to access order data',async()=>{expect((await validate(req({botId,mode:'orders',provider:'woocommerce',storeUrl:'https://store.example'}))).status).toBe(403);expect(state.validateOrder).not.toHaveBeenCalled()})
 it('Starter still reaches the existing identity-checked order lookup',async()=>{state.plan='starter';expect((await widgetOrder(req({publicKey:'key',orderId:'123',email:'a@example.com'}))).status).toBe(200);expect(state.order).toHaveBeenCalledOnce()})
})
