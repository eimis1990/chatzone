-- Temporary, bot-scoped visitor blocks created by the public chat abuse guard.
-- The service role is the only writer/reader; browsers learn only whether their
-- own visitor id is currently blocked through a narrowly-scoped widget route.
create table public.visitor_blocks (
  id                  uuid primary key default gen_random_uuid(),
  bot_id              uuid not null references public.bots(id) on delete cascade,
  visitor_id          text not null,
  reason              text not null check (
    reason in ('directed_abuse', 'sexual_spam', 'message_spam', 'prompt_attack', 'manual_review')
  ),
  details             jsonb not null default '{}'::jsonb,
  conversation_id     uuid references public.conversations(id) on delete set null,
  trigger_message_id  uuid references public.messages(id) on delete set null,
  source              text not null default 'automatic' check (source in ('automatic', 'manual')),
  blocked_at          timestamptz not null default now(),
  expires_at          timestamptz not null,
  constraint visitor_blocks_expiry_check check (expires_at > blocked_at),
  constraint visitor_blocks_bot_visitor_key unique (bot_id, visitor_id)
);

create index visitor_blocks_active_idx
  on public.visitor_blocks (bot_id, visitor_id, expires_at desc);

alter table public.visitor_blocks enable row level security;

-- The table is deliberately not exposed to public browser roles. All access is
-- through service-role widget routes that first resolve and scope the bot.
revoke all on table public.visitor_blocks from public, anon, authenticated;
grant select, insert, update, delete on table public.visitor_blocks to service_role;
