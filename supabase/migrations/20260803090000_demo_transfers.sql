-- Demo → client bot transfers. The bot ROW simply moves org (every child
-- table — product_embeddings, knowledge sources/chunks, sync status, synonyms,
-- conversations — hangs off bot_id, so the whole prepared demo follows the
-- update and the client org gains access via RLS immediately). This table is
-- the tombstone the Demos screen renders afterwards, so the owner still sees
-- the transferred demo and can jump to it in the client's org.

create table public.demo_transfers (
  id             uuid primary key default gen_random_uuid(),
  bot_id         uuid not null references public.bots(id) on delete cascade,
  name           text not null,
  to_org_id      uuid not null references public.organizations(id) on delete cascade,
  transferred_at timestamptz not null default now()
);

create index demo_transfers_bot_idx on public.demo_transfers(bot_id);
create index demo_transfers_org_idx on public.demo_transfers(to_org_id);

alter table public.demo_transfers enable row level security;

-- Owner-only surface (the Demos screen); writes go through the service role.
create policy demo_transfers_owner_all on public.demo_transfers
  for all using (public.is_owner()) with check (public.is_owner());
