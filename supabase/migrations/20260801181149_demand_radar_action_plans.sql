-- Persistent Demand Radar review plans and bot-scoped shopper-language synonyms.
-- Store-provider write-back remains out of scope: these tables only hold the
-- approved Loqara-side plan and query rewrite rules.

create table public.demand_action_plans (
  id                 uuid primary key default gen_random_uuid(),
  bot_id             uuid not null references public.bots(id) on delete cascade,
  opportunity_key    text not null check (char_length(opportunity_key) between 1 and 160),
  opportunity_title  text not null check (char_length(opportunity_title) between 1 and 180),
  issue_type         text not null check (issue_type in ('product_gap', 'knowledge_gap', 'store_limitation')),
  evidence           jsonb not null default '[]'::jsonb check (jsonb_typeof(evidence) = 'array'),
  selected_actions   text[] not null check (
    cardinality(selected_actions) between 1 and 6
    and selected_actions <@ array[
      'fix_product_attributes',
      'add_faq',
      'improve_product_description',
      'create_collection',
      'add_missing_synonym',
      'notify_merchandising_team'
    ]::text[]
  ),
  action_payloads    jsonb not null default '{}'::jsonb check (jsonb_typeof(action_payloads) = 'object'),
  action_results     jsonb not null default '{}'::jsonb check (jsonb_typeof(action_results) = 'object'),
  status             text not null default 'saved' check (status in ('saved', 'processing', 'applied', 'partial')),
  created_by         uuid references public.profiles(id) on delete set null,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);

create index demand_action_plans_bot_created_idx
  on public.demand_action_plans(bot_id, created_at desc);

create trigger demand_action_plans_updated_at
  before update on public.demand_action_plans
  for each row execute function public.set_updated_at();

create table public.product_search_synonyms (
  id                 uuid primary key default gen_random_uuid(),
  bot_id             uuid not null references public.bots(id) on delete cascade,
  phrase             text not null check (char_length(trim(phrase)) between 2 and 120),
  replacement        text not null check (char_length(trim(replacement)) between 2 and 120),
  phrase_normalized  text generated always as (lower(trim(phrase))) stored,
  action_plan_id     uuid references public.demand_action_plans(id) on delete set null,
  created_by         uuid references public.profiles(id) on delete set null,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now(),
  unique (bot_id, phrase_normalized),
  check (lower(trim(phrase)) <> lower(trim(replacement)))
);

create index product_search_synonyms_bot_idx
  on public.product_search_synonyms(bot_id);

create trigger product_search_synonyms_updated_at
  before update on public.product_search_synonyms
  for each row execute function public.set_updated_at();

alter table public.demand_action_plans enable row level security;
alter table public.product_search_synonyms enable row level security;

create policy demand_action_plans_owner_all on public.demand_action_plans
  for all to authenticated
  using (public.is_owner())
  with check (public.is_owner());

create policy demand_action_plans_member_rw on public.demand_action_plans
  for all to authenticated
  using (public.bot_org_id(bot_id) in (select public.auth_org_ids()))
  with check (public.bot_org_id(bot_id) in (select public.auth_org_ids()));

create policy product_search_synonyms_owner_all on public.product_search_synonyms
  for all to authenticated
  using (public.is_owner())
  with check (public.is_owner());

create policy product_search_synonyms_member_rw on public.product_search_synonyms
  for all to authenticated
  using (public.bot_org_id(bot_id) in (select public.auth_org_ids()))
  with check (public.bot_org_id(bot_id) in (select public.auth_org_ids()));

revoke all on table public.demand_action_plans from anon;
revoke all on table public.product_search_synonyms from anon;
grant select, insert, update, delete on table public.demand_action_plans to authenticated;
grant select, insert, update, delete on table public.product_search_synonyms to authenticated;
grant select, insert, update, delete on table public.demand_action_plans to service_role;
grant select, insert, update, delete on table public.product_search_synonyms to service_role;
