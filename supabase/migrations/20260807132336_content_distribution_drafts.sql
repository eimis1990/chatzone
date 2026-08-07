-- Durable, reviewable destination copy generated alongside a Content Studio
-- article. Publishing credentials and delivery state remain outside this table.
create table public.content_variants (
  id uuid primary key default gen_random_uuid(),
  content_item_id uuid not null references public.content_items(id) on delete cascade,
  provider text not null check (provider in ('linkedin', 'facebook', 'instagram')),
  slot_key text not null default 'default'
    check (slot_key ~ '^[a-z0-9][a-z0-9_-]{0,79}$'),
  content_type text not null default 'social_post'
    check (content_type = 'social_post'),
  status text not null default 'draft'
    check (status in ('draft', 'review', 'approved')),
  headline text not null default '',
  body text not null default '',
  hashtags text[] not null default '{}',
  image_prompt text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint content_variants_hashtags_check check (cardinality(hashtags) <= 12),
  unique (content_item_id, provider, slot_key, content_type)
);

create index content_variants_item_status_idx
  on public.content_variants (content_item_id, status);

alter table public.content_variants enable row level security;

create policy content_variants_owner_select on public.content_variants
  for select to authenticated
  using (
    (select public.is_owner())
    and exists (
      select 1
      from public.content_items
      where content_items.id = content_variants.content_item_id
        and content_items.created_by = (select auth.uid())
    )
  );

revoke all on table public.content_variants from anon, authenticated;
grant select on table public.content_variants to authenticated;

-- Apply one generated package atomically after the external model calls finish.
-- Only the server-side service role may invoke this; the calling Server Action
-- authenticates the owner before reaching the function.
create or replace function public.apply_content_generation_result(
  p_content_item_id uuid,
  p_expected_revision integer,
  p_run_id uuid,
  p_result jsonb,
  p_sources jsonb,
  p_variants jsonb,
  p_run_output jsonb
)
returns public.content_items
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_item public.content_items;
begin
  update public.content_items
  set
    title = p_result->>'title',
    description = p_result->>'description',
    markdown = p_result->>'markdown',
    related_slugs = array(select jsonb_array_elements_text(p_result->'related_slugs')),
    cover_image_alt = p_result->>'cover_image_alt',
    cover_image_prompt = p_result->>'cover_image_prompt',
    cover_image_path = nullif(p_result->>'cover_image_path', ''),
    status = 'drafting',
    revision = revision + 1,
    updated_at = now()
  where id = p_content_item_id
    and revision = p_expected_revision
  returning * into v_item;

  if not found then
    raise exception 'content_revision_conflict' using errcode = '40001';
  end if;

  insert into public.content_sources (
    content_item_id, url, title, publisher, excerpt, source_kind, fetched_at
  )
  select
    p_content_item_id,
    source.url,
    source.title,
    source.publisher,
    source.excerpt,
    source.source_kind,
    source.fetched_at
  from jsonb_to_recordset(p_sources) as source(
    url text,
    title text,
    publisher text,
    excerpt text,
    source_kind text,
    fetched_at timestamptz
  )
  on conflict (content_item_id, url) do update set
    title = excluded.title,
    publisher = excluded.publisher,
    excerpt = excluded.excerpt,
    source_kind = excluded.source_kind,
    fetched_at = excluded.fetched_at;

  delete from public.content_variants
  where content_item_id = p_content_item_id;

  insert into public.content_variants (
    content_item_id, provider, slot_key, content_type, status,
    headline, body, hashtags, image_prompt
  )
  select
    p_content_item_id,
    variant->>'provider',
    variant->>'slot_key',
    variant->>'content_type',
    variant->>'status',
    variant->>'headline',
    variant->>'body',
    array(select jsonb_array_elements_text(variant->'hashtags')),
    variant->>'image_prompt'
  from jsonb_array_elements(p_variants) as variants(variant);

  update public.content_generation_runs
  set
    status = 'succeeded',
    output = p_run_output,
    finished_at = now()
  where id = p_run_id
    and content_item_id = p_content_item_id;

  if not found then
    raise exception 'content_generation_run_not_found';
  end if;

  return v_item;
end;
$$;

revoke all on function public.apply_content_generation_result(uuid, integer, uuid, jsonb, jsonb, jsonb, jsonb)
  from public, anon, authenticated;
grant execute on function public.apply_content_generation_result(uuid, integer, uuid, jsonb, jsonb, jsonb, jsonb)
  to service_role;
