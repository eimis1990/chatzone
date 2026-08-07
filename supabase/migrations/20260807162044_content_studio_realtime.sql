-- Keep the owner Content Studio pipeline synchronized while background work
-- updates an article or generation run. RLS still controls which rows each
-- authenticated subscriber can receive.
do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'content_items'
  ) then
    alter publication supabase_realtime add table public.content_items;
  end if;

  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'content_generation_runs'
  ) then
    alter publication supabase_realtime add table public.content_generation_runs;
  end if;
end
$$;
