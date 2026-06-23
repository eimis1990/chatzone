-- Persist the product suggestions a bot surfaced in an assistant turn so the
-- conversation transcript can replay the full interaction (not just the text).
alter table public.messages
  add column if not exists products jsonb not null default '[]'::jsonb;
