-- Recipient/audience facet for the semantic product index. Embedding similarity
-- alone conflates "gift" across recipients (a "gift for men" query surfaces
-- women's and even kids' products), so we classify each product's intended
-- audience and filter on it at query time. 'unisex' items match every audience.

alter table public.product_embeddings
  add column if not exists audience text;  -- 'women' | 'men' | 'kids' | 'unisex'

create index if not exists product_embeddings_audience_idx
  on public.product_embeddings(bot_id, audience);

-- Return type changes (adds `audience`) and a new parameter is added, so the
-- old signature must be dropped before recreating.
drop function if exists public.match_products(uuid, vector, int);

-- Vector similarity search, scoped to one bot's catalog and (optionally) to a
-- target audience. When p_audience is given, only products for that audience —
-- or unisex ones — are returned, so a "gift for men" search never yields
-- women's or kids' items.
create function public.match_products(
  p_bot_id uuid,
  p_embedding vector(1536),
  p_k int default 8,
  p_audience text default null
)
returns table (
  external_id text,
  title text,
  url text,
  image_url text,
  tags text[],
  audience text,
  doc text,
  similarity float
)
language sql stable
as $$
  select external_id, title, url, image_url, tags, audience, doc,
         1 - (embedding <=> p_embedding) as similarity
  from public.product_embeddings
  where bot_id = p_bot_id
    and embedding is not null
    and (
      p_audience is null
      or audience is null
      or audience = 'unisex'
      or audience = p_audience
    )
  order by embedding <=> p_embedding
  limit greatest(p_k, 1);
$$;
