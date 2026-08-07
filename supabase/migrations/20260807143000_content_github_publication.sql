-- Durable identifiers for the review-only GitHub publication handoff.
alter table public.content_items
  add column pull_request_number integer check (pull_request_number > 0),
  add column publication_branch text
    check (publication_branch ~ '^content/[A-Za-z0-9._/-]+$'),
  add column publication_commit_sha text
    check (publication_commit_sha ~ '^[0-9a-f]{40}$'),
  add column publication_base_sha text
    check (publication_base_sha ~ '^[0-9a-f]{40}$');

-- Commit the external GitHub result and successful run together. If the
-- revision changed while GitHub was working, the PR remains recoverable: the
-- deterministic branch/open-PR lookup makes the next attempt idempotent.
create or replace function public.apply_content_publication_result(
  p_content_item_id uuid,
  p_expected_revision integer,
  p_run_id uuid,
  p_pull_request_url text,
  p_pull_request_number integer,
  p_publication_branch text,
  p_publication_commit_sha text,
  p_publication_base_sha text,
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
    status = 'pr_open',
    pull_request_url = p_pull_request_url,
    pull_request_number = p_pull_request_number,
    publication_branch = p_publication_branch,
    publication_commit_sha = p_publication_commit_sha,
    publication_base_sha = p_publication_base_sha,
    revision = revision + 1,
    updated_at = now()
  where id = p_content_item_id
    and status = 'ready'
    and revision = p_expected_revision
  returning * into v_item;

  if not found then
    raise exception 'content_publication_revision_conflict' using errcode = '40001';
  end if;

  update public.content_generation_runs
  set
    status = 'succeeded',
    output = p_run_output,
    finished_at = now()
  where id = p_run_id
    and content_item_id = p_content_item_id
    and operation = 'publish'
    and status = 'in_progress';

  if not found then
    raise exception 'content_publication_run_not_found';
  end if;

  return v_item;
end;
$$;

revoke all on function public.apply_content_publication_result(
  uuid, integer, uuid, text, integer, text, text, text, jsonb
) from public, anon, authenticated;
grant execute on function public.apply_content_publication_result(
  uuid, integer, uuid, text, integer, text, text, text, jsonb
) to service_role;
