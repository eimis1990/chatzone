-- Stripe billing state, attached to the organization (one subscription per org).
-- The webhook (service role) is the only writer; clients have SELECT-only on
-- organizations (see 0002_rls.sql), so they cannot escalate their own plan.

alter table public.organizations
  add column if not exists stripe_customer_id     text unique,
  add column if not exists stripe_subscription_id text,
  add column if not exists plan                   text not null default 'free'
    check (plan in ('free', 'starter', 'growth', 'scale', 'enterprise')),
  add column if not exists subscription_status    text not null default 'inactive'
    check (subscription_status in
      ('inactive', 'trialing', 'active', 'past_due', 'canceled', 'unpaid')),
  add column if not exists billing_interval       text
    check (billing_interval in ('month', 'year')),
  add column if not exists current_period_end     timestamptz,
  add column if not exists cancel_at_period_end    boolean not null default false;

create index if not exists organizations_stripe_customer_id_idx
  on public.organizations (stripe_customer_id);
