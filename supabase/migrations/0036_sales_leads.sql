-- ---------------------------------------------------------------------------
-- Sales leads (owner outreach pipeline)
-- ---------------------------------------------------------------------------
-- Researched prospect companies for Loqara outreach, previously tracked in a
-- standalone HTML artifact. Owner-only: this is the operator's sales pipeline,
-- never visible to client orgs. `score` is a heuristic chance-to-close rank;
-- `email_subject`/`email_body` hold the prepared cold email snapshot.
create table public.sales_leads (
  id            uuid primary key default gen_random_uuid(),
  name          text not null,
  legal_name    text,
  website       text not null unique,
  city          text,
  vertical      text not null,
  ceo           text,
  email         text,
  phone         text,
  size_info     text,
  platform      text,
  hook          text,
  fit_note      text,
  source        text,
  score         int not null default 50 check (score between 0 and 100),
  score_why     text,
  email_subject text,
  email_body    text,
  status        text not null default 'ready'
    check (status in ('ready', 'email_sent', 'rejected', 'accepted', 'client')),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index sales_leads_score_idx on public.sales_leads(score desc);
create index sales_leads_status_idx on public.sales_leads(status);

alter table public.sales_leads enable row level security;

create policy sales_leads_owner_all on public.sales_leads
  for all using (public.is_owner()) with check (public.is_owner());
