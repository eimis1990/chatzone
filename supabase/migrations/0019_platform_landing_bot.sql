-- Loqara's own (platform) chatbot, dogfooded on the marketing landing page.
-- `organizations.is_platform` marks Loqara's internal org (not a real client).
-- `bots.show_on_landing` is the owner-controlled toggle that shows/hides the
-- live widget on the public landing page.
alter table public.organizations add column if not exists is_platform boolean not null default false;
alter table public.bots add column if not exists show_on_landing boolean not null default false;

-- At most one platform org.
create unique index if not exists organizations_one_platform_idx
  on public.organizations (is_platform) where is_platform;
