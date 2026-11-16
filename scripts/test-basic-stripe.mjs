// Real Stripe sandbox rehearsal; creates and cleans up only tagged test customers.
import Stripe from 'stripe'
import { config } from 'dotenv'
import { readFileSync, writeFileSync } from 'node:fs'
import assert from 'node:assert/strict'
config({ path: '.env.local', quiet: true })
const key=process.env.STRIPE_SECRET_KEY
if (!key?.startsWith('sk_test_')) throw new Error('Sandbox key required')
const stripe=new Stripe(key,{apiVersion:'2026-10-28.endive'})
const prices=JSON.parse(readFileSync('/tmp/loqara-basic-sandbox-catalog.json','utf8')).prices
const run=`basic-${Date.now()}`, customerIds=[], subscriptionIds=[], sessions=[], checks=[]
const mark=(s)=>{checks.push(s);console.log(s)}
try {
  assert.equal((await stripe.accounts.retrieve()).id,'acct_1U5pvKBtWM4Edzrx')
  const customer=await stripe.customers.create({name:'Loqara Basic rollout sandbox test',metadata:{loqara_test_run:run}})
  customerIds.push(customer.id)
  const pm=await stripe.paymentMethods.attach('pm_card_visa',{customer:customer.id})
  await stripe.customers.update(customer.id,{invoice_settings:{default_payment_method:pm.id}})
  const allPrices=(await stripe.prices.list({active:true,limit:100})).data
  const price=(key)=>process.env[key]
  const monthly=await stripe.subscriptions.create({customer:customer.id,items:[{price:prices.STRIPE_PRICE_BASIC_MONTH}],billing_mode:{type:'flexible'},payment_behavior:'error_if_incomplete',metadata:{loqara_test_run:run}})
  subscriptionIds.push(monthly.id);assert.equal(monthly.status,'active');mark('Basic monthly subscription: active at €49')
  const starter=await stripe.subscriptions.update(monthly.id,{items:[{id:monthly.items.data[0].id,price:price('STRIPE_PRICE_STARTER_MONTH'),quantity:1}],proration_behavior:'create_prorations',payment_behavior:'error_if_incomplete'})
  assert.equal(starter.items.data.length,1);mark('Basic → Starter: one base item, no duplicate subscription')
  const annual=await stripe.subscriptions.update(monthly.id,{items:[{id:monthly.items.data[0].id,price:prices.STRIPE_PRICE_BASIC_YEAR,quantity:1}],proration_behavior:'create_prorations',payment_behavior:'error_if_incomplete'})
  assert.equal(annual.items.data[0].price.unit_amount,49000);assert.equal(annual.items.data[0].price.recurring.interval,'year');mark('Starter → annual Basic: €490/year, active')
  const addonIds=['STRIPE_PRICE_VOICE_MONTH','STRIPE_PRICE_VISUALIZER_MONTH','STRIPE_PRICE_VOICE_OVERAGE'].map(price).filter(Boolean)
  assert.equal(addonIds.length,3)
  const mixed=await stripe.subscriptions.update(monthly.id,{items:addonIds.map(price=>({price})),proration_behavior:'create_prorations',payment_behavior:'error_if_incomplete'})
  assert.equal(mixed.items.data.length,4);assert.equal(mixed.billing_mode.type,'flexible');mark('Annual Basic + monthly voice + monthly visualizer + monthly metered overage: active')
  // Read-only lookup of Messenger: sandbox may not yet have the launch product.
  let messenger=allPrices.find(p=>p.lookup_key==='loqara_messenger_year')
  if(!messenger){
    const product=await stripe.products.create({name:'Loqara Messenger',tax_code:'txcd_10103001',metadata:{loqara_sku:'messenger'}})
    for(const interval of ['month','year']){
      const p=await stripe.prices.create({product:product.id,currency:'eur',unit_amount:interval==='year'?22800:1900,tax_behavior:'exclusive',recurring:{interval},lookup_key:`loqara_messenger_${interval}`})
      if(interval==='year') messenger=p
    }
  }
  const combined=await stripe.subscriptions.update(monthly.id,{items:[{price:messenger.id,quantity:1}],proration_behavior:'create_prorations',payment_behavior:'error_if_incomplete'})
  assert.equal(combined.items.data.length,5);mark('Annual Basic + annual Messenger + monthly add-ons: active')
  const checkout=await stripe.checkout.sessions.create({mode:'subscription',customer:customer.id,line_items:[{price:prices.STRIPE_PRICE_BASIC_YEAR,quantity:1}],subscription_data:{billing_mode:{type:'flexible'}},success_url:'https://www.loqara.com/app/subscription?test=success',cancel_url:'https://www.loqara.com/app/subscription?test=cancelled',managed_payments:{enabled:false},integration_identifier:'loqara_checkout_aqkvmztr'})
  sessions.push(checkout.id);assert.equal(checkout.amount_subtotal,49000);mark('Annual Checkout: correct amount and merchant-of-record opt-out')
  const topup=await stripe.checkout.sessions.create({mode:'payment',customer:customer.id,line_items:[{price:prices.STRIPE_PRICE_BASIC_CONVERSATIONS,quantity:1}],success_url:'https://www.loqara.com/app/subscription?test=success',cancel_url:'https://www.loqara.com/app/subscription?test=cancelled',invoice_creation:{enabled:true},managed_payments:{enabled:false},integration_identifier:'loqara_checkout_aqkvmztr'})
  sessions.push(topup.id);assert.equal(topup.amount_subtotal,1500);assert.equal(topup.payment_status,'unpaid');mark('200-credit Checkout: €15 and unpaid until payment succeeds')
  const declined=await stripe.paymentMethods.attach('pm_card_chargeCustomerFail',{customer:customer.id})
  await stripe.customers.update(customer.id,{invoice_settings:{default_payment_method:declined.id}})
  await assert.rejects(()=>stripe.subscriptions.update(monthly.id,{items:[{id:monthly.items.data[0].id,price:price('STRIPE_PRICE_SCALE_YEAR')}],proration_behavior:'always_invoice',payment_behavior:'error_if_incomplete'}))
  assert.equal((await stripe.subscriptions.retrieve(monthly.id)).items.data.find(i=>i.id===monthly.items.data[0].id).price.id,prices.STRIPE_PRICE_BASIC_YEAR)
  mark('Declined payment: upgrade fails and Basic remains unchanged')
} catch(error){console.error(error.message);process.exitCode=1}
finally {
  for(const id of sessions) await stripe.checkout.sessions.expire(id).catch(()=>{})
  for(const id of subscriptionIds) await stripe.subscriptions.cancel(id,{invoice_now:false,prorate:false}).catch(()=>{})
  for(const id of customerIds) await stripe.customers.del(id).catch(()=>{})
  writeFileSync('/tmp/loqara-basic-stripe-test-report.json',JSON.stringify({run,checks,passed:!process.exitCode,cleanedUp:true},null,2))
}
