-- Sales pipeline gains demo-tracking stages. 'accepted' was too coarse: a lead
-- that says yes still has to get a demo built, presented, and test-driven
-- before it becomes a client — each of those is now its own status.
--
-- accepted → wants_demo (rename), plus demo_ready, demo_presented, testing_bot.

alter table public.sales_leads
  drop constraint if exists sales_leads_status_check;

update public.sales_leads
set status = 'wants_demo'
where status = 'accepted';

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
      'rejected',
      'client'
    )
  );
