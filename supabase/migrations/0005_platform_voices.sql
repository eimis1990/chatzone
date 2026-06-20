-- Owner-curated ElevenLabs voices offered to clients in the configurator.
create table public.platform_voices (
  id          uuid primary key default gen_random_uuid(),
  voice_id    text not null unique,           -- ElevenLabs voice id
  name        text not null,
  gender      text not null check (gender in ('male', 'female')),
  preview_url text,
  sort_order  int not null default 0,
  created_at  timestamptz not null default now()
);

alter table public.platform_voices enable row level security;

-- Only the platform owner manages the catalog. Clients read it through an
-- authenticated API that uses the service role, so no client select policy.
create policy platform_voices_owner_all on public.platform_voices
  for all using (public.is_owner()) with check (public.is_owner());
