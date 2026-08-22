-- Instagram DMs join the external-channel model: same webhook, connection
-- table (provider 'instagram' was in the check from day one), and Inbox
-- delivery as Messenger. Only the conversations channel check needs widening.
alter table public.conversations drop constraint if exists conversations_channel_check;
alter table public.conversations
  add constraint conversations_channel_check
  check (channel in ('chat', 'voice', 'messenger', 'instagram'));
