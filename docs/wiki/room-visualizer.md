# Room visualizer ("See it in your room")

Furniture-store widget visitors select products from chat recommendation cards,
upload a room photo, and get a Gemini-rendered image of those products placed in
their room. Spec: `docs/superpowers/specs/2026-07-19-room-visualizer-design.md`.

## Flag flow

- `roomVisualizer: z.boolean().default(false)` in `botConfigFormSchema`
  (`lib/validation/schemas.ts:244`) → `BotConfig.roomVisualizer?`
  (`lib/types.ts:260`) → exposed as `PublicBotConfig.roomVisualizer`
  (`lib/widget-config.ts:270`).
- Configurator toggle lives in the Store section (`components/client/ConfigForm.tsx`,
  `CommerceSection`), rendered only when the page passes `showRoomVisualizer` —
  currently only the demo-bot editor (`app/(owner)/owner/demos/[botId]/configure/page.tsx`).
  ⚠️ The *rest* of CommerceSection is visible to clients — pre-existing gap,
  tracked separately.

## Demo-bots-only gate (pre-GA)

The feature is hidden from clients until GA. Server-enforced in two places,
both keyed on `organizations.is_demo` (the Loqara Demos org, `lib/demo-org.ts`):

- `app/api/widget-config/route.ts` forces `roomVisualizer: false` in the public
  config when the bot's org isn't the demo org.
- `app/api/widget/visualize/route.ts` returns 403 for non-demo orgs even if the
  bot's flag is set.

To GA the feature: delete both gates + the `showRoomVisualizer` prop plumbing.

## Widget UI

- Selection: `RoomSelect` prop threads from `ChatWindow` → `MessageList` →
  `ProductCards` (card + row toggle buttons). Tray holds up to 6 products
  (`MAX_ROOM_PRODUCTS`), but each render uses exactly ONE (studio single-select).
- `RoomTray` (above the composer, hidden while the product list overlay or lead
  form is open) opens `RoomStudio` — a z-30 `absolute inset-0` overlay like
  `ProductListView`. Upload downscales client-side (max 1536px JPEG 0.85,
  `downscaleImage`). Result is appended to the chat as a client-side-only
  message (`ChatMessage.image` — not persisted; gone on restart).
- Labels: `roomLabels(language)` en/lt map in `RoomVisualizer.tsx` — same
  pattern as `labelsFor` in `ProductCards.tsx`.

## Gotcha: invisible in the configurator preview

The preview transport (`components/client/TestChat.tsx`) deliberately omits
`transport.visualize` and hardcodes `roomVisualizer: false` in
`buildPreviewPublicConfig` — renders cost real money. The feature only shows in
the live embed. If a client asks "why can't I see it in Test chat", this is why.

## API — `POST /api/widget/visualize`

`app/api/widget/visualize/route.ts`. Check order: zod body → bot by public key
(active) → `config.roomVisualizer` (403) → org `is_demo` (403, pre-GA gate
above) → `isOriginAllowed` (403) → per-IP
rate limit (429) → conversation belongs to bot (404) → cap
`conversations.visualizer_renders >= 5` (429, migration
`20260719120000_room_visualizer.sql`) → room image jpeg/png/webp ≤ 8MB (400) →
products resolved from `product_embeddings` by `(bot_id, external_id)` — client
URLs never trusted; downloads go through `assertPublicUrl` (SSRF invariant),
10s timeout, ≤ 4MB (502) → Gemini render (502) → **cap slot consumed only after
success**. Read-then-increment race is accepted (`ponytail:` comment in route).

## Gemini module

`lib/room-visualizer.ts` — server-only (Node); never import from edge/prompt
paths. Model constant `gemini-3-pro-image-preview` ("Nano Banana Pro"; cost fallback noted inline).
Needs `GEMINI_API_KEY` (Google AI Studio) in env — also on Vercel. Prompt
numbers product images starting at 2 (image 1 = the room);
`titles.length === productImages.length` is the route's responsibility. Render
 aspect matches the room photo via `closestAspectRatio` + `imageConfig.aspectRatio`
 (client sends roomWidth/roomHeight).

## No storage

Room photos and renders travel as data URLs and are never persisted — the only
DB write is the `visualizer_renders` counter.

_Last verified: 2026-07-20._
