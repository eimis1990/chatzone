-- 1. Signup capture v2: the landing dialog also collects the prospect's website,
--    and the owner can convert a signup into an invited client from /owner/signups.
alter table public.signups
  add column if not exists website text,
  add column if not exists status text not null default 'new'
    check (status in ('new', 'invited')),
  add column if not exists invited_at timestamptz;

-- 2. Usage-warning emails: one nudge per org per calendar month, tracked here
--    (compared against the start of the current month before sending).
alter table public.organizations
  add column if not exists usage_warned_at timestamptz;
