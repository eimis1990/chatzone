-- Real-time voice: per-bot ElevenLabs agent + a small platform settings store.

-- Each bot maps to one ElevenLabs Conversational AI agent. The hash lets us
-- detect when the agent needs re-syncing (PATCH) after a config change.
alter table public.bots add column if not exists elevenlabs_agent_id text;
alter table public.bots add column if not exists elevenlabs_agent_hash text;

-- Key/value store for platform-level settings (e.g. the cached ElevenLabs
-- workspace secret id used by all agents' custom-LLM auth). Service-role only.
create table if not exists public.platform_settings (
  key        text primary key,
  value      text not null,
  updated_at timestamptz not null default now()
);

alter table public.platform_settings enable row level security;
-- No policies: only the service role (which bypasses RLS) touches this table.
