-- One-time "done-for-you" setup purchases (paid in the subscription page).
-- Recorded by the Stripe webhook so the owner knows a client paid and can do
-- the setup work.
create table if not exists public.setup_orders (
  id uuid primary key default gen_random_uuid(),
  org_id uuid references public.organizations(id) on delete cascade,
  package text not null check (package in ('essential', 'ecommerce')),
  amount_cents int not null default 0,
  currency text not null default 'eur',
  stripe_session_id text unique,
  status text not null default 'paid' check (status in ('paid', 'refunded')),
  created_at timestamptz not null default now()
);

create index if not exists setup_orders_org_idx on public.setup_orders (org_id, created_at desc);

alter table public.setup_orders enable row level security;

-- Owner: full access (sees every paid setup to fulfil it).
create policy setup_orders_owner_all on public.setup_orders
  for all using (public.is_owner()) with check (public.is_owner());

-- Org members: read their own org's orders (to show "purchased"). Inserts come
-- from the webhook via the service role.
create policy setup_orders_member_read on public.setup_orders
  for select using (org_id in (select public.auth_org_ids()));
