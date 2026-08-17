-- Durable audit + idempotency guard for owner-triggered cold-email sends.
-- A partial unique index ensures a double click, retry, or concurrent request
-- cannot create two active/successful initial sends for the same lead.

alter table public.sales_leads
  add column if not exists initial_email_sent_at timestamptz,
  add column if not exists initial_email_template text,
  add column if not exists initial_email_message_id text;

alter table public.sales_leads
  drop constraint if exists sales_leads_initial_email_template_check;

alter table public.sales_leads
  add constraint sales_leads_initial_email_template_check
  check (
    initial_email_template is null
    or initial_email_template = 'clean'
  );

create table public.sales_email_sends (
  id                  uuid primary key default gen_random_uuid(),
  lead_id             uuid not null references public.sales_leads(id) on delete cascade,
  kind                text not null default 'initial' check (kind in ('initial')),
  template            text not null check (template = 'clean'),
  sender              text not null,
  recipient           text not null,
  subject             text not null,
  body_snapshot       text not null,
  status              text not null default 'sending' check (status in ('sending', 'sent', 'failed')),
  provider_message_id text,
  sent_mailbox_path   text,
  sent_mailbox_uid    bigint,
  error               text,
  created_at          timestamptz not null default now(),
  completed_at        timestamptz
);

create unique index sales_email_sends_one_initial_active_idx
  on public.sales_email_sends(lead_id, kind)
  where status in ('sending', 'sent');

create index sales_email_sends_lead_created_idx
  on public.sales_email_sends(lead_id, created_at desc);

alter table public.sales_email_sends enable row level security;

create policy sales_email_sends_owner_all on public.sales_email_sends
  for all using (public.is_owner()) with check (public.is_owner());

-- Server actions use the service role and no browser role needs direct access.
grant select, insert, update on public.sales_email_sends to service_role;
