-- ---------------------------------------------------------------------------
-- Voice minutes metering
-- ---------------------------------------------------------------------------
-- `duration_secs` = ElevenLabs call length (voice conversations only).
-- `source` marks configurator test-playground calls ('preview') so they can be
-- excluded from the conversation pool, the inbox, and paid-minute metering.
alter table public.conversations
  add column if not exists duration_secs integer,
  add column if not exists source text not null default 'widget'
    check (source in ('widget', 'preview'));

-- Monthly voice-seconds counter per org+source. Written only by the service
-- role (post-call webhook) through increment_voice_usage; the atomic upsert
-- returns before/after so the caller can compute a race-safe overage delta.
create table if not exists public.voice_usage (
  org_id uuid not null references public.organizations(id) on delete cascade,
  month date not null,
  source text not null check (source in ('widget', 'preview')),
  seconds integer not null default 0,
  primary key (org_id, month, source)
);
alter table public.voice_usage enable row level security;
-- No policies on purpose: service-role only (server pages read via the
-- service client, the webhook writes via the RPC below).

create or replace function public.increment_voice_usage(
  p_org uuid,
  p_source text,
  p_secs integer
) returns table (before_secs integer, after_secs integer)
language sql
as $$
  insert into public.voice_usage (org_id, month, source, seconds)
  values (p_org, date_trunc('month', (now() at time zone 'utc'))::date, p_source, greatest(p_secs, 0))
  on conflict (org_id, month, source)
  do update set seconds = voice_usage.seconds + excluded.seconds
  returning seconds - greatest(p_secs, 0), seconds;
$$;
revoke execute on function public.increment_voice_usage(uuid, text, integer) from public, anon, authenticated;

-- One 80%-of-voice-minutes warning email per calendar month (same pattern as
-- usage_warned_at for conversations).
alter table public.organizations
  add column if not exists voice_usage_warned_at timestamptz;
