# ChatbotZone — Cycle 2: Voice — Design Specification

**Date:** 2026-06-20
**Status:** Approved scope
**Depends on:** Cycle 1 (core vertical slice, merged to main)

---

## 1. Overview

Add voice to the chat widget: the bot can **speak** its replies (ElevenLabs text-to-speech) and
visitors can **speak** their questions (OpenAI Whisper speech-to-text). Voice is opt-in per bot and
off by default.

### Decisions (from brainstorming)

- **Both directions:** TTS (bot speaks) + STT (visitor speaks).
- **TTS trigger:** a play (speaker) button on each bot message — no autoplay.
- **Voice selection:** the client picks an ElevenLabs voice per bot from a list, with preview, in
  the configurator.
- **Cost control:** a per-bot voice on/off toggle (off by default) + rate-limited voice endpoints.
  TTS is keyed by message id (server fetches the message text) so visitors cannot synthesize
  arbitrary text.

### Non-goals (this cycle)

- Real-time/streaming duplex voice conversation; monthly usage caps/metering (toggle + rate limit
  only); voice in the owner/client admin UI beyond the configurator preview.

---

## 2. Configuration model

Extend `BotConfig` (Cycle 1) with a `voice` block:

```jsonc
"voice": {
  "enabled": false,           // master toggle; when false, no voice UI/endpoints for this bot
  "ttsEnabled": true,         // show play buttons on bot messages
  "sttEnabled": true,         // show mic button in the composer
  "voiceId": "21m00Tcm4TlvDq8ikWAM"  // ElevenLabs voice id
}
```

`botConfigSchema` gains this block with defaults (`enabled: false`). The public widget config
(`publicBotConfig`) exposes only `{ enabled, ttsEnabled, sttEnabled }` — never the raw `voiceId`
(TTS runs server-side).

## 3. Environment

- `ELEVENLABS_API_KEY` — **optional** server-only env var. When absent, voice endpoints return 503
  and the configurator shows voice as unavailable; the rest of the app is unaffected.
- STT reuses the existing `OPENAI_API_KEY` (Whisper).

## 4. Server modules & endpoints

### `lib/ai/tts.ts`
`synthesizeSpeech(text, voiceId, deps?): Promise<ArrayBuffer>` — calls the ElevenLabs
text-to-speech endpoint (`eleven_turbo_v2_5` model, mp3), injectable `fetch` for tests. Throws a
typed error if `ELEVENLABS_API_KEY` is missing.

### `lib/ai/stt.ts`
`transcribeAudio(audio: Blob|Buffer, deps?): Promise<string>` — calls OpenAI Whisper
(`whisper-1`) transcription via the AI SDK / OpenAI client, injectable for tests.

### `lib/ai/voices.ts`
`listVoices(deps?): Promise<{ id: string; name: string; previewUrl?: string }[]>` — lists
ElevenLabs voices for the configurator picker.

### `POST /api/tts` (public, widget)
Body `{ publicKey, conversationId, messageId }`. Gate: bot resolved by key, voice enabled,
origin allowlist, rate limit. Fetch the assistant message text (service client, scoped to the
bot's conversation), synthesize with the bot's `voiceId`, stream back `audio/mpeg`. Keying by
`messageId` prevents arbitrary-text synthesis abuse.

### `POST /api/stt` (public, widget)
`multipart/form-data` with `publicKey` + an `audio` file. Gate: key + voice/sttEnabled + origin +
rate limit + max audio size/duration. Transcribe with Whisper, return `{ text }`. The widget then
sends that text through the existing `/api/chat`.

### `GET /api/voices` (authenticated, client/owner)
Returns the ElevenLabs voice list for the configurator. 503 if `ELEVENLABS_API_KEY` is missing.

All public voice endpoints reuse `lib/widget-auth.ts` (`isOriginAllowed`, `corsHeaders`) and
`lib/ratelimit.ts`.

## 5. Widget changes (`app/embed/[publicKey]` + `components/widget/*`)

- **MessageList:** when `voice.enabled && voice.ttsEnabled`, render a speaker button on each
  assistant message → `POST /api/tts` → play the returned audio (`HTMLAudioElement` from a blob
  URL). Show a loading/playing state; one playback at a time.
- **Composer:** when `voice.enabled && voice.sttEnabled`, render a mic button → record via
  `MediaRecorder` → on stop, `POST /api/stt` → put the transcript in the input (visitor can edit or
  send). Handle mic permission denial gracefully.

## 6. Configurator changes (`components/client/ConfigForm.tsx`)

Add a **Voice** section: enable toggle, TTS toggle, STT toggle, and a voice picker populated from
`GET /api/voices` with a small "preview" play button per voice (uses the voice's `previewUrl`). If
`ELEVENLABS_API_KEY` is not configured, the section shows an "add ELEVENLABS_API_KEY to enable
voice" notice and disables the controls.

## 7. Error handling & reliability

- Missing `ELEVENLABS_API_KEY` → 503 from `/api/tts` and `/api/voices`; widget hides TTS buttons if
  config marks voice unavailable; STT still works (OpenAI).
- TTS/STT failures surface a non-blocking toast in the widget; text chat keeps working.
- Rate limit voice endpoints per `bot:visitor`. Cap STT upload size (e.g. ≤ 10 MB) and TTS text
  length (bounded by the stored message).
- Mic permission denied → friendly inline message, fall back to typing.

## 8. Testing

- **Unit (Vitest, mocked fetch/OpenAI):** `synthesizeSpeech` (request shape, missing-key error),
  `transcribeAudio` (returns text), `listVoices` (maps response), `botConfigSchema` voice defaults,
  `publicBotConfig` excludes `voiceId`.
- **Integration (gated, live keys):** a real ElevenLabs TTS call returns audio bytes; a real
  Whisper call transcribes a short clip. Gated behind `RUN_LIVE_AI=1` like the Cycle 1 RAG test.
- **E2E:** extend the widget flow to assert the speaker button appears when voice is enabled
  (mocking actual audio playback).

## 9. Build order

1. Config schema `voice` block + `publicBotConfig` exposure (TDD).
2. `lib/ai/tts.ts`, `lib/ai/stt.ts`, `lib/ai/voices.ts` (TDD, mocked).
3. `/api/tts`, `/api/stt`, `/api/voices` routes + env (optional `ELEVENLABS_API_KEY`).
4. Configurator Voice section + voice picker.
5. Widget TTS play buttons + STT mic capture.
6. Tests (unit + gated live) + docs update.
