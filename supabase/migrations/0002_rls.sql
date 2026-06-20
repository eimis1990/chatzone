-- ChatbotZone Row-Level Security
-- Strategy: the platform owner (profiles.role = 'owner') can read/write everything;
-- a client can only touch rows belonging to an organization they are a member of.
-- Public widget traffic never uses these policies — it goes through the service
-- role, which bypasses RLS and scopes every query to a single bot_id itself.

-- ---------------------------------------------------------------------------
-- Helper functions (security definer to avoid recursive RLS evaluation)
-- ---------------------------------------------------------------------------
create or replace function public.is_owner()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role = 'owner');
$$;

create or replace function public.auth_org_ids()
returns setof uuid language sql stable security definer set search_path = public as $$
  select org_id from public.organization_members where user_id = auth.uid();
$$;

-- Org id for a given bot (used by chunk/conversation/lead policies)
create or replace function public.bot_org_id(p_bot_id uuid)
returns uuid language sql stable security definer set search_path = public as $$
  select org_id from public.bots where id = p_bot_id;
$$;

-- ---------------------------------------------------------------------------
-- Enable RLS on every table
-- ---------------------------------------------------------------------------
alter table public.profiles              enable row level security;
alter table public.organizations         enable row level security;
alter table public.organization_members  enable row level security;
alter table public.invites               enable row level security;
alter table public.bots                  enable row level security;
alter table public.knowledge_sources     enable row level security;
alter table public.document_chunks       enable row level security;
alter table public.conversations         enable row level security;
alter table public.messages              enable row level security;
alter table public.leads                 enable row level security;

-- ---------------------------------------------------------------------------
-- profiles
-- ---------------------------------------------------------------------------
create policy profiles_select_self_or_owner on public.profiles
  for select using (id = auth.uid() or public.is_owner());
create policy profiles_update_self on public.profiles
  for update using (id = auth.uid()) with check (id = auth.uid());
create policy profiles_owner_all on public.profiles
  for all using (public.is_owner()) with check (public.is_owner());

-- ---------------------------------------------------------------------------
-- organizations
-- ---------------------------------------------------------------------------
create policy organizations_owner_all on public.organizations
  for all using (public.is_owner()) with check (public.is_owner());
create policy organizations_member_select on public.organizations
  for select using (id in (select public.auth_org_ids()));

-- ---------------------------------------------------------------------------
-- organization_members
-- ---------------------------------------------------------------------------
create policy org_members_owner_all on public.organization_members
  for all using (public.is_owner()) with check (public.is_owner());
create policy org_members_self_select on public.organization_members
  for select using (user_id = auth.uid() or org_id in (select public.auth_org_ids()));

-- ---------------------------------------------------------------------------
-- invites (owner-managed; acceptance happens via service role)
-- ---------------------------------------------------------------------------
create policy invites_owner_all on public.invites
  for all using (public.is_owner()) with check (public.is_owner());

-- ---------------------------------------------------------------------------
-- bots
-- ---------------------------------------------------------------------------
create policy bots_owner_all on public.bots
  for all using (public.is_owner()) with check (public.is_owner());
create policy bots_member_select on public.bots
  for select using (org_id in (select public.auth_org_ids()));
create policy bots_member_insert on public.bots
  for insert with check (org_id in (select public.auth_org_ids()));
create policy bots_member_update on public.bots
  for update using (org_id in (select public.auth_org_ids()))
  with check (org_id in (select public.auth_org_ids()));
create policy bots_member_delete on public.bots
  for delete using (org_id in (select public.auth_org_ids()));

-- ---------------------------------------------------------------------------
-- knowledge_sources (scoped via the bot's org)
-- ---------------------------------------------------------------------------
create policy ks_owner_all on public.knowledge_sources
  for all using (public.is_owner()) with check (public.is_owner());
create policy ks_member_rw on public.knowledge_sources
  for all using (public.bot_org_id(bot_id) in (select public.auth_org_ids()))
  with check (public.bot_org_id(bot_id) in (select public.auth_org_ids()));

-- ---------------------------------------------------------------------------
-- document_chunks
-- ---------------------------------------------------------------------------
create policy chunks_owner_all on public.document_chunks
  for all using (public.is_owner()) with check (public.is_owner());
create policy chunks_member_rw on public.document_chunks
  for all using (public.bot_org_id(bot_id) in (select public.auth_org_ids()))
  with check (public.bot_org_id(bot_id) in (select public.auth_org_ids()));

-- ---------------------------------------------------------------------------
-- conversations
-- ---------------------------------------------------------------------------
create policy conversations_owner_all on public.conversations
  for all using (public.is_owner()) with check (public.is_owner());
create policy conversations_member_select on public.conversations
  for select using (public.bot_org_id(bot_id) in (select public.auth_org_ids()));

-- ---------------------------------------------------------------------------
-- messages (scoped via conversation -> bot -> org)
-- ---------------------------------------------------------------------------
create policy messages_owner_all on public.messages
  for all using (public.is_owner()) with check (public.is_owner());
create policy messages_member_select on public.messages
  for select using (
    public.bot_org_id(
      (select c.bot_id from public.conversations c where c.id = conversation_id)
    ) in (select public.auth_org_ids())
  );

-- ---------------------------------------------------------------------------
-- leads
-- ---------------------------------------------------------------------------
create policy leads_owner_all on public.leads
  for all using (public.is_owner()) with check (public.is_owner());
create policy leads_member_select on public.leads
  for select using (public.bot_org_id(bot_id) in (select public.auth_org_ids()));
