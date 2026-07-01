-- Live progress for the "Sync catalog" background job, so the owner can watch a
-- client's catalog index build (fetching → enriching → embedding → indexing →
-- done) and see when it finishes. One row per bot, upserted by the sync route
-- (service role); owners/members read it via RLS to render a progress bar.

create table public.catalog_sync_status (
  bot_id     uuid primary key references public.bots(id) on delete cascade,
  phase      text not null default 'idle',  -- idle|fetching|enriching|embedding|indexing|done|error
  processed  int not null default 0,
  total      int not null default 0,
  synced     int not null default 0,
  error      text,
  updated_at timestamptz not null default now()
);

alter table public.catalog_sync_status enable row level security;

create policy catalog_sync_status_owner_all on public.catalog_sync_status
  for all using (public.is_owner()) with check (public.is_owner());
create policy catalog_sync_status_member_read on public.catalog_sync_status
  for select using (public.bot_org_id(bot_id) in (select public.auth_org_ids()));
