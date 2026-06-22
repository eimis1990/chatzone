-- Early-access signups captured from the public landing page.
create table if not exists public.signups (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  source text,
  created_at timestamptz not null default now()
);

-- Case-insensitive uniqueness (one row per email).
create unique index if not exists signups_email_idx on public.signups (lower(email));

-- Writes go through the service role (public API); reads are owner-only.
alter table public.signups enable row level security;
create policy signups_owner_all on public.signups
  for all using (public.is_owner()) with check (public.is_owner());
