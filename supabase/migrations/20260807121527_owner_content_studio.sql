-- Owner Content Studio: durable editorial drafts, source provenance, and
-- generation history. Publication remains a separate human-approved workflow.

create table public.content_items (
  id uuid primary key default gen_random_uuid(),
  created_by uuid not null references auth.users(id) on delete restrict,
  mode text not null default 'new' check (mode in ('new', 'refresh')),
  status text not null default 'idea' check (status in (
    'idea', 'researching', 'brief', 'drafting', 'review', 'ready',
    'pr_open', 'published', 'failed', 'archived'
  )),
  title text not null default '',
  slug text not null default '',
  description text not null default '',
  topic text not null default '',
  target_query text not null default '',
  search_intent text not null default '',
  reader_job text not null default '',
  refresh_slug text,
  language text not null default 'en',
  notes text not null default '',
  markdown text not null default '',
  related_slugs text[] not null default '{}',
  cover_image_path text,
  cover_image_alt text not null default '',
  cover_image_prompt text not null default '',
  pull_request_url text,
  published_url text,
  revision integer not null default 1 check (revision > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  published_at timestamptz,
  constraint content_items_refresh_slug_check check (
    (mode = 'refresh' and nullif(btrim(refresh_slug), '') is not null)
    or (mode = 'new' and refresh_slug is null)
  )
);

create table public.content_sources (
  id uuid primary key default gen_random_uuid(),
  content_item_id uuid not null references public.content_items(id) on delete cascade,
  url text not null,
  title text not null default '',
  publisher text not null default '',
  excerpt text not null default '',
  source_kind text not null default 'web' check (source_kind in ('web', 'internal', 'competitor')),
  fetched_at timestamptz,
  created_at timestamptz not null default now(),
  unique (content_item_id, url)
);

create table public.content_generation_runs (
  id uuid primary key default gen_random_uuid(),
  content_item_id uuid not null references public.content_items(id) on delete cascade,
  operation text not null check (operation in ('research', 'brief', 'draft', 'image', 'publish')),
  status text not null default 'queued' check (status in ('queued', 'in_progress', 'succeeded', 'failed')),
  model text,
  prompt_version text,
  input jsonb not null default '{}'::jsonb,
  output jsonb not null default '{}'::jsonb,
  error_message text,
  started_at timestamptz,
  finished_at timestamptz,
  created_at timestamptz not null default now()
);

create index content_items_status_updated_idx
  on public.content_items (status, updated_at desc);
create index content_items_created_by_idx
  on public.content_items (created_by);
create index content_sources_item_idx
  on public.content_sources (content_item_id);
create index content_generation_runs_item_created_idx
  on public.content_generation_runs (content_item_id, created_at desc);
create unique index content_generation_runs_one_active_idx
  on public.content_generation_runs (content_item_id, operation)
  where status in ('queued', 'in_progress');

alter table public.content_items enable row level security;
alter table public.content_sources enable row level security;
alter table public.content_generation_runs enable row level security;

create policy content_items_owner_all on public.content_items
  for all to authenticated
  using ((select public.is_owner()))
  with check ((select public.is_owner()));
create policy content_sources_owner_all on public.content_sources
  for all to authenticated
  using ((select public.is_owner()))
  with check ((select public.is_owner()));
create policy content_generation_runs_owner_all on public.content_generation_runs
  for all to authenticated
  using ((select public.is_owner()))
  with check ((select public.is_owner()));

revoke all on table public.content_items from anon;
revoke all on table public.content_sources from anon;
revoke all on table public.content_generation_runs from anon;
grant select, insert, update, delete on table public.content_items to authenticated;
grant select, insert, update, delete on table public.content_sources to authenticated;
grant select, insert, update, delete on table public.content_generation_runs to authenticated;

insert into storage.buckets (id, name, public)
values ('content-studio', 'content-studio', false)
on conflict (id) do nothing;

create policy content_studio_owner_insert on storage.objects
  for insert to authenticated
  with check (bucket_id = 'content-studio' and (select public.is_owner()));
create policy content_studio_owner_select on storage.objects
  for select to authenticated
  using (bucket_id = 'content-studio' and (select public.is_owner()));
create policy content_studio_owner_update on storage.objects
  for update to authenticated
  using (bucket_id = 'content-studio' and (select public.is_owner()))
  with check (bucket_id = 'content-studio' and (select public.is_owner()));
create policy content_studio_owner_delete on storage.objects
  for delete to authenticated
  using (bucket_id = 'content-studio' and (select public.is_owner()));
