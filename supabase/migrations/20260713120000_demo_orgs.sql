-- Demo organizations: first-class showcase bots in the owner portal (prepared
-- per prospect, presented from /present/[botId]) that must not pollute client
-- stats. Also stops counting the platform org as a "client" in owner_stats.
alter table public.organizations
  add column if not exists is_demo boolean not null default false;

create or replace view public.owner_stats
with (security_invoker = on) as
select
  (select count(*) from public.organizations o
     where not o.is_platform and not o.is_demo)                as total_orgs,
  (select count(*) from public.bots b
     join public.organizations o on o.id = b.org_id
     where b.status = 'active'
       and not o.is_platform and not o.is_demo)                as active_bots,
  (select count(*) from public.conversations c
     join public.bots b on b.id = c.bot_id
     join public.organizations o on o.id = b.org_id
     where not o.is_platform and not o.is_demo)                as total_conversations,
  (select count(*) from public.messages m
     join public.conversations c on c.id = m.conversation_id
     join public.bots b on b.id = c.bot_id
     join public.organizations o on o.id = b.org_id
     where not o.is_platform and not o.is_demo)                as total_messages,
  (select count(*) from public.leads l
     join public.bots b on b.id = l.bot_id
     join public.organizations o on o.id = b.org_id
     where not o.is_platform and not o.is_demo)                as total_leads;
