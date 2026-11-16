-- Server-issued immutable offers: metadata alone can never grant credits.
create table public.conversation_topup_purchases (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  stripe_customer_id text not null,
  plan text not null check (plan in ('basic','starter','growth','scale','enterprise')),
  price_id text not null,
  conversations integer not null check (conversations in (200,1000)),
  stripe_session_id text unique,
  stripe_payment_intent_id text,
  created_at timestamptz not null default now(),
  paid_at timestamptz,
  credit_month date,
  review_reason text
);
create index conversation_topup_purchases_org_idx on public.conversation_topup_purchases(org_id);
create index conversation_topup_purchases_payment_idx on public.conversation_topup_purchases(stripe_payment_intent_id);
alter table public.conversation_topup_purchases enable row level security;
revoke all on public.conversation_topup_purchases from public,anon,authenticated;
grant select,insert,update,delete on public.conversation_topup_purchases to service_role;

create table public.billing_review_events (
  stripe_event_id text primary key,
  stripe_customer_id text,
  stripe_payment_intent_id text,
  kind text not null,
  created_at timestamptz not null default now(),
  resolved_at timestamptz
);
alter table public.billing_review_events enable row level security;
revoke all on public.billing_review_events from public,anon,authenticated;
grant select,insert,update,delete on public.billing_review_events to service_role;
