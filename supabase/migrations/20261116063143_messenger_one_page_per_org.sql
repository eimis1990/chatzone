-- Messenger v1 includes one Facebook Page per organization. Enforce the limit
-- across concurrent OAuth completions; reconnecting the same Page remains valid.
create unique index if not exists channel_connections_one_messenger_page_per_org
  on public.channel_connections (org_id)
  where provider = 'messenger' and status <> 'disconnected';
