-- ============================================================================
-- Lithuanian-safe FTS. Migration 0020 hardcoded the 'english' tsvector config,
-- which stems/stopwords English only — Lithuanian morphology never matched, so
-- LT queries effectively lost the lexical half of hybrid retrieval. 'simple'
-- lowercases and splits without language-specific stemming: exact lexemes
-- (Lithuanian words, emails, product names) match in every language, and the
-- vector channel keeps carrying semantics. Net win for a Lithuanian-first corpus.
-- ============================================================================

drop index if exists idx_document_chunks_content_fts;
create index idx_document_chunks_content_fts
  on public.document_chunks
  using gin (to_tsvector('simple', coalesce(content, '')));

create or replace function public.match_chunks_hybrid(
  p_bot_id          uuid,
  p_query_embedding vector(1536),
  p_query_text      text,
  p_match_count     int   default 5,
  p_min_similarity  float default 0.2,
  p_vector_count    int   default 30,
  p_fts_count       int   default 30
)
returns table (id uuid, content text, source_id uuid, similarity float, rrf_score float)
language sql stable as $$
  with vec as (
    select
      dc.id, dc.content, dc.source_id,
      1 - (dc.embedding <=> p_query_embedding) as similarity,
      row_number() over (order by dc.embedding <=> p_query_embedding asc) as rank
    from public.document_chunks dc
    where dc.bot_id = p_bot_id and dc.embedding is not null
    order by dc.embedding <=> p_query_embedding asc
    limit p_vector_count
  ),
  fts as (
    select
      dc.id,
      row_number() over (
        order by ts_rank_cd(
          to_tsvector('simple', coalesce(dc.content, '')),
          websearch_to_tsquery('simple', p_query_text)
        ) desc
      ) as rank
    from public.document_chunks dc
    where dc.bot_id = p_bot_id
      and p_query_text is not null
      and websearch_to_tsquery('simple', p_query_text) @@
          to_tsvector('simple', coalesce(dc.content, ''))
    limit p_fts_count
  ),
  fused as (
    select
      coalesce(v.id, f.id) as id,
      v.similarity,
      f.rank as fts_rank,
      coalesce(1.0 / (60 + v.rank), 0.0) +
      coalesce(1.0 / (60 + f.rank), 0.0) as rrf_score
    from vec v
    full outer join fts f on f.id = v.id
  )
  select
    dc.id, dc.content, dc.source_id,
    coalesce(fu.similarity, 1 - (dc.embedding <=> p_query_embedding))::float as similarity,
    fu.rrf_score::float
  from fused fu
  join public.document_chunks dc on dc.id = fu.id
  -- Keep a chunk if it matched full-text OR is a decent vector match. Weak
  -- vector matches that also missed full-text are dropped as noise.
  where fu.fts_rank is not null
     or coalesce(fu.similarity, 0) >= p_min_similarity
  order by fu.rrf_score desc, similarity desc
  limit greatest(p_match_count, 1);
$$;
