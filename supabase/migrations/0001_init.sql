-- ChatbotZone core schema
-- Extensions
create extension if not exists "pgcrypto";        -- gen_random_bytes / gen_random_uuid
create extension if not exists "vector";          -- pgvector

-- ---------------------------------------------------------------------------
-- updated_at trigger helper
-- ---------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- profiles (extends auth.users)
-- ---------------------------------------------------------------------------
create table public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  role        text not null default 'client' check (role in ('owner', 'client')),
  full_name   text,
  avatar_url  text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create trigger profiles_updated_at before update on public.profiles
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- organizations (a client account / workspace)
-- ---------------------------------------------------------------------------
create table public.organizations (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  slug        text unique,
  status      text not null default 'active' check (status in ('active', 'suspended')),
  created_by  uuid references public.profiles(id) on delete set null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create trigger organizations_updated_at before update on public.organizations
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- organization_members (maps users to orgs)
-- ---------------------------------------------------------------------------
create table public.organization_members (
  id          uuid primary key default gen_random_uuid(),
  org_id      uuid not null references public.organizations(id) on delete cascade,
  user_id     uuid not null references public.profiles(id) on delete cascade,
  role        text not null default 'admin' check (role in ('admin', 'member')),
  created_at  timestamptz not null default now(),
  unique (org_id, user_id)
);
create index organization_members_user_idx on public.organization_members(user_id);
create index organization_members_org_idx on public.organization_members(org_id);

-- ---------------------------------------------------------------------------
-- invites
-- ---------------------------------------------------------------------------
create table public.invites (
  id          uuid primary key default gen_random_uuid(),
  org_id      uuid not null references public.organizations(id) on delete cascade,
  email       text not null,
  token       text not null unique default encode(gen_random_bytes(24), 'hex'),
  status      text not null default 'pending' check (status in ('pending', 'accepted', 'expired')),
  expires_at  timestamptz not null default (now() + interval '7 days'),
  invited_by  uuid references public.profiles(id) on delete set null,
  created_at  timestamptz not null default now()
);
create index invites_token_idx on public.invites(token);
create index invites_org_idx on public.invites(org_id);

-- ---------------------------------------------------------------------------
-- bots
-- ---------------------------------------------------------------------------
create table public.bots (
  id          uuid primary key default gen_random_uuid(),
  org_id      uuid not null references public.organizations(id) on delete cascade,
  name        text not null,
  status      text not null default 'active' check (status in ('active', 'paused')),
  public_key  text not null unique default encode(gen_random_bytes(16), 'hex'),
  config      jsonb not null default '{}'::jsonb,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index bots_org_idx on public.bots(org_id);
create index bots_public_key_idx on public.bots(public_key);
create trigger bots_updated_at before update on public.bots
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- knowledge_sources
-- ---------------------------------------------------------------------------
create table public.knowledge_sources (
  id            uuid primary key default gen_random_uuid(),
  bot_id        uuid not null references public.bots(id) on delete cascade,
  type          text not null check (type in ('file', 'url', 'qa', 'text')),
  name          text not null,
  status        text not null default 'pending' check (status in ('pending', 'processing', 'ready', 'error')),
  error_message text,
  metadata      jsonb not null default '{}'::jsonb,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create index knowledge_sources_bot_idx on public.knowledge_sources(bot_id);
create trigger knowledge_sources_updated_at before update on public.knowledge_sources
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- document_chunks (vector store)
-- ---------------------------------------------------------------------------
create table public.document_chunks (
  id          uuid primary key default gen_random_uuid(),
  bot_id      uuid not null references public.bots(id) on delete cascade,
  source_id   uuid not null references public.knowledge_sources(id) on delete cascade,
  content     text not null,
  embedding   vector(1536),
  token_count int,
  chunk_index int not null default 0,
  created_at  timestamptz not null default now()
);
create index document_chunks_bot_idx on public.document_chunks(bot_id);
create index document_chunks_source_idx on public.document_chunks(source_id);
create index document_chunks_embedding_idx on public.document_chunks
  using hnsw (embedding vector_cosine_ops);

-- ---------------------------------------------------------------------------
-- conversations
-- ---------------------------------------------------------------------------
create table public.conversations (
  id              uuid primary key default gen_random_uuid(),
  bot_id          uuid not null references public.bots(id) on delete cascade,
  visitor_id      text not null,
  metadata        jsonb not null default '{}'::jsonb,
  started_at      timestamptz not null default now(),
  last_message_at timestamptz not null default now()
);
create index conversations_bot_idx on public.conversations(bot_id);
create index conversations_visitor_idx on public.conversations(bot_id, visitor_id);

-- ---------------------------------------------------------------------------
-- messages
-- ---------------------------------------------------------------------------
create table public.messages (
  id              uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  role            text not null check (role in ('user', 'assistant', 'system')),
  content         text not null,
  citations       jsonb not null default '[]'::jsonb,
  token_count     int,
  created_at      timestamptz not null default now()
);
create index messages_conversation_idx on public.messages(conversation_id);

-- ---------------------------------------------------------------------------
-- leads
-- ---------------------------------------------------------------------------
create table public.leads (
  id              uuid primary key default gen_random_uuid(),
  bot_id          uuid not null references public.bots(id) on delete cascade,
  conversation_id uuid references public.conversations(id) on delete set null,
  fields          jsonb not null default '{}'::jsonb,
  created_at      timestamptz not null default now()
);
create index leads_bot_idx on public.leads(bot_id);

-- ---------------------------------------------------------------------------
-- Auto-create a profile row when a new auth user is created
-- ---------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, new.raw_user_meta_data->>'full_name')
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
