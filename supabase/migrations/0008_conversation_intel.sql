-- Conversation intelligence (Phase 1): per-message feedback + per-conversation
-- AI summary/topics + a fallback flag for an "AI accuracy" proxy.

-- Visitor thumbs up/down on an assistant reply.
alter table public.messages
  add column if not exists feedback text
  check (feedback is null or feedback in ('up', 'down'));

-- Cached LLM analysis of a conversation + whether it ever hit the fallback.
alter table public.conversations add column if not exists summary text;
alter table public.conversations add column if not exists topics text[];
alter table public.conversations add column if not exists analyzed_at timestamptz;
alter table public.conversations
  add column if not exists had_fallback boolean not null default false;

-- Index to find conversations needing (re)analysis cheaply.
create index if not exists conversations_analyzed_idx
  on public.conversations(bot_id, analyzed_at);
