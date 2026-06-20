# ChatbotZone — Cycle 3: Real-time Voice (ElevenLabs Agents) + Language — Design Spec

**Date:** 2026-06-20
**Status:** Approved scope
**Depends on:** Cycle 2 / 2.5 (voice), merged to main

---

## 1. Overview

Two capabilities:

1. **Real-time voice conversation** via **ElevenLabs Agents** (Conversational AI): streaming
   duplex audio with barge-in, ElevenLabs ASR + the bot's chosen voice, answering from the bot's
   knowledge base through a **custom LLM** callback into our existing RAG. Exposed as a "Start voice
   call" button in both the configurator test playground and the embedded widget.
2. **Language** selection per bot — **English** or **Lithuanian** — applied to both text chat and
   voice (ASR + TTS + the model's response language).

### Decisions (from brainstorming)

- Voice brain = **custom LLM** (our RAG/KB), consistent with text chat.
- Live call appears in **playground + widget**.
- Keep the 🔊 read-aloud button on text replies; **remove** the click-to-record mic (the live call
  replaces it).
- Languages: **en, lt** (default en).

### Key constraint (documented, not a bug)

ElevenLabs calls our custom-LLM endpoint **server-to-server**, so live-call KB answers require the
app to be **publicly reachable** (`NEXT_PUBLIC_APP_URL` = a deployed URL or a tunnel). On plain
`localhost` the call connects and audio flows, but the agent cannot reach our LLM endpoint. Text
chat + read-aloud TTS + STT are unaffected and work locally.

---

## 2. ElevenLabs Agents integration (researched API)

- **Create agent:** `POST https://api.elevenlabs.io/v1/convai/agents/create` with
  `conversation_config`:
  ```jsonc
  {
    "agent": {
      "first_message": "<greeting>",
      "language": "en" | "lt",                 // used for ASR + TTS
      "prompt": {
        "prompt": "<system prompt + grounding + language instruction>",
        "llm": "custom-llm",
        "custom_llm": {
          "url": "<APP_URL>/api/llm/<publicKey>",
          "model_id": "<config.model>",
          "api_key": { "secret_id": "<workspace secret id>" },
          "api_type": "chat_completions"
        }
      }
    },
    "tts": { "voice_id": "<config.voice.voiceId>", "model_id": "eleven_turbo_v2_5" }
  }
  ```
  Returns `agent_id`.
- **Update agent:** `PATCH /v1/convai/agents/{agent_id}` with the same config (on config change).
- **Conversation token (WebRTC, for voice):**
  `GET /v1/convai/conversation/token?agent_id=<id>` (header `xi-api-key`) → `{ token }`. Minted
  server-side so the API key never reaches the browser.
- **Workspace secret** (for the custom-LLM Authorization): one shared secret holds our
  `CBZ_LLM_TOKEN`; created once via `POST /v1/convai/secrets`, its `secret_id` cached in a
  `platform_settings` table. Every agent references it.
- **Client SDK:** `@elevenlabs/react` `useConversation()` →
  `startSession({ conversationToken, connectionType: 'webrtc' })`.

### Custom-LLM callback — `POST /api/llm/[publicKey]`
OpenAI **chat/completions-compatible**, **SSE streaming** (`data: {json}\n\n` … `data: [DONE]`).
- Auth: `Authorization: Bearer <CBZ_LLM_TOKEN>`.
- Resolve bot by `publicKey` (service client). Take the last user message → `retrieveContext` over
  the bot's KB → prepend a system message (bot prompt + language + retrieved context) → call OpenAI
  `chat/completions` with `stream: true` and pipe the SSE response straight back (already in the
  required format).

### Agent lifecycle / sync
`bots` gains `elevenlabs_agent_id` and `elevenlabs_agent_hash`. `ensureAgent(bot)` computes a hash
of the sync-relevant config (greeting, language, voiceId, model, systemPrompt, publicKey, appUrl);
creates the agent if absent, PATCHes if the hash changed, and stores both. Token endpoints call
`ensureAgent` first.

---

## 3. Endpoints

- `POST /api/preview/voice-token` — authenticated (client owns bot). Body `{ botId }` →
  `ensureAgent` → conversation token. For the playground.
- `POST /api/widget/voice-token` — public. Body `{ publicKey }` + origin allowlist + rate limit →
  `ensureAgent` → conversation token. For the widget.
- `POST /api/llm/[publicKey]` — the custom-LLM callback (above).
- All voice endpoints 503 when `ELEVENLABS_API_KEY` is missing or the account lacks Agents.

---

## 4. Language

- `BotConfig.language: 'en' | 'lt'` (default `'en'`), added to `botConfigSchema` + types.
- **Text chat & custom LLM:** `buildMessages` appends a language instruction
  ("Respond only in English/Lithuanian.").
- **STT (Whisper):** pass the language hint to transcription.
- **TTS:** `eleven_turbo_v2_5` (multilingual; supports Lithuanian) for both per-message TTS and the
  agent.
- **Agent:** `conversation_config.agent.language` set accordingly.
- **Configurator:** a Language dropdown (English / Lithuanian) under AI behaviour.

---

## 5. UI

- **Configurator:** Language dropdown; Voice section unchanged otherwise.
- **TestChat (playground)** and **widget chat:** add a **"Start voice call"** button (phone icon)
  when `voice.enabled`. It fetches a conversation token, starts an ElevenLabs WebRTC session via
  `@elevenlabs/react`, shows live status (connecting / listening / speaking) and an "End call"
  control. Keep the 🔊 read-aloud button on text replies. **Remove** the click-to-record mic button.
- **Widget iframe:** `widget.js` adds `allow="microphone; autoplay"` so the call works embedded.

---

## 6. Error handling

- Missing `ELEVENLABS_API_KEY` / Agents not enabled → token endpoints 503; the call button shows
  "Voice calling unavailable" and hides gracefully; text + read-aloud keep working.
- Mic permission denied → friendly inline message; call ends cleanly.
- Agent create/update failure → surfaced as a non-blocking error; text chat unaffected.

## 7. Testing

- **Unit:** `agentConfigHash` (stable hash; changes when relevant fields change); `buildAgentConfig`
  (maps BotConfig → conversation_config incl. language, voiceId, custom_llm url); language
  instruction in `buildMessages`; `botConfigSchema` language default; custom-LLM auth guard.
- **Integration (gated live):** create→fetch-token→delete an ElevenLabs agent with the real key
  (gated `RUN_LIVE_AI=1`); custom-LLM endpoint returns valid OpenAI SSE for a direct call.
- E2E/manual: live call verified once deployed/tunneled (documented).

## 8. Build order

1. Migration: `bots.elevenlabs_agent_id/hash` + `platform_settings` table.
2. `BotConfig.language` (schema/types/buildMessages) + STT/TTS language wiring.
3. `lib/ai/elevenlabs-agent.ts`: buildAgentConfig, agentConfigHash, ensureSecret, ensureAgent,
   getConversationToken (TDD for pure parts).
4. `/api/llm/[publicKey]` custom-LLM callback (OpenAI-compatible SSE).
5. `/api/preview/voice-token` + `/api/widget/voice-token`.
6. Configurator Language dropdown.
7. Live-call UI in TestChat + widget (@elevenlabs/react); remove record-mic; iframe mic permission.
8. Tests + docs.
