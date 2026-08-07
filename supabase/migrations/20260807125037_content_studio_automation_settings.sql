-- Owner-level Content Studio automation preferences and destination policies.
-- Delivery credentials stay in provider-specific connector systems; these rows
-- describe what should happen only after a connector reports itself ready.

create table public.content_studio_settings (
  owner_id uuid primary key references auth.users(id) on delete cascade,
  proactive_suggestions boolean not null default true,
  default_approval_mode text not null default 'review'
    check (default_approval_mode in ('review', 'auto_publish')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.content_publication_targets (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  provider text not null check (provider in (
    'website', 'linkedin', 'facebook', 'instagram', 'youtube', 'tiktok'
  )),
  slot_key text not null default 'default',
  account_label text not null default '',
  account_handle text not null default '',
  enabled boolean not null default false,
  approval_mode text not null default 'review'
    check (approval_mode in ('review', 'auto_publish')),
  content_types text[] not null default array['article']::text[],
  connector_status text not null default 'not_connected'
    check (connector_status in ('not_connected', 'connected', 'error')),
  connector_account_id text,
  connector_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint content_publication_targets_slot_key_check
    check (slot_key ~ '^[a-z0-9][a-z0-9_-]{0,79}$'),
  constraint content_publication_targets_content_types_check
    check (
      cardinality(content_types) > 0
      and content_types <@ array['article', 'social_post', 'video']::text[]
    ),
  unique (owner_id, provider, slot_key)
);

create index content_publication_targets_owner_enabled_idx
  on public.content_publication_targets (owner_id, enabled);

alter table public.content_studio_settings enable row level security;
alter table public.content_publication_targets enable row level security;

create policy content_studio_settings_owner_all on public.content_studio_settings
  for all to authenticated
  using ((select public.is_owner()) and owner_id = (select auth.uid()))
  with check ((select public.is_owner()) and owner_id = (select auth.uid()));

create policy content_publication_targets_owner_all on public.content_publication_targets
  for all to authenticated
  using ((select public.is_owner()) and owner_id = (select auth.uid()))
  with check ((select public.is_owner()) and owner_id = (select auth.uid()));

revoke all on table public.content_studio_settings from anon, authenticated;
revoke all on table public.content_publication_targets from anon, authenticated;
grant select on table public.content_studio_settings to authenticated;
grant select on table public.content_publication_targets to authenticated;
