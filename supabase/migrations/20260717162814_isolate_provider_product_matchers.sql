-- Provider isolation boundary:
--
-- The field-aware Lithuanian furniture matcher introduced for Verskis must not
-- silently change ranking for WooCommerce, Shopify, or Magento catalogs. Keep
-- that implementation under a provider-specific RPC and restore the shared RPC
-- to the provider-neutral hybrid/title matcher that preceded it.

alter function public.match_products(uuid, vector, text, int, text, float)
  rename to match_products_verskis;

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
language sql stable
set search_path = public
as $$
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
  toks as (
    select t
    from regexp_split_to_table(public.fold_lt(coalesce(p_query_text, '')), '\s+') as t
    where length(t) >= 2
  ),
  tmatch as (
    select b.id
    from base b
    where exists (select 1 from toks)
      and not exists (
        select 1 from toks
        where position(toks.t in public.fold_lt(b.title)) = 0
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
    select coalesce(v.id, f.id, t.id) as id,
           v.similarity,
           f.rank as fts_rank,
           (t.id is not null) as title_match,
           coalesce(1.0 / (60 + v.rank), 0.0) +
           coalesce(1.0 / (60 + f.rank), 0.0) as rrf_score
    from vec v
    full outer join fts f on f.id = v.id
    full outer join tmatch t on t.id = coalesce(v.id, f.id)
  )
  select b.external_id, b.title, b.url, b.image_url, b.tags, b.audience, b.doc,
         coalesce(fu.similarity, 1 - (b.embedding <=> p_embedding))::float as similarity
  from fused fu
  join base b on b.id = fu.id
  where fu.title_match
     or fu.fts_rank is not null
     or coalesce(fu.similarity, 0) >= p_min_similarity
  order by fu.title_match desc, fu.rrf_score desc, similarity desc
  limit greatest(p_k, 1);
$$;

grant execute on function public.match_products(uuid, vector(1536), text, int, text, float)
  to anon, authenticated, service_role;
grant execute on function public.match_products_verskis(uuid, vector(1536), text, int, text, float)
  to anon, authenticated, service_role;
