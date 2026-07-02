-- ============================================================================
-- Rank canonical answer pages above raw crawl noise. Long legal pages (privacy
-- policy, cookie policy) are full of phrases like "susisiekti su mumis", so for
-- questions like "how do I contact you?" they crowd the synthesized canonical
-- "Contact & business details" page out of the top-k — and the bot then quotes
-- the privacy-template lawyer contact instead of customer support.
--
-- Canonical sources (knowledge_sources.metadata->>'kind' = 'canonical') are
-- purpose-built summaries of the 6 common support topics; when one of their
-- chunks is a candidate at all, it should outrank incidental matches. We add a
-- fixed RRF bonus (1/50 ≈ a strong single-channel rank) to canonical chunks.
-- ============================================================================

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
    (fu.rrf_score
      + case when ks.metadata->>'kind' = 'canonical' then 1.0 / 50 else 0 end
    )::float as rrf_score
  from fused fu
  join public.document_chunks dc on dc.id = fu.id
  left join public.knowledge_sources ks on ks.id = dc.source_id
  where fu.fts_rank is not null
     or coalesce(fu.similarity, 0) >= p_min_similarity
  order by rrf_score desc, similarity desc
  limit greatest(p_match_count, 1);
$$;
