-- Semantic product index: an embedded, tag-enriched copy of a bot's store
-- catalog for concept-level product search ("gift ideas for women" → relevant
-- products, not just keyword matches). Prices/stock are NOT stored here — they
-- are hydrated live from the store at query time, so results never go stale.

create table public.product_embeddings (
  id           uuid primary key default gen_random_uuid(),
  bot_id       uuid not null references public.bots(id) on delete cascade,
  external_id  text not null,                 -- store product id
  title        text not null,
  url          text,
  image_url    text,
  tags         text[] not null default '{}',  -- derived + AI enrichment tags
  doc          text not null,                 -- text that was embedded
  embedding    vector(1536),
  synced_at    timestamptz not null default now(),
  unique (bot_id, external_id)
);

create index product_embeddings_bot_idx on public.product_embeddings(bot_id);
create index product_embeddings_embedding_idx on public.product_embeddings
  using hnsw (embedding vector_cosine_ops);

alter table public.product_embeddings enable row level security;

-- Owner manages any bot's catalog; members read their own org's (writes go
-- through the service role during sync).
create policy product_embeddings_owner_all on public.product_embeddings
  for all using (public.is_owner()) with check (public.is_owner());
create policy product_embeddings_member_read on public.product_embeddings
  for select using (public.bot_org_id(bot_id) in (select public.auth_org_ids()));

-- Vector similarity search, scoped to one bot's catalog.
create or replace function public.match_products(
  p_bot_id uuid,
  p_embedding vector(1536),
  p_k int default 8
)
returns table (
  external_id text,
  title text,
  url text,
  image_url text,
  tags text[],
  doc text,
  similarity float
)
language sql stable
as $$
  select external_id, title, url, image_url, tags, doc,
         1 - (embedding <=> p_embedding) as similarity
  from public.product_embeddings
  where bot_id = p_bot_id and embedding is not null
  order by embedding <=> p_embedding
  limit greatest(p_k, 1);
$$;
