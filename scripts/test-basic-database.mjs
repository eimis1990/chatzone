// Isolated hosted-Postgres rehearsal. Never selects or mutates customer bots.
import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'
import { randomUUID } from 'node:crypto'
import { writeFileSync } from 'node:fs'
import assert from 'node:assert/strict'
config({path:'.env.local',quiet:true})
const db=createClient(process.env.NEXT_PUBLIC_SUPABASE_URL,process.env.SUPABASE_SERVICE_ROLE_KEY,{auth:{persistSession:false}})
const orgId=randomUUID(),botId=randomUUID(),name=`Basic rollout database test ${orgId}`
const month=new Date().toISOString().slice(0,7)+'-01',checks=[]
const check=(message)=>{checks.push(message);console.log(message)}
async function query(result){const {data,error}=await result;if(error)throw new Error(error.message);return data}
try{
 await query(db.from('organizations').insert({id:orgId,name,plan:'free'}))
 await query(db.from('bots').insert({id:botId,org_id:orgId,name:'Isolated quota fixture',config:{},status:'paused'}))
 await query(db.from('conversation_usage_sessions').insert(Array.from({length:399},(_,i)=>({org_id:orgId,bot_id:botId,channel:'web',visitor_key:`baseline-${i}`,month,committed_at:new Date().toISOString()}))))
 const attempts=await Promise.all(Array.from({length:12},(_,i)=>query(db.rpc('reserve_conversation_session',{p_org:orgId,p_bot:botId,p_channel:i%2?'messenger':'web',p_visitor:`race-${i}`,p_limit:400}))))
 assert.equal(attempts.flat().filter(r=>r.allowed).length,1)
 check('12 concurrent web/Messenger reservations at 399/400: exactly one admitted')
 const reservation=attempts.flat().find(r=>r.allowed)
 await query(db.rpc('finish_conversation_session',{p_org:orgId,p_session:reservation.session_id,p_success:false}))
 const [retry]=await query(db.rpc('reserve_conversation_session',{p_org:orgId,p_bot:botId,p_channel:'web',p_visitor:'retry',p_limit:400}))
 assert.equal(retry.allowed,true)
 await query(db.rpc('finish_conversation_session',{p_org:orgId,p_session:retry.session_id,p_success:true}))
 const [same]=await query(db.rpc('reserve_conversation_session',{p_org:orgId,p_bot:botId,p_channel:'web',p_visitor:'retry',p_limit:400}))
 assert.equal(same.reason,'existing');assert.equal(same.session_id,retry.session_id)
 check('Failure releases capacity; successful retry and same-session reuse consume one unit')
 const anon=createClient(process.env.NEXT_PUBLIC_SUPABASE_URL,process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,{auth:{persistSession:false}})
 assert.ok((await anon.rpc('reserve_conversation_session',{p_org:orgId,p_bot:botId,p_channel:'web',p_visitor:'forged',p_limit:999999})).error)
 check('Anonymous client cannot reserve arbitrary allowance')
 const [{free_legacy}]=await query(db.from('organizations').select('free_legacy').eq('id',orgId));assert.equal(free_legacy,false)
 check('New Free account does not inherit the legacy notice cohort')
}catch(error){console.error(error.message);process.exitCode=1}
finally{
 const {data:owned}=await db.from('organizations').select('name').eq('id',orgId).maybeSingle()
 if(owned?.name===name) await query(db.from('organizations').delete().eq('id',orgId))
 writeFileSync('/tmp/loqara-basic-database-test-report.json',JSON.stringify({checks,passed:!process.exitCode,cleanedUp:true},null,2))
}
