-- ============================================================================
-- Hybrid product search. match_products was vector-only with NO similarity
-- floor: nonsense queries still "matched" top-k, and exact product names could
-- lose to vaguely-related items. Mirror match_chunks_hybrid: vector + FTS
-- ('simple' config — catalog is Lithuanian-first) fused with RRF, plus a
-- similarity floor for vector-only candidates.
-- ============================================================================

create index if not exists idx_product_embeddings_doc_fts
  on public.product_embeddings
  using gin (to_tsvector('simple', coalesce(doc, '')));

drop function if exists public.match_products(uuid, vector, int, text);

create function public.match_products(
  p_bot_id          uuid,
  p_embedding       vector(1536),
  p_query_text      text  default null,
  p_k               int   default 8,
  p_audience        text  default null,
  p_min_similarity  float default 0.25
)
returns table (
  external_id text, title text, url text, image_url text,
  tags text[], audience text, doc text, similarity float
)
language sql stable as $$
  with base as (
    select id, external_id, title, url, image_url, tags, audience, doc, embedding
    from public.product_embeddings
    where bot_id = p_bot_id
      and embedding is not null
      and (
        p_audience is null
        or audience is null
        or audience = 'unisex'
        or audience = p_audience
      )
  ),
  vec as (
    select id, 1 - (embedding <=> p_embedding) as similarity,
           row_number() over (order by embedding <=> p_embedding asc) as rank
    from base
    order by embedding <=> p_embedding asc
    limit 30
  ),
  fts as (
    select id,
           row_number() over (
             order by ts_rank_cd(
               to_tsvector('simple', coalesce(doc, '')),
               websearch_to_tsquery('simple', p_query_text)
             ) desc
           ) as rank
    from base
    where p_query_text is not null
      and websearch_to_tsquery('simple', p_query_text) @@
          to_tsvector('simple', coalesce(doc, ''))
    limit 30
  ),
  fused as (
    select coalesce(v.id, f.id) as id,
           v.similarity,
           f.rank as fts_rank,
           coalesce(1.0 / (60 + v.rank), 0.0) +
           coalesce(1.0 / (60 + f.rank), 0.0) as rrf_score
    from vec v
    full outer join fts f on f.id = v.id
  )
  select b.external_id, b.title, b.url, b.image_url, b.tags, b.audience, b.doc,
         coalesce(fu.similarity, 1 - (b.embedding <=> p_embedding))::float as similarity
  from fused fu
  join base b on b.id = fu.id
  -- Keep a product if it matched full-text OR is a decent vector match. Weak
  -- vector-only matches are dropped instead of padding the top-k with noise.
  where fu.fts_rank is not null
     or coalesce(fu.similarity, 0) >= p_min_similarity
  order by fu.rrf_score desc, similarity desc
  limit greatest(p_k, 1);
$$;

grant execute on function public.match_products(uuid, vector(1536), text, int, text, float)
  to anon, authenticated, service_role;
