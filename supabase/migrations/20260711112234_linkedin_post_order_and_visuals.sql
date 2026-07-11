-- Persist Kanban ordering and optional campaign imagery for LinkedIn posts.
alter table public.linkedin_posts
  add column if not exists sort_order integer not null default 0,
  add column if not exists image_url text,
  add column if not exists image_alt text;

-- Give existing rows a deterministic order within each lifecycle column.
with ranked as (
  select
    id,
    row_number() over (partition by status order by created_at asc, id asc) - 1 as position
  from public.linkedin_posts
)
update public.linkedin_posts as posts
set sort_order = ranked.position
from ranked
where posts.id = ranked.id;

create index if not exists linkedin_posts_board_order_idx
  on public.linkedin_posts (status, sort_order, created_at);

comment on column public.linkedin_posts.sort_order is
  'Zero-based manual order inside the current status column.';
comment on column public.linkedin_posts.image_url is
  'Public project-relative or absolute URL for the post visual.';
comment on column public.linkedin_posts.image_alt is
  'Accessible description for the post visual and LinkedIn upload.';
