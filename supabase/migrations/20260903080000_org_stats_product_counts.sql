-- org_stats: add product suggestions (cards shown in bot replies) and product
-- clicks so the owner Clients cards can show commerce value at a glance.
-- Same definitions as the per-bot analytics: suggestions = jsonb_array_length
-- of messages.products; clicks = widget_events of type 'product_click'.
-- New columns go LAST: create-or-replace view may only append columns.
create or replace view public.org_stats
with (security_invoker = on) as
select
  o.id   as org_id,
  o.name as org_name,
  o.status,
  (select count(*) from public.bots b where b.org_id = o.id) as bots,
  (select count(*)
     from public.conversations c
     join public.bots b on b.id = c.bot_id
    where b.org_id = o.id) as conversations,
  (select count(*)
     from public.messages m
     join public.conversations c on c.id = m.conversation_id
     join public.bots b on b.id = c.bot_id
    where b.org_id = o.id) as messages,
  (select count(*)
     from public.leads l
     join public.bots b on b.id = l.bot_id
    where b.org_id = o.id) as leads,
  (select max(c.last_message_at)
     from public.conversations c
     join public.bots b on b.id = c.bot_id
    where b.org_id = o.id) as last_activity_at,
  (select coalesce(sum(jsonb_array_length(m.products)), 0)
     from public.messages m
     join public.conversations c on c.id = m.conversation_id
     join public.bots b on b.id = c.bot_id
    where b.org_id = o.id) as product_suggestions,
  (select count(*)
     from public.widget_events e
     join public.bots b on b.id = e.bot_id
    where b.org_id = o.id and e.type = 'product_click') as product_clicks
from public.organizations o;
