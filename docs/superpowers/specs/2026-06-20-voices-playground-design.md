# ChatbotZone — Cycle 2.5: Curated Voices + Test Playground — Design Spec

**Date:** 2026-06-20
**Status:** Approved scope
**Depends on:** Cycle 2 (voice), merged to main

---

## 1. Overview

Two improvements before Billing:

1. **Owner-curated voices.** The owner maintains a small catalog of ElevenLabs voices (each tagged
   **male** or **female**). Clients pick from this curated list — grouped into **Men / Women** —
   instead of loading the entire ElevenLabs catalog (which is slow and overwhelming).
2. **Test playground.** The configurator's static preview becomes an interactive chat the client
   can actually talk to — using the **current (unsaved) form configuration** against the bot's
   knowledge base — with **text + voice (TTS/STT)** and a **Start over** button. Test chats are
   **ephemeral** (never logged to Conversations/Analytics).

---

## 2. Owner-curated voices

### Data
`platform_voices` table: `id`, `voice_id` (ElevenLabs, unique), `name`, `gender` (`male|female`),
`preview_url`, `sort_order` (int), `created_at`. RLS: owner full access; reads for the configurator
go through an authenticated API using the service client (no client-side select policy needed).

### Owner UI — `/owner/voices`
- Lists curated voices (name, gender, preview play button, delete).
- "Add voice" dialog: fetches the full ElevenLabs catalog via existing `GET /api/voices`
  (owner-only use now), lets the owner pick a voice, assign gender, preview, and save.

### Endpoints
- `POST /api/owner/voices` — owner-guarded. Body `{ voiceId, name, gender, previewUrl? }` → insert.
- `DELETE /api/owner/voices?id=...` — owner-guarded → delete.
- `GET /api/platform-voices` — authenticated (client/owner). Returns curated voices grouped:
  `{ male: VoiceOption[], female: VoiceOption[] }`.

### Configurator change
The voice picker reads `GET /api/platform-voices` and renders a `<select>` with two `<optgroup>`s
(Men / Women). If the curated list is empty, show: "No voices available — ask the platform owner to
add voices." (and, if `ELEVENLABS_API_KEY` is unset, the existing unavailable notice).

---

## 3. Test playground

Replaces the static `ChatPreview` in the configurator with an interactive **TestChat** that uses
the live form values (via React Hook Form `watch()`).

### Endpoints (all authenticated, client owns the bot; ephemeral — no persistence)
- `POST /api/preview/chat` — body `{ botId, config, history, message }`. Verifies ownership,
  retrieves context from the bot's KB (`retrieveContext(botId, …)` via service client), assembles
  the prompt with the **provided** `config` (so unsaved edits apply), and streams the answer. Weak
  retrieval → streams the provided `config.fallbackMessage`. Rate-limited per user.
- `POST /api/preview/tts` — body `{ text, voiceId }` → `audio/mpeg` (ElevenLabs). 503 if no key.
- `POST /api/preview/stt` — multipart `audio` → `{ text }` (Whisper). Size-capped.

These mirror the public widget endpoints but are gated by the authenticated session instead of a
bot public key (the client is testing their own bot).

### TestChat UI (`components/client/TestChat.tsx`)
- Shows the configured greeting as the first bot message and suggested questions as clickable chips.
- Sends turns to `/api/preview/chat` with the watched config + running history; streams replies.
- When `voice.enabled && voice.ttsEnabled`: a speaker button per bot reply → `/api/preview/tts`
  with the watched `voice.voiceId`.
- When `voice.enabled && voice.sttEnabled`: a mic button → record → `/api/preview/stt` → fill input.
- **Start over** button clears the in-browser message list (fresh test). No server state to reset.
- Reflects theme `primaryColor` and `displayName` live, like the old preview did.

---

## 4. Error handling

- `/api/platform-voices` returns `{ male: [], female: [] }` when none configured (picker shows the
  empty notice). Voice TTS/STT preview endpoints 503 when `ELEVENLABS_API_KEY` absent (TTS) and keep
  text chat working.
- Preview chat degrades to the provided fallback on weak retrieval or LLM error.
- Rate-limit preview endpoints per user to bound cost.

## 5. Testing

- **Unit:** `groupVoicesByGender` helper (maps curated rows → `{male, female}`); owner-voice Zod
  schema (gender enum); preview-chat request schema.
- **Integration (gated live):** existing voice round-trip still covers TTS/STT.
- Keep the full suite + typecheck + build green.

## 6. Build order

1. `platform_voices` migration + RLS (push).
2. Owner voice endpoints + `/api/platform-voices` + `groupVoicesByGender` helper (TDD).
3. Owner `/owner/voices` UI + nav link.
4. Configurator picker → curated grouped list.
5. Preview endpoints (`/api/preview/{chat,tts,stt}`).
6. `TestChat` playground component wired into the configurator (replaces static preview).
7. Tests + docs.
