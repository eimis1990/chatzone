-- Knowledge-check dismissals: an owner/client can mark a lint finding as
-- reviewed/not-an-issue so it stops showing. Keyed by a stable fingerprint
-- (type + topic + evidence) computed server-side; if the underlying content
-- changes the fingerprint changes and the finding resurfaces on the next scan.
create table if not exists public.knowledge_lint_dismissals (
  id uuid primary key default gen_random_uuid(),
  bot_id uuid not null references public.bots (id) on delete cascade,
  fingerprint text not null,
  created_at timestamptz not null default now(),
  created_by uuid references auth.users (id) on delete set null,
  unique (bot_id, fingerprint)
);

create index if not exists knowledge_lint_dismissals_bot_idx
  on public.knowledge_lint_dismissals (bot_id);

alter table public.knowledge_lint_dismissals enable row level security;

-- Same access model as the rest of a bot's data: the platform owner manages
-- everything; org members manage dismissals for bots in their own org.
create policy lint_dismissals_owner_all on public.knowledge_lint_dismissals
  for all using (public.is_owner()) with check (public.is_owner());

create policy lint_dismissals_member_all on public.knowledge_lint_dismissals
  for all
  using (public.bot_org_id(bot_id) in (select public.auth_org_ids()))
  with check (public.bot_org_id(bot_id) in (select public.auth_org_ids()));
