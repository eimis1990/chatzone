-- Conversation evaluations: an AI self-assessment of how well each conversation
-- was handled (1–5) plus a short rationale, cached alongside summary/topics.
alter table public.conversations
  add column if not exists success_score int
  check (success_score is null or success_score between 1 and 5);

alter table public.conversations
  add column if not exists success_reason text;
