# Voice

Real-time voice agent — a paid add-on on top of the grounded chat agent. Built
on **ElevenLabs Conversational AI**.

## How it works

- Widget call button shows when `config.voice.enabled` **and** the org's Voice
  add-on is active. Gated server-side in `publicBotConfig` — `showCallButton:
  callAllowed && (config.voice?.enabled ?? false)` where `callAllowed =
  voiceAddon !== false` (`lib/widget-config.ts:145,166`). Rendered in
  `components/widget/ChatWindow.tsx:691-692,787`. See
  [widget-and-embed](widget-and-embed.md).
- In-chat TTS/STT are **retired** — `publicBotConfig` always sends
  `ttsEnabled: false, sttEnabled: false` regardless of the stored config
  (`lib/widget-config.ts:199-205`); only the live-call agent is live. The
  `voice.ttsEnabled`/`sttEnabled` fields still exist in the schema
  (`lib/validation/schemas.ts:208-209`) but no longer do anything client-side.
- One ElevenLabs agent per bot (`buildAgentConfig`, `lib/ai/elevenlabs-agent.ts:106`),
  multilingual via `language_presets` (per-language first message) and
  `supported_voices` (per-language voice override) — see
  [languages-i18n](languages-i18n.md). Voices come from `config.voice.voices`
  (`{ en, lt? }`, `lib/validation/schemas.ts:210-212`). LLM is a built-in
  ElevenLabs model id chosen from `VOICE_LLM_OPTIONS`
  (`lib/ai/voice-models.ts:14-21`), default `gpt-4o`.
- **Prompt** = `buildAgentPrompt` (`lib/ai/elevenlabs-agent.ts:71`): the bot's
  `cfg.systemPrompt` + hardcoded voice blocks (spoken-delivery style + per-tool
  guidance for search/knowledge/order/discount). Product results render as cards,
  so the prompt tells the agent NOT to read names/prices aloud and to reply in one
  or two short, *varied*, warm sentences (do not habitually open with
  "Žinoma"/"Of course" — that repetition was a real complaint, fixed 2026-07-08).
  ⚠️ **gotcha:** `agentConfigHash` hashes `cfg.systemPrompt` but NOT the hardcoded
  voice-block text, so when you change `buildAgentPrompt` you must bump its version
  marker (`agentConfigHash`, currently `v22-voice-language-lock`) or live agents
  won't re-sync.
- **Language lock:** `buildAgentPrompt` injects the bot's available language names
  (from `languages[]`) and forbids replying in anything outside that set — added
  after gpt-4o code-switched a Russian word into a Lithuanian reply. It also tells
  the agent not to switch languages unless the customer does. (ElevenLabs' own V3
  auto-detection is a separate layer we don't currently constrain in config — if
  drift persists, that's the next lever.)
- **One list per request:** on voice, every `search_products` call renders its
  own card list (`ChatWindow` `handleVoiceSearch`), so the prompt tells the agent
  to run ONE search per request (not fan out across gift categories) and to ask a
  clarifying question instead; the widget also merges a burst of searches into a
  single list. Prevents stacking several carousels for one question (fixed 2026-07-08).
- The agent answers knowledge questions via a `search_knowledge` **client
  tool** (`buildKnowledgeToolConfig`, `lib/ai/elevenlabs-agent.ts:211-236`),
  implemented browser-side in `components/voice/VoiceCallButton.tsx:142`
  against `app/api/widget/knowledge/route.ts`. It sets
  `expects_response: true` (`lib/ai/elevenlabs-agent.ts:224`) — without that,
  ElevenLabs only tells the LLM "tool called successfully" and it can't use
  the retrieved context. Other client tools follow the same shape:
  `search_products`, and conditionally `order_status` / `discount_code` when
  those features are enabled (`lib/ai/elevenlabs-agent.ts:238-295,321-334`).
- Token minting: `POST /api/widget/voice-token` checks `config.voice.enabled`,
  the org's `voice_addon`, the monthly conversation limit, and domain
  allowlist before calling `ensureAgent` + `getConversationToken`
  (`app/api/widget/voice-token/route.ts:38-63`).

## Billing

`organizations.voice_addon` is a boolean set by Stripe sync
(`lib/stripe/sync.ts:72`) based on a dedicated voice price id
(`lib/stripe/manage.ts:67-92`); no minute-tracking or per-minute metering
exists in the codebase itself. The €49/mo + €0.20/min, ~200-minutes-included
figure is marketing copy in `components/landing/Pricing.tsx:13-14`, not
enforced or read anywhere server-side — actual usage limits are whatever the
Stripe price/product is configured to be.

> ⚠️ verify: whether ElevenLabs usage is metered/capped anywhere beyond the
> conversation-count limit in `isOverConversationLimit` (`app/api/widget/voice-token/route.ts:48`) — no per-minute cutoff was found in this codebase.

See also [plans-and-entitlements](plans-and-entitlements.md) for how
`voice_addon` fits into the broader entitlements model.

_Last verified: 2026-07-08 (66f6bb8)._
