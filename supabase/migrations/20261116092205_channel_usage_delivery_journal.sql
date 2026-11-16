-- Service-only audit trail: retries never send a second Messenger reply.
-- Keep identifiers even if a failed reservation is released or chat deleted.
alter table public.channel_webhook_events
  add column usage_org_id uuid,
  add column usage_session_id uuid,
  add column outbound_message_id text,
  add column usage_committed_at timestamptz;
