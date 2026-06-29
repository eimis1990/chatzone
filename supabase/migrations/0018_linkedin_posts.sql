-- Owner-only LinkedIn content tracker: draft posts, then mark them posted.
-- A lightweight content pipeline (idea -> draft -> posted) so the operator can
-- plan posts (or have them drafted) and tick them off as they go live.
create table if not exists public.linkedin_posts (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  body text not null default '',
  link text,
  status text not null default 'draft' check (status in ('idea', 'draft', 'posted')),
  posted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists linkedin_posts_status_idx
  on public.linkedin_posts (status, created_at desc);

-- Owner-only: all access goes through the owner session / service role.
alter table public.linkedin_posts enable row level security;
create policy linkedin_posts_owner_all on public.linkedin_posts
  for all using (public.is_owner()) with check (public.is_owner());
