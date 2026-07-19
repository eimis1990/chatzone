# Room Visualizer — "See it in your room"

**Date:** 2026-07-19 · **Status:** approved

Furniture-store bots let widget visitors upload a photo of their room and see
selected products AI-composited into it, photorealistically. The conversation
stays primary: users select products from recommendation cards mid-chat and
generate at the end. Clothes try-on is a planned later reuse of the same shape.

## Decisions made during brainstorming

| Question | Decision |
|---|---|
| Placement tech | AI image editing (single model call), not canvas drag-drop |
| Flow | Chat-first: select products from cards → tray → one Generate with room photo |
| Gating | Per-bot config toggle + hard 5 renders/session cap, server-enforced |
| Model | Google Gemini image editing (new `GEMINI_API_KEY` env var), no provider abstraction |
| Storage | None — room photo and render are transient (base64/data URLs), nothing in Supabase |
| Iteration | "Regenerate with instruction" re-runs on the *original* room photo + full product set (no chained edits) |

## User flow

1. Owner/client enables **Room visualizer** in the bot configurator (new
   boolean in bot `config`, exposed to the widget via `publicBotConfig` in
   `lib/widget-config.ts` as `roomVisualizer: true`).
2. With the feature on, each product card (`components/widget/ProductCards.tsx`)
   shows an **"+ Add to room"** action. Selections accumulate in a compact
   **tray** pinned above the composer: thumbnails, remove buttons, and a
   "Visualize in your room" CTA. Selection is client state in `ChatWindow.tsx`
   only — not persisted, cleared on widget close.
3. CTA opens a near-fullscreen **studio overlay** inside the existing iframe
   (same pattern as the "see all products" view): room photo upload (file
   input, `accept="image/*" capture="environment"` so mobile offers camera),
   selected-product review, **Generate** button.
4. Generate POSTs to **`/api/widget/visualize`**. Response is the rendered
   image. Studio shows it with **Regenerate** (optional free-text instruction,
   e.g. "closer to the window"), **Download**, and the selected products with
   links. The render is also appended to the chat transcript as an assistant
   image message so it survives closing the studio.
5. Cap reached → CTA/Generate disabled with a friendly message; server rejects
   regardless of client state.

## API: `POST /api/widget/visualize`

Request: `{ publicKey, sessionId, roomImage (data URL), productIds[], instruction? }`

Server steps:
1. Resolve bot by public key; verify `roomVisualizer` enabled → else 403.
2. Origin allowlist check via existing `isOriginAllowed` (`lib/widget-auth.ts`).
3. Session cap: `visualizer_renders int default 0` column added to the
   existing `conversations` table (migration), incremented atomically per
   successful render; ≥5 → 429. (In-memory won't survive serverless.)
4. Validate room image: type (jpeg/png/webp), size cap (~8 MB), decode check.
5. Fetch product records server-side (never trust client for image URLs);
   download product images. Any external URL fetch goes through
   `assertPublicUrl` (SSRF guard — security invariant).
6. Call Gemini image editing with room photo + product images + fixed prompt:
   *"Place these exact products naturally into this room. Preserve each
   product's shape, materials, and colors exactly. Match the room's
   perspective, lighting, and shadows."* + optional user instruction
   (sanitized, length-capped).
7. Return `{ image (data URL), remaining (renders left) }`.

Errors surface in the studio as retryable messages; a failed Gemini call does
not consume a cap slot.

## New/changed code

- `lib/room-visualizer.ts` — Gemini call + prompt (server-only module; keep out
  of edge/prompt paths per the edge-isolation gotcha).
- `app/api/widget/visualize/route.ts` — the route above.
- `components/widget/RoomStudio.tsx` — studio overlay.
- `ChatWindow.tsx` — selection state, tray, studio mount, transcript append.
- `ProductCards.tsx` — "+ Add to room" action (only when feature enabled).
- Bot configurator — the toggle; `lib/widget-config.ts` — expose flag.
- Labels follow the existing `labelsFor(language)` en/lt pattern.

## Testing

- Unit: route rejects when toggle off / cap hit / bad image / foreign product
  IDs; prompt builder output. Gemini client mocked.
- Manual: end-to-end in widget preview with a real room photo and a real
  furniture bot's products.

## Out of scope (v1)

Drag positioning, chained scene edits, plan/entitlement gating, saved render
gallery, share links, proactive "try this feature" AI suggestion, clothes
try-on. Build happens on a git worktree branch, not main.
