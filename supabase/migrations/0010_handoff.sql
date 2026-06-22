-- Human handoff + agent inbox (Phase 2).
-- A conversation moves bot -> requested -> live -> resolved. While `requested`
-- or `live`, the bot stops auto-replying; a human agent answers from the inbox.

-- --------------------------------------------------------------------------
-- Schema
-- --------------------------------------------------------------------------
alter table public.conversations
  add column if not exists handoff_status text not null default 'bot'
  check (handoff_status in ('bot', 'requested', 'live', 'resolved'));

alter table public.conversations
  add column if not exists assigned_to uuid references public.profiles(id) on delete set null;

alter table public.conversations
  add column if not exists handoff_requested_at timestamptz;

-- Assistant messages authored by a human agent (vs. the bot). `role` stays
-- 'assistant' so the transcript renders consistently.
alter table public.messages
  add column if not exists from_human boolean not null default false;

-- Find conversations awaiting / in handoff cheaply for the inbox.
create index if not exists conversations_handoff_idx
  on public.conversations(bot_id, handoff_status, handoff_requested_at desc);

-- --------------------------------------------------------------------------
-- RLS: agents (org members) can take over conversations + post replies.
-- Existing policies already grant members SELECT on their org's conversations
-- and messages; handoff adds the missing write paths.
-- --------------------------------------------------------------------------
create policy conversations_member_update on public.conversations
  for update using (public.bot_org_id(bot_id) in (select public.auth_org_ids()))
  with check (public.bot_org_id(bot_id) in (select public.auth_org_ids()));

create policy messages_member_insert on public.messages
  for insert with check (
    public.bot_org_id(
      (select c.bot_id from public.conversations c where c.id = conversation_id)
    ) in (select public.auth_org_ids())
  );

-- --------------------------------------------------------------------------
-- Realtime: stream conversation + message changes to the authenticated inbox.
-- RLS still applies on the socket (agents only receive their org's rows).
-- --------------------------------------------------------------------------
alter table public.conversations replica identity full;

do $$
begin
  if not exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    create publication supabase_realtime;
  end if;

  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'conversations'
  ) then
    alter publication supabase_realtime add table public.conversations;
  end if;

  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'messages'
  ) then
    alter publication supabase_realtime add table public.messages;
  end if;
end $$;
