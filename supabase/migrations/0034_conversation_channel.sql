-- ---------------------------------------------------------------------------
-- Conversation channel + external id
-- ---------------------------------------------------------------------------
-- `channel` distinguishes text chat (default) from voice calls, which now get
-- persisted from the ElevenLabs post-call webhook (see /api/widget/voice-webhook).
-- `external_id` holds the provider's conversation id so webhook retries are
-- idempotent (unique when present).
alter table public.conversations
  add column if not exists channel text not null default 'chat'
    check (channel in ('chat', 'voice')),
  add column if not exists external_id text;

create unique index if not exists conversations_external_id_key
  on public.conversations(external_id)
  where external_id is not null;
