-- Cover the audit foreign keys for efficient conversation/message deletion.
create index visitor_blocks_conversation_idx
  on public.visitor_blocks (conversation_id)
  where conversation_id is not null;

create index visitor_blocks_trigger_message_idx
  on public.visitor_blocks (trigger_message_id)
  where trigger_message_id is not null;

-- RLS is intentionally service-only. The service role bypasses RLS, but this
-- explicit policy documents the access model and keeps database advisors clear.
create policy visitor_blocks_service_role_all
  on public.visitor_blocks
  for all
  to service_role
  using (true)
  with check (true);
