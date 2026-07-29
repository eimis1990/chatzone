-- Keep lifecycle timing separate from general row edits such as prepared-email
-- copy updates. Existing rows use updated_at as the best available historical
-- estimate; all future status changes write this column explicitly.
alter table public.sales_leads
  add column if not exists status_updated_at timestamptz;

update public.sales_leads
set status_updated_at = updated_at
where status_updated_at is null;

alter table public.sales_leads
  alter column status_updated_at set default now(),
  alter column status_updated_at set not null;

alter table public.sales_leads
  drop constraint if exists sales_leads_status_check;

alter table public.sales_leads
  add constraint sales_leads_status_check
  check (
    status in (
      'ready',
      'email_sent',
      'follow_up_email',
      'rejected',
      'accepted',
      'client'
    )
  );

-- Append the polite opt-out to every prepared email exactly once, including
-- leads whose first email has already been sent. Do not touch updated_at:
-- changing stored copy is not a lifecycle event.
update public.sales_leads
set email_body =
  rtrim(email_body)
  || E'\n\n'
  || 'Jei tokie pasiūlymai šiuo metu neaktualūs, tiesiog atsakykite „ne“ – daugiau nerašysiu.'
where email_body is not null
  and btrim(email_body) <> ''
  and position(
    'Jei tokie pasiūlymai šiuo metu neaktualūs, tiesiog atsakykite „ne“ – daugiau nerašysiu.'
    in email_body
  ) = 0;
