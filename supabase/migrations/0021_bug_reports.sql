-- In-app bug reports. Any signed-in user (owner or client) can file one from the
-- sidebar; only the owner can read and triage them.
create table if not exists public.bug_reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid references auth.users(id) on delete set null,
  reporter_email text,
  org_id uuid references public.organizations(id) on delete set null,
  title text not null,
  description text not null,
  page text,
  user_agent text,
  status text not null default 'open' check (status in ('open', 'in_progress', 'resolved')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists bug_reports_status_idx
  on public.bug_reports (status, created_at desc);

alter table public.bug_reports enable row level security;

-- Owner: full access (read + triage).
create policy bug_reports_owner_all on public.bug_reports
  for all using (public.is_owner()) with check (public.is_owner());

-- Any authenticated user may file a report, attributed to themselves.
create policy bug_reports_insert_self on public.bug_reports
  for insert to authenticated
  with check (reporter_id = auth.uid());
