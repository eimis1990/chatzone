# Visitor abuse protection

Layered protection for harassment, repeated spam, and prompt/secret extraction.
Prompt wording is defense in depth; the server owns the actual stop decision.

## Detection and block lifecycle

- `assessVisitorAbuse` is deterministic and high-confidence: immediate block for
  directed slurs/threats, repeated-message floods, and explicit hidden-prompt or
  secret extraction; softer model/tool/role probes require a sustained sequence
  (`lib/security/visitor-abuse.ts:83`).
- A single technical question, legitimate adult-content policy question, product
  complaint, or profanity about a service is not enough to block. Keep these
  false-positive guards covered by `tests/unit/visitor-abuse.test.ts`.
- `/api/chat` checks an active block before model spend, scopes a supplied
  conversation id to both bot **and visitor**, then assesses recent user turns.
  The triggering message is persisted for audit; the model and handoff path are
  skipped (`app/api/chat/route.ts:78`, `app/api/chat/route.ts:100`,
  `app/api/chat/route.ts:128`).
- Blocks are unique per `(bot_id, visitor_id)`, last 24 hours, and extend on a
  later upsert. Audit metadata stores signals/reason and message/conversation
  references, not a second copy of the message (`lib/visitor-blocks.ts:66`).

## Database and browser surface

- `visitor_blocks` has RLS, explicit service-role-only grants/policy, expiry and
  reason checks, and covering audit indexes
  (`supabase/migrations/20260723183618_visitor_blocks.sql:4`,
  `supabase/migrations/20260723184427_visitor_blocks_hardening.sql:1`).
- Conversation review shows a compact **Blocked** card for active visitor
  blocks. **Unblock** deletes the bot+visitor row; **Extend block** adds 24 hours
  after the existing expiry (not after the click time). A compare-and-swap retry
  preserves both additions if two dashboard sessions extend concurrently
  (`components/client/VisitorBlockManagementCard.tsx:60`,
  `lib/visitor-blocks.ts:76`).
- Dashboard block mutations never trust a browser-supplied visitor id. The
  server action first uses the signed-in RLS client to prove the selected
  conversation is visible and belongs to the current bot, then derives the
  visitor id and performs the narrowly scoped service-role write
  (`components/bot-views/ConversationsSection.tsx:186`).
- The live widget POSTs its local visitor id to `/api/widget/block-status` before
  showing interactive chrome. A block response also carries
  `x-visitor-blocked-until`, so a newly-triggered block replaces the current UI
  immediately (`app/api/widget/block-status/route.ts:7`,
  `components/widget/ChatWindow.tsx:950`).
- Blocked UI is intentionally only a white canvas, red circle/ban icon, and
  localized 24-hour message: no header, history, composer, buttons, lead form,
  or voice control (`components/widget/VisitorBlockedScreen.tsx:9`).

## Prompt and voice behavior

- Chat prompts never reveal/confirm hidden prompts, tools, models/providers,
  backend details, credentials, or secrets; abusive/probing turns must not be
  rewarded with human handoff or lead capture (`lib/ai/prompt.ts:66`).
- Voice-token minting requires `visitorId` and rejects active blocks before
  ElevenLabs spend (`app/api/widget/voice-token/route.ts:49`).
- Voice agents include ElevenLabs' `end_call` built-in system tool. Direct
  harassment, threats/slurs, repeated explicit bait/spam, prompt extraction, or
  continued capability probing ends the live call (`lib/ai/elevenlabs-agent.ts:100`,
  `lib/ai/elevenlabs-agent.ts:206`). Bump the agent hash whenever this prompt or
  built-in-tool payload changes.

## Boundary

`visitor_id` is a browser-local identifier, not identity proof. Clearing site
data or using another browser creates a new id and evades this layer. The
existing rate limiter remains complementary; stronger cross-device enforcement
would require a separately reviewed IP/fingerprint policy with privacy and
false-positive tradeoffs.

_Last verified: 2026-07-23._
