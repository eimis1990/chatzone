-- Owner-only Facebook and Instagram content queues. Each imported LinkedIn topic
-- gets one row per platform so captions, order, and publication state can diverge.
create table public.social_posts (
  id uuid primary key default gen_random_uuid(),
  source_linkedin_post_id uuid references public.linkedin_posts(id) on delete set null,
  platform text not null check (platform in ('facebook', 'instagram')),
  title text not null,
  body text not null default '',
  link text,
  image_url text,
  image_alt text,
  status text not null default 'draft' check (status in ('idea', 'draft', 'posted')),
  sort_order integer not null default 0 check (sort_order >= 0),
  posted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (platform, source_linkedin_post_id)
);

create index social_posts_board_order_idx
  on public.social_posts (platform, status, sort_order, created_at);

alter table public.social_posts enable row level security;

create policy social_posts_owner_all on public.social_posts
  for all
  using ((select public.is_owner()))
  with check ((select public.is_owner()));

-- Keep the table off the anonymous API surface. Owner sessions may read it and
-- server actions use the service role for all mutations.
revoke all on table public.social_posts from anon;
grant select on table public.social_posts to authenticated;
grant select, insert, update, delete on table public.social_posts to service_role;

comment on table public.social_posts is
  'Owner Facebook and Instagram planning queues derived from LinkedIn topics.';
comment on column public.social_posts.source_linkedin_post_id is
  'Optional source topic used to keep one imported row per platform.';
comment on column public.social_posts.sort_order is
  'Zero-based manual order inside a platform and lifecycle column.';
