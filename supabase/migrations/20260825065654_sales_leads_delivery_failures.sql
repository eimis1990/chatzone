-- Delivery failures are technical outcomes, not prospect rejections. Keep the
-- reason and provider timestamp so the owner can correct an address or retry a
-- temporary mailbox problem without distorting rejection/follow-up metrics.

alter table public.sales_leads
  add column if not exists delivery_failed_at timestamptz,
  add column if not exists delivery_failure_reason text;

alter table public.sales_leads
  drop constraint if exists sales_leads_status_check;

alter table public.sales_leads
  add constraint sales_leads_status_check
  check (
    status in (
      'ready',
      'email_sent',
      'follow_up_email',
      'wants_demo',
      'demo_ready',
      'demo_presented',
      'testing_bot',
      'delivery_failed',
      'rejected',
      'client'
    )
  );

comment on column public.sales_leads.delivery_failed_at is
  'Provider-reported timestamp of the latest confirmed delivery failure.';

comment on column public.sales_leads.delivery_failure_reason is
  'Human-readable provider failure reason; null when no failure is recorded.';

-- Confirmed Hostinger bounce notices present in hello@loqara.com on 2026-08-25.
-- Match stable recipient snapshots instead of generated row ids.
with failures(email, failed_at, reason) as (
  values
    ('info@ubela.lt', '2026-08-04T06:27:21Z'::timestamptz, 'Mailbox is full (quota exceeded).'),
    ('info@batuisparduotuve.shop', '2026-08-11T07:22:22Z'::timestamptz, 'Forwarded Freshdesk mailbox is disabled and not accepting messages.'),
    ('info@cherry24.lt', '2026-08-11T07:22:24Z'::timestamptz, 'Recipient domain could not be resolved (host not found).'),
    ('info@violeta.lt', '2026-08-17T14:03:42Z'::timestamptz, 'Recipient server returned a temporary home-directory error (451).'),
    ('info@kumpiai.lt', '2026-08-19T07:02:32Z'::timestamptz, 'Recipient forwarding failed sender verification because of an invalid SRS address.'),
    ('info@alka.lt', '2026-08-20T06:32:50Z'::timestamptz, 'Mailbox is full; delivery retries expired.'),
    ('info@asgrozioklinika.lt', '2026-08-24T07:17:37Z'::timestamptz, 'Mailbox is full; delivery retries expired.'),
    ('info@karaliskamesa.lt', '2026-08-25T06:46:14Z'::timestamptz, 'Mailbox is full (quota exceeded).'),
    ('info@kvietkai.lt', '2026-08-25T06:46:41Z'::timestamptz, 'Recipient address does not exist (550 5.1.10).')
)
update public.sales_leads as lead
set
  status = 'delivery_failed',
  status_updated_at = failures.failed_at,
  delivery_failed_at = failures.failed_at,
  delivery_failure_reason = failures.reason,
  updated_at = now()
from failures
where lower(lead.email) = failures.email;
