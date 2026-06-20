-- ChatbotZone RPC + analytics views

-- ---------------------------------------------------------------------------
-- match_chunks: vector similarity search scoped to a single bot.
-- Uses cosine distance (<=>). similarity = 1 - distance.
-- Runs as the caller; the public widget calls it via the service role with an
-- explicit bot_id, while authenticated clients are additionally constrained by
-- RLS on document_chunks.
-- ---------------------------------------------------------------------------
create or replace function public.match_chunks(
  p_bot_id          uuid,
  p_query_embedding vector(1536),
  p_match_count     int   default 5,
  p_min_similarity  float default 0.0
)
returns table (id uuid, content text, source_id uuid, similarity float)
language sql stable as $$
  select
    dc.id,
    dc.content,
    dc.source_id,
    1 - (dc.embedding <=> p_query_embedding) as similarity
  from public.document_chunks dc
  where dc.bot_id = p_bot_id
    and dc.embedding is not null
    and 1 - (dc.embedding <=> p_query_embedding) >= p_min_similarity
  order by dc.embedding <=> p_query_embedding
  limit greatest(p_match_count, 1);
$$;

-- ---------------------------------------------------------------------------
-- owner_stats: platform-wide totals. security_invoker so RLS applies — the
-- owner sees everything; a non-owner would only see their own visible rows.
-- ---------------------------------------------------------------------------
create or replace view public.owner_stats
with (security_invoker = on) as
select
  (select count(*) from public.organizations)                 as total_orgs,
  (select count(*) from public.bots where status = 'active')  as active_bots,
  (select count(*) from public.conversations)                 as total_conversations,
  (select count(*) from public.messages)                      as total_messages,
  (select count(*) from public.leads)                         as total_leads;

-- ---------------------------------------------------------------------------
-- org_stats: per-organization rollup. security_invoker so each client sees
-- only their org(s); the owner sees all rows.
-- ---------------------------------------------------------------------------
create or replace view public.org_stats
with (security_invoker = on) as
select
  o.id   as org_id,
  o.name as org_name,
  o.status,
  (select count(*) from public.bots b where b.org_id = o.id) as bots,
  (select count(*)
     from public.conversations c
     join public.bots b on b.id = c.bot_id
    where b.org_id = o.id) as conversations,
  (select count(*)
     from public.messages m
     join public.conversations c on c.id = m.conversation_id
     join public.bots b on b.id = c.bot_id
    where b.org_id = o.id) as messages,
  (select count(*)
     from public.leads l
     join public.bots b on b.id = l.bot_id
    where b.org_id = o.id) as leads,
  (select max(c.last_message_at)
     from public.conversations c
     join public.bots b on b.id = c.bot_id
    where b.org_id = o.id) as last_activity_at
from public.organizations o;
