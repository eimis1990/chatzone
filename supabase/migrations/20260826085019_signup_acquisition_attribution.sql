-- Preserve privacy-bounded first-touch acquisition context with each accepted
-- public signup. Query strings, search terms from referrers, and click IDs are
-- intentionally not stored; the client sends only a pathname, a referrer with
-- query/hash removed, and explicit UTM dimensions.
alter table public.signups
  add column if not exists landing_path text,
  add column if not exists referrer text,
  add column if not exists acquisition_source text,
  add column if not exists acquisition_medium text,
  add column if not exists utm_campaign text,
  add column if not exists utm_content text,
  add column if not exists first_touch_at timestamptz;

comment on column public.signups.landing_path is
  'First public pathname seen in the 90-day attribution window; never includes a query or hash.';
comment on column public.signups.referrer is
  'External first-touch referrer origin and pathname with query and hash removed.';
comment on column public.signups.first_touch_at is
  'Browser timestamp when the persisted first-touch attribution window began.';
