-- ============================================================================
-- Retrieval fixes found via HomeByNB's real-visitor testing (2026-08-10):
--
-- 1. OR-semantics full-text matching. websearch_to_tsquery ANDs every token,
--    so "Koks jūsų darbo laikas?" (koks & jūsų & darbo & laikas) never
--    FTS-matched the canonical contact chunk that literally contains
--    "Darbo laikas:" — the chunk missed the candidate set entirely and the bot
--    said it had no opening-hours info. We now build an OR tsquery from the
--    query's tokens and rank with ts_rank_cd: chunks covering MORE tokens
--    densely still rank first, so this subsumes the old AND behavior while
--    partial matches finally surface.
--
-- 2. Diacritic folding + inflection prefixes (same trick match_products uses).
--    Visitors type "jusu parduotuve"; chunks say "jūsų parduotuvė" — zero
--    lexical overlap under 'simple'. Both sides now go through fold_lt(), and
--    tokens >= 7 chars also match as 6-char prefixes ("pastomatus" matches
--    "paštomatą" via pastom:*), covering Lithuanian case endings.
--
-- 3. Duplicate-content dedup. Crawled pages share header/footer boilerplate —
--    HomeByNB's index held ~12 identical footer-nav chunks (one per page),
--    which filled 3 of the top-5 slots on real queries and crowded out the
--    actual answer. Only the best-scoring chunk per md5(content) survives.
-- ============================================================================

-- Folded FTS needs its own expression index (fold_lt is immutable).
create index if not exists document_chunks_fold_fts_idx
  on public.document_chunks
  using gin (to_tsvector('simple', public.fold_lt(coalesce(content, ''))));

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
  with q as (
    -- OR tsquery over folded tokens; long tokens also as 6-char prefixes for
    -- Lithuanian inflections. Tokens are pure alnum after the split, so the
    -- string assembly is injection-safe.
    select case
      when count(*) = 0 then null
      else to_tsquery(
        'simple',
        string_agg(
          case when length(tok) >= 7 then tok || ' | ' || left(tok, 6) || ':*' else tok end,
          ' | '
        )
      )
    end as orq
    from (
      select distinct tok
      from regexp_split_to_table(
        public.fold_lt(coalesce(p_query_text, '')), '[^a-z0-9]+'
      ) tok
      where length(tok) >= 3
    ) toks
  ),
  vec as (
    select
      dc.id,
      1 - (dc.embedding <=> p_query_embedding) as similarity,
      row_number() over (order by dc.embedding <=> p_query_embedding asc) as rank
    from public.document_chunks dc
    where dc.bot_id = p_bot_id and dc.embedding is not null
    order by dc.embedding <=> p_query_embedding asc
    limit p_vector_count
  ),
  fts as (
    select s.id, row_number() over (order by s.score desc) as rank
    from (
      select
        dc.id,
        ts_rank_cd(
          to_tsvector('simple', public.fold_lt(coalesce(dc.content, ''))),
          (select orq from q)
        ) as score
      from public.document_chunks dc
      where dc.bot_id = p_bot_id
        and (select orq from q) is not null
        and to_tsvector('simple', public.fold_lt(coalesce(dc.content, ''))) @@ (select orq from q)
      order by score desc
      limit p_fts_count
    ) s
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
  ),
  ranked as (
    select
      dc.id, dc.content, dc.source_id,
      coalesce(fu.similarity, 1 - (dc.embedding <=> p_query_embedding))::float as similarity,
      (fu.rrf_score
        + case when ks.metadata->>'kind' = 'canonical' then 1.0 / 50 else 0 end
      )::float as rrf_score,
      row_number() over (
        partition by md5(dc.content)
        order by
          (fu.rrf_score
            + case when ks.metadata->>'kind' = 'canonical' then 1.0 / 50 else 0 end
          ) desc
      ) as dup_rank
    from fused fu
    join public.document_chunks dc on dc.id = fu.id
    left join public.knowledge_sources ks on ks.id = dc.source_id
    where fu.fts_rank is not null
       or coalesce(fu.similarity, 0) >= p_min_similarity
  )
  select r.id, r.content, r.source_id, r.similarity, r.rrf_score
  from ranked r
  where r.dup_rank = 1
  order by r.rrf_score desc, r.similarity desc
  limit greatest(p_match_count, 1);
$$;
