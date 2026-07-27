-- Model-driven intent review (lib/ai/abuse-intel.ts) can block visitors for
-- sustained bad-faith engagement — trolling / no genuine intent — that the
-- deterministic regex tripwires deliberately do not cover.
alter table public.visitor_blocks
  drop constraint visitor_blocks_reason_check;
alter table public.visitor_blocks
  add constraint visitor_blocks_reason_check check (
    reason in ('directed_abuse', 'sexual_spam', 'message_spam', 'prompt_attack', 'bad_faith', 'manual_review')
  );
