-- Extra-conversations add-on: one-time €15 top-ups of 1,000 conversations,
-- scoped to the calendar month they were bought in (unused credits expire at
-- month end). Credited by the Stripe webhook on checkout completion; the
-- unique session id makes retried webhook deliveries idempotent.
-- Service-role-only, same posture as channel_* and visitor_blocks.

create table public.conversation_credits (
  id                 uuid primary key default gen_random_uuid(),
  org_id             uuid not null references public.organizations(id) on delete cascade,
  -- First day of the month the credit applies to (UTC), matching monthStartISO.
  month              date not null,
  conversations      int not null check (conversations > 0),
  stripe_session_id  text not null unique,
  created_at         timestamptz not null default now()
);

create index conversation_credits_org_month_idx
  on public.conversation_credits(org_id, month);

alter table public.conversation_credits enable row level security;
revoke all on table public.conversation_credits from public, anon, authenticated;
grant select, insert, update, delete on table public.conversation_credits to service_role;
