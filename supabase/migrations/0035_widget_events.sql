-- ---------------------------------------------------------------------------
-- Widget interaction events (proof-of-value analytics)
-- ---------------------------------------------------------------------------
-- Client-side widget interactions that base tables can't capture: product-card
-- clicks, answer-link clicks, suggested-question clicks, widget opens. Written
-- only by the public /api/events endpoint (service role, scoped by public_key
-- + allowed-domains origin check); read by org members in the analytics views.
-- `payload` snapshots what was clicked (product title/price/url) so metrics
-- survive later catalog changes.
create table public.widget_events (
  id              uuid primary key default gen_random_uuid(),
  bot_id          uuid not null references public.bots(id) on delete cascade,
  conversation_id uuid references public.conversations(id) on delete set null,
  message_id      uuid references public.messages(id) on delete set null,
  type            text not null check (
    type in ('product_click', 'link_click', 'suggested_question_click', 'widget_open')
  ),
  payload         jsonb not null default '{}'::jsonb,
  created_at      timestamptz not null default now()
);

create index widget_events_bot_created_idx on public.widget_events(bot_id, created_at desc);
create index widget_events_bot_type_idx on public.widget_events(bot_id, type, created_at desc);

alter table public.widget_events enable row level security;

create policy widget_events_owner_all on public.widget_events
  for all using (public.is_owner()) with check (public.is_owner());
create policy widget_events_member_select on public.widget_events
  for select using (public.bot_org_id(bot_id) in (select public.auth_org_ids()));
