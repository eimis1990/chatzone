-- "Last seen" = the last time the embedded widget loaded this bot's config.
-- Lets the owner tell which bots are actually embedded & receiving traffic,
-- vs merely created (status='active' is just a manual on/paused flag).

alter table public.bots
  add column if not exists last_seen_at timestamptz;

create index if not exists bots_last_seen_at_idx on public.bots (last_seen_at);
