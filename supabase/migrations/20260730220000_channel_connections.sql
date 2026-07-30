-- External messaging channels (docs/CHANNELS_IMPLEMENTATION.md).
-- One connection = one external account (Facebook Page, later IG/WhatsApp)
-- wired to one bot. All tables are service-role-only: the webhook route and
-- server actions are the only readers/writers, same posture as visitor_blocks.

create table public.channel_connections (
  id                    uuid primary key default gen_random_uuid(),
  org_id                uuid not null references public.organizations(id) on delete cascade,
  bot_id                uuid not null references public.bots(id) on delete cascade,
  provider              text not null check (provider in ('messenger', 'instagram')),
  external_account_id   text not null,
  display_name          text,
  avatar_url            text,
  -- Encrypted token for OAuth-connected client Pages. NULL for the spike
  -- connection, which sends via the env META_PAGE_ACCESS_TOKEN instead.
  access_token_cipher   text,
  scopes                text[] not null default '{}',
  status                text not null default 'connecting' check (
    status in ('connecting', 'active', 'paused', 'action_required', 'disconnected')
  ),
  token_expires_at      timestamptz,
  last_health_check_at  timestamptz,
  last_error_code       text,
  last_error_summary    text,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now(),
  -- One Page can only ever be connected to one organization.
  constraint channel_connections_provider_account_key unique (provider, external_account_id)
);
create index channel_connections_org_idx on public.channel_connections(org_id);
create index channel_connections_bot_idx on public.channel_connections(bot_id);

create table public.channel_contacts (
  id                     uuid primary key default gen_random_uuid(),
  channel_connection_id  uuid not null references public.channel_connections(id) on delete cascade,
  external_user_id       text not null,
  profile                jsonb not null default '{}'::jsonb,
  first_seen_at          timestamptz not null default now(),
  last_seen_at           timestamptz not null default now(),
  constraint channel_contacts_connection_user_key unique (channel_connection_id, external_user_id)
);

-- Idempotency + operational audit trail for provider webhook deliveries.
-- No raw payloads stored (nothing to retain/purge); error_summary is safe text.
create table public.channel_webhook_events (
  id                     uuid primary key default gen_random_uuid(),
  provider               text not null,
  event_id               text not null,
  channel_connection_id  uuid references public.channel_connections(id) on delete set null,
  status                 text not null default 'received' check (
    status in ('received', 'processed', 'failed', 'skipped')
  ),
  attempts               int not null default 1,
  error_summary          text,
  received_at            timestamptz not null default now(),
  processed_at           timestamptz,
  constraint channel_webhook_events_provider_event_key unique (provider, event_id)
);
create index channel_webhook_events_connection_idx
  on public.channel_webhook_events(channel_connection_id, received_at desc);

-- Conversations can now originate from Messenger. visitor_id holds the
-- Page-scoped sender ID (PSID); uniqueness of that ID is connection-scoped,
-- which the (bot_id, channel_connection_id, visitor_id) lookup respects.
alter table public.conversations
  add column if not exists channel_connection_id uuid
    references public.channel_connections(id) on delete set null;
alter table public.conversations drop constraint if exists conversations_channel_check;
alter table public.conversations
  add constraint conversations_channel_check check (channel in ('chat', 'voice', 'messenger'));

alter table public.channel_connections enable row level security;
alter table public.channel_contacts enable row level security;
alter table public.channel_webhook_events enable row level security;

revoke all on table public.channel_connections from public, anon, authenticated;
revoke all on table public.channel_contacts from public, anon, authenticated;
revoke all on table public.channel_webhook_events from public, anon, authenticated;

grant select, insert, update, delete on table public.channel_connections to service_role;
grant select, insert, update, delete on table public.channel_contacts to service_role;
grant select, insert, update, delete on table public.channel_webhook_events to service_role;
