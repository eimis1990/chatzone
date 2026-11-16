-- Usage is independent of chat history, so transcript deletion never restores quota.
create table public.conversation_usage_sessions (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  bot_id uuid not null,
  channel text not null,
  visitor_key text not null,
  month date not null,
  started_at timestamptz not null default now(),
  last_activity_at timestamptz not null default now(),
  committed_at timestamptz,
  lease_until timestamptz,
  legacy_conversation_id uuid unique
);
create index conversation_usage_sessions_pool_idx on public.conversation_usage_sessions(org_id, month);
create index conversation_usage_sessions_contact_idx on public.conversation_usage_sessions
  (bot_id, channel, visitor_key, last_activity_at desc);
alter table public.conversation_usage_sessions enable row level security;
revoke all on public.conversation_usage_sessions from public, anon, authenticated;
grant select, insert, update, delete on public.conversation_usage_sessions to service_role;

-- Historical current-month rows establish the existing usage baseline. No
-- retroactive recounting: each old conversation remains one consumed unit.
insert into public.conversation_usage_sessions
  (org_id,bot_id,channel,visitor_key,month,started_at,last_activity_at,committed_at,legacy_conversation_id)
select b.org_id,c.bot_id,case when c.channel='chat' then 'web' else c.channel end,c.visitor_id,
  date_trunc('month', c.started_at at time zone 'UTC')::date,
  c.started_at,coalesce(c.last_message_at,c.started_at),c.started_at,c.id
from public.conversations c join public.bots b on b.id=c.bot_id
where c.source <> 'preview' and c.started_at >= date_trunc('month', now() at time zone 'UTC') at time zone 'UTC';

-- This RPC is service-only and serializes reservations across every bot/channel
-- of an org. Caller supplies the server-resolved effective allowance.
create function public.reserve_conversation_session(
  p_org uuid, p_bot uuid, p_channel text, p_visitor text, p_limit integer
) returns table(session_id uuid, allowed boolean, reason text)
language plpgsql security invoker set search_path = '' as $$
declare
  v_now timestamptz := clock_timestamp();
  v_month date;
  v_session public.conversation_usage_sessions%rowtype;
  v_used bigint;
  v_extra bigint;
begin
  perform id from public.organizations where id=p_org for update;
  if not found or not exists(select 1 from public.bots where id=p_bot and org_id=p_org) then
    raise exception 'Organization or bot not found';
  end if;
  v_now := clock_timestamp();
  v_month := date_trunc('month', v_now at time zone 'UTC')::date;
  if p_channel not in ('web','messenger','instagram','voice') or length(p_visitor) not between 1 and 256
    or (p_limit is not null and p_limit < 0) then raise exception 'Invalid usage reservation'; end if;
  select * into v_session from public.conversation_usage_sessions
    where org_id=p_org and bot_id=p_bot and channel=p_channel and visitor_key=p_visitor
      and month=v_month and last_activity_at > v_now - interval '24 hours'
      and (committed_at is not null or lease_until > v_now)
    order by last_activity_at desc limit 1;
  if found then
    if v_session.committed_at is null then
      return query select null::uuid,false,'busy'::text; return;
    end if;
    update public.conversation_usage_sessions set last_activity_at=v_now where id=v_session.id;
    return query select v_session.id,true,'existing'::text; return;
  end if;
  select count(*) into v_used from public.conversation_usage_sessions
    where org_id=p_org and month=v_month and (committed_at is not null or lease_until>v_now);
  select coalesce(sum(conversations),0) into v_extra from public.conversation_credits where org_id=p_org and month=v_month;
  if p_limit is not null and v_used >= p_limit+v_extra then
    return query select null::uuid,false,'limit'::text; return;
  end if;
  insert into public.conversation_usage_sessions(org_id,bot_id,channel,visitor_key,month,started_at,last_activity_at,lease_until)
    values(p_org,p_bot,p_channel,p_visitor,v_month,v_now,v_now,v_now+interval '10 minutes') returning * into v_session;
  return query select v_session.id,true,'reserved'::text;
end;
$$;
revoke all on function public.reserve_conversation_session(uuid,uuid,text,text,integer) from public,anon,authenticated;
grant execute on function public.reserve_conversation_session(uuid,uuid,text,text,integer) to service_role;

create function public.finish_conversation_session(p_org uuid,p_session uuid,p_success boolean)
returns void language plpgsql security invoker set search_path = '' as $$
begin
  perform id from public.organizations where id=p_org for update;
  if p_success then
    update public.conversation_usage_sessions
      set committed_at=coalesce(committed_at,clock_timestamp()),lease_until=null
      where id=p_session and org_id=p_org and (committed_at is not null or lease_until>clock_timestamp());
    if not found then raise exception 'Usage reservation expired'; end if;
  else
    delete from public.conversation_usage_sessions where id=p_session and org_id=p_org and committed_at is null;
  end if;
end;
$$;
revoke all on function public.finish_conversation_session(uuid,uuid,boolean) from public,anon,authenticated;
grant execute on function public.finish_conversation_session(uuid,uuid,boolean) to service_role;

-- During a rolling deployment, old servers still insert unmetered conversation
-- rows. Mirror them so the cutover does not reset or miss current usage. New
-- session-aware routes mark metadata.usage_v2 and reserve explicitly instead.
create function public.capture_legacy_conversation_usage() returns trigger
language plpgsql security invoker set search_path = '' as $$
begin
  if new.source <> 'preview' and new.channel <> 'voice' and coalesce(new.metadata->>'usage_v2','false') <> 'true' then
    insert into public.conversation_usage_sessions
      (org_id,bot_id,channel,visitor_key,month,started_at,last_activity_at,committed_at,legacy_conversation_id)
    select b.org_id,new.bot_id,case when new.channel='chat' then 'web' else new.channel end,new.visitor_id,
      date_trunc('month', new.started_at at time zone 'UTC')::date,
      new.started_at,coalesce(new.last_message_at,new.started_at),new.started_at,new.id
    from public.bots b where b.id=new.bot_id on conflict(legacy_conversation_id) do nothing;
  end if;
  return new;
end;
$$;
revoke all on function public.capture_legacy_conversation_usage() from public,anon,authenticated;
create trigger conversations_capture_legacy_usage after insert on public.conversations
  for each row execute function public.capture_legacy_conversation_usage();
