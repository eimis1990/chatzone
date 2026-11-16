// @vitest-environment node
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { PGlite } from '@electric-sql/pglite'
import { readFileSync } from 'node:fs'
import { randomUUID } from 'node:crypto'
let db: PGlite
const org = randomUUID(), bot = randomUUID()
beforeAll(async () => {
  db = new PGlite()
  await db.exec(`
    create role anon; create role authenticated; create role service_role;
    create table organizations(id uuid primary key, is_demo boolean default false,is_platform boolean default false,plan text default 'free', constraint organizations_plan_check check(plan in ('free','starter','growth','scale','enterprise')));
    create table bots(id uuid primary key,org_id uuid references organizations(id));
    create table conversations(id uuid primary key default gen_random_uuid(),bot_id uuid,visitor_id text,channel text default 'chat',source text default 'widget',metadata jsonb default '{}',started_at timestamptz default now(),last_message_at timestamptz default now(),handoff_status text default 'bot',handoff_requested_at timestamptz);
    create table messages(id uuid primary key default gen_random_uuid(),conversation_id uuid,from_human boolean default false);
    create table conversation_credits(org_id uuid,month date,conversations integer);
  `)
  await db.query('insert into organizations(id) values($1)',[org])
  await db.query('insert into bots(id,org_id) values($1,$2)',[bot,org])
  await db.exec(readFileSync('supabase/migrations/20261116090328_basic_plan_policy.sql','utf8'))
  await db.exec(readFileSync('supabase/migrations/20261116090332_conversation_usage_sessions.sql','utf8'))
  await db.exec(readFileSync('supabase/migrations/20261116090336_conversation_topup_purchases.sql','utf8'))
  await db.exec(readFileSync('supabase/migrations/20261116090340_handoff_policy_guards.sql','utf8'))
},30000)
afterAll(async()=>{await db?.close()})
async function reserve(visitor: string, limit: number|null=400) {
  const result=await db.query<{session_id:string|null;allowed:boolean;reason:string}>(
    'select * from reserve_conversation_session($1,$2,$3,$4,$5)',[org,bot,'web',visitor,limit])
  return result.rows[0]
}
async function finish(id:string|null,success=true) {
  await db.query('select finish_conversation_session($1,$2,$3)',[org,id,success])
}
describe('actual PostgreSQL usage and policy migrations',()=>{
  it('preserves legacy Free, accepts Basic, and removes grace permanently when upgrading',async()=>{
    expect((await db.query('select free_legacy from organizations where id=$1',[org])).rows[0]).toEqual({free_legacy:true})
    await db.query("update organizations set plan='basic' where id=$1",[org])
    await db.query("update organizations set plan='free' where id=$1",[org])
    expect((await db.query('select free_legacy from organizations where id=$1',[org])).rows[0]).toEqual({free_legacy:false})
  })
  it('reserves the final slot, rejects another visitor, and frees a failed request',async()=>{
    const first=await reserve('first',1)
    expect(first.reason).toBe('reserved')
    expect((await reserve('first',1)).reason).toBe('busy')
    expect((await reserve('second',1)).reason).toBe('limit')
    await finish(first.session_id,false)
    const second=await reserve('second',1)
    expect(second.allowed).toBe(true)
    await finish(second.session_id)
    expect((await reserve('second',1)).reason).toBe('existing')
    expect((await reserve('third',1)).reason).toBe('limit')
  })
  it('counts a new session after 24 hours or a month change',async()=>{
    await db.query("update conversation_usage_sessions set last_activity_at=now()-interval '24 hours' where visitor_key='second'")
    const second=await reserve('second',400)
    expect(second.reason).toBe('reserved');await finish(second.session_id)
    await db.query("update conversation_usage_sessions set month=(date_trunc('month',now())-interval '1 month')::date where visitor_key='second'")
    expect((await reserve('second',400)).reason).toBe('reserved')
  })
  it('honors credits and ignores expired reservations',async()=>{
    await db.exec('delete from conversation_usage_sessions')
    const pending=await reserve('pending',1)
    await db.query("update conversation_usage_sessions set lease_until=now()-interval '1 second' where id=$1",[pending.session_id])
    expect((await reserve('next',1)).allowed).toBe(true)
    await db.query("insert into conversation_credits values($1,date_trunc('month',now())::date,200)",[org])
    expect((await reserve('extra',1)).allowed).toBe(true)
  })
  it('retains consumed allowance when a transcript is deleted and skips v2/preview inserts',async()=>{
    await db.exec('delete from conversation_usage_sessions')
    const row=await db.query<{id:string}>("insert into conversations(bot_id,visitor_id) values($1,'legacy') returning id",[bot])
    await db.query('delete from conversations where id=$1',[row.rows[0].id])
    expect((await db.query<{count:number}>('select count(*)::int as count from conversation_usage_sessions')).rows[0].count).toBe(1)
    await db.query("insert into conversations(bot_id,visitor_id,metadata) values($1,'v2','{\"usage_v2\":true}')",[bot])
    await db.query("insert into conversations(bot_id,visitor_id,source) values($1,'preview','preview')",[bot])
    await db.query("insert into conversations(bot_id,visitor_id,channel) values($1,'voice','voice')",[bot])
    expect((await db.query<{count:number}>('select count(*)::int as count from conversation_usage_sessions')).rows[0].count).toBe(1)
  })
  it('enforces handoff for direct authenticated writes',async()=>{
    const conv=await db.query<{id:string}>("insert into conversations(bot_id,visitor_id,metadata) values($1,'handoff','{\"usage_v2\":true}') returning id",[bot])
    await db.exec('grant select on organizations,bots,conversations to authenticated; grant update on conversations to authenticated; grant insert on messages to authenticated; set role authenticated')
    await expect(db.query("update conversations set handoff_status='live' where id=$1",[conv.rows[0].id])).rejects.toThrow('requires Basic')
    await expect(db.query('insert into messages(conversation_id,from_human) values($1,true)',[conv.rows[0].id])).rejects.toThrow('requires Basic')
    await db.exec('reset role')
    await db.query("update organizations set plan='basic' where id=$1",[org])
    await db.exec('set role authenticated')
    await db.query("update conversations set handoff_status='live' where id=$1",[conv.rows[0].id])
    await db.exec('reset role')
  })
  it('rejects cross-org bot reservations and denies public execution',async()=>{
    await expect(db.query('select * from reserve_conversation_session($1,$2,$3,$4,$5)',[randomUUID(),bot,'web','visitor',400])).rejects.toThrow()
    await db.exec('set role authenticated')
    await expect(reserve('unauthorized')).rejects.toThrow(/permission denied/)
    await db.exec('reset role')
  })
})
