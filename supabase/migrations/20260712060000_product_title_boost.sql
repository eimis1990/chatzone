-- ============================================================================
-- Brand/name queries must beat vector noise. "slim lady skaidulu kompleksas"
-- returned soap dispensers: the FTS ('simple' config) has no diacritic folding,
-- so the shopper's "skaidulu" never matches the doc's "skaidulų", FTS comes up
-- empty, and pure vector similarity ranks junk above exact title matches.
-- Fix: a title-token tier — products whose TITLE contains every query token
-- (case + Lithuanian-diacritic folded) always rank first. No new index: the
-- per-bot base set is small (~2k rows), a scan is fine.
-- ponytail: translate() folds Lithuanian only — swap for unaccent if a
-- non-Lithuanian catalog ever needs folding.
-- ============================================================================

create or replace function public.fold_lt(p text)
returns text
language sql immutable strict as $$
  select translate(lower(p), 'ąčęėįšųūž', 'aceeisuuz');
$$;

drop function if exists public.match_products(uuid, vector, text, int, text, float);

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
  toks as (
    select t
    from regexp_split_to_table(public.fold_lt(coalesce(p_query_text, '')), '\s+') as t
    where length(t) >= 2
  ),
  -- Every query token appears in the (folded) title → strongest possible signal.
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
  -- Keep a product if its title matched, it matched full-text, OR it is a decent
  -- vector match. Weak vector-only matches are dropped instead of padding top-k.
  where fu.title_match
     or fu.fts_rank is not null
     or coalesce(fu.similarity, 0) >= p_min_similarity
  order by fu.title_match desc, fu.rrf_score desc, similarity desc
  limit greatest(p_k, 1);
$$;

grant execute on function public.match_products(uuid, vector(1536), text, int, text, float)
  to anon, authenticated, service_role;
