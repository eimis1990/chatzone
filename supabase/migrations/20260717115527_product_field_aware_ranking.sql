-- Rank matches by what the query token matched, not only where it occurred in
-- the whole product document. Product-type terms should match the title, while
-- hard qualifiers (color, material, dimensions) should match attribute VALUES.
-- This prevents description/category prose from making a non-white chair beat
-- a chair whose structured attribute is exactly `Spalva: Balta`.

create or replace function public.match_products(
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
  with base as materialized (
    select id, external_id, title, url, image_url, tags, audience, doc, embedding,
           public.fold_lt(title) as folded_title,
           public.fold_lt(coalesce(doc, '')) as folded_doc,
           public.fold_lt(
             coalesce(
               regexp_replace(
                 substring(doc from 'Attributes: ([^\n]*)'),
                 '(^|;)[^:]+:', '\1', 'g'
               ),
               ''
             )
           ) as folded_attribute_values
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
    select distinct t
    from regexp_split_to_table(public.fold_lt(coalesce(p_query_text, '')), '[^[:alnum:]]+') as t
    where length(t) >= 2
  ),
  prefix_toks as (
    select distinct
           left(t, least(length(t), 4)) as strict_prefix,
           left(t, least(length(t), 3)) as loose_prefix
    from toks
    where length(t) >= 3
  ),
  tmatch as (
    select b.id
    from base b
    where exists (select 1 from toks)
      and not exists (
        select 1 from toks
        where position(toks.t in b.folded_title) = 0
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
  field_raw as (
    select b.id,
           count(distinct pt.loose_prefix) filter (
             where position(pt.loose_prefix in b.folded_title) > 0
           )::int as title_matches,
           count(distinct pt.strict_prefix) filter (
             where position(pt.strict_prefix in b.folded_attribute_values) > 0
           )::int as attribute_matches,
           count(distinct pt.strict_prefix) filter (
             where position(pt.strict_prefix in b.folded_doc) > 0
           )::int as strict_matches,
           count(distinct pt.loose_prefix) filter (
             where position(pt.loose_prefix in b.folded_doc) > 0
           )::int as loose_matches,
           1 - (b.embedding <=> p_embedding) as similarity
    from base b
    cross join prefix_toks pt
    group by b.id, b.embedding
    having count(*) filter (
      where position(pt.loose_prefix in b.folded_title) > 0
         or position(pt.strict_prefix in b.folded_attribute_values) > 0
         or position(pt.strict_prefix in b.folded_doc) > 0
         or position(pt.loose_prefix in b.folded_doc) > 0
    ) > 0
  ),
  field_match as (
    select id, title_matches, attribute_matches, strict_matches, loose_matches, similarity,
           row_number() over (
             order by title_matches desc, attribute_matches desc,
                      strict_matches desc, loose_matches desc, similarity desc
           ) as rank
    from field_raw
    order by title_matches desc, attribute_matches desc,
             strict_matches desc, loose_matches desc, similarity desc
    limit 80
  ),
  candidate_ids as (
    select id from vec
    union
    select id from fts
    union
    select id from tmatch
    union
    select id from field_match
  ),
  scored as (
    select c.id,
           (t.id is not null) as exact_title_match,
           coalesce(fm.title_matches, 0) as title_matches,
           coalesce(fm.attribute_matches, 0) as attribute_matches,
           coalesce(fm.strict_matches, 0) as strict_matches,
           coalesce(fm.loose_matches, 0) as loose_matches,
           coalesce(v.similarity, fm.similarity) as candidate_similarity,
           f.rank as fts_rank,
           coalesce(1.0 / (60 + v.rank), 0.0) +
           coalesce(1.0 / (60 + f.rank), 0.0) +
           coalesce(1.0 / (60 + fm.rank), 0.0) as rrf_score
    from candidate_ids c
    left join vec v on v.id = c.id
    left join fts f on f.id = c.id
    left join tmatch t on t.id = c.id
    left join field_match fm on fm.id = c.id
  )
  select b.external_id, b.title, b.url, b.image_url, b.tags, b.audience, b.doc,
         coalesce(s.candidate_similarity, 1 - (b.embedding <=> p_embedding))::float as similarity
  from scored s
  join base b on b.id = s.id
  where s.exact_title_match
     or s.fts_rank is not null
     or s.title_matches > 0
     or s.attribute_matches > 0
     or s.strict_matches > 0
     or s.loose_matches > 0
     or coalesce(s.candidate_similarity, 0) >= p_min_similarity
  order by s.exact_title_match desc,
           s.title_matches desc,
           s.attribute_matches desc,
           s.strict_matches desc,
           s.loose_matches desc,
           s.rrf_score desc,
           similarity desc
  limit greatest(p_k, 1);
$$;

grant execute on function public.match_products(uuid, vector(1536), text, int, text, float)
  to anon, authenticated, service_role;
