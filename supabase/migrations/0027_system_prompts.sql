-- Reusable system-prompt library: the owner authors named prompts once
-- ("E-commerce", "Default", …) and assigns them to client bots by reference,
-- instead of copy-pasting a prompt into every bot. Owner-only.

create table public.system_prompts (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  content    text not null default '',
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.system_prompts enable row level security;

-- Only the platform owner manages the prompt library.
create policy system_prompts_owner_all on public.system_prompts
  for all using (public.is_owner()) with check (public.is_owner());

create trigger system_prompts_updated_at before update on public.system_prompts
  for each row execute function public.set_updated_at();
