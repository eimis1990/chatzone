-- System prompt versioning: system_prompts.content becomes the DRAFT; publishing
-- freezes it as an immutable row here. Bots pin a version via
-- config.systemPromptVersionId (live) / config.previewSystemPromptVersionId.
-- Publishing never touches bots — the old edit-repushes-everywhere behavior is gone.

create table public.system_prompt_versions (
  id uuid primary key default gen_random_uuid(),
  prompt_id uuid not null references public.system_prompts(id) on delete cascade,
  version int not null,
  content text not null,
  note text,
  published_at timestamptz not null default now(),
  published_by uuid references auth.users(id) on delete set null,
  unique (prompt_id, version)
);

create index system_prompt_versions_prompt_idx
  on public.system_prompt_versions (prompt_id);

alter table public.system_prompt_versions enable row level security;

-- Owner-only, like system_prompts. Clients get version METADATA through server
-- actions (service client); version content never crosses to the client.
create policy system_prompt_versions_owner_all on public.system_prompt_versions
  for all using (public.is_owner()) with check (public.is_owner());

-- Backfill: every existing prompt's current content becomes v1.
insert into public.system_prompt_versions (prompt_id, version, content, published_by)
select id, 1, content, created_by from public.system_prompts;

-- Pin bots to v1 where their snapshot still matches the library content (all
-- should, since pushes were automatic). Mismatches stay unpinned → shown as
-- "unversioned" until someone picks a version.
update public.bots b
set config = b.config || jsonb_build_object('systemPromptVersionId', v.id)
from public.system_prompts p
join public.system_prompt_versions v on v.prompt_id = p.id and v.version = 1
where b.config->>'systemPromptId' = p.id::text
  and b.config->>'systemPrompt' = p.content;
