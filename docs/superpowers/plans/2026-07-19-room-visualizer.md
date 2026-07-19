# Room Visualizer Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.
>
> **Worktree:** Execute on an isolated worktree (superpowers:using-git-worktrees), branch `room-visualizer`. Do not touch `main`.

**Goal:** Furniture-store widget visitors select products from chat recommendation cards, upload a room photo in a fullscreen studio overlay, and get an AI render of those products placed in their room.

**Architecture:** A per-bot config flag flows through `publicBotConfig` to the widget. Product cards gain an "Add to room" action feeding client-side selection state in ChatWindow; a tray above the composer opens a fullscreen `RoomStudio` overlay (same pattern as `ProductListView`). Generate calls a new public route `POST /api/widget/visualize`, which validates bot/origin/cap, resolves product images server-side from `product_embeddings`, and calls Gemini image editing via `lib/room-visualizer.ts`. Nothing is stored: room photo and render travel as data URLs; the render cap is a counter column on `conversations`.

**Tech Stack:** Next.js App Router route handlers, Supabase (service client), `@google/genai` (new dep), zod, vitest, framer-motion (existing).

**Spec:** `docs/superpowers/specs/2026-07-19-room-visualizer-design.md`

## Global Constraints

- Only new dependency allowed: `@google/genai`. New env var: `GEMINI_API_KEY`.
- `lib/room-visualizer.ts` is server-only (Node). Never import it from edge routes or anything reachable from the prompt/edge path (see `docs/wiki/gotchas.md` — edge isolation; commit b28eb16).
- Widget UI labels must support `en` and `lt` (same pattern as `labelsFor` in `components/widget/ProductCards.tsx:32`).
- Server fetches of catalog URLs must go through `assertPublicUrl` (`lib/net/ssrf.ts:55`) — security invariant.
- Never trust client-supplied image URLs for products; resolve from `product_embeddings` by `(bot_id, external_id)`.
- Cap: max **5** renders per conversation, max **4** products per render, room image ≤ **8 MB** (jpeg/png/webp), instruction ≤ **200 chars**.
- A failed Gemini call must NOT consume a cap slot.
- Tests run with `npm test` (vitest; `NODE_OPTIONS=--experimental-require-module`). Filter a file: `npm test -- tests/unit/<file>.test.ts`.
- This Next.js version differs from training data — check `node_modules/next/dist/docs/` if any route-handler API looks off.

---

### Task 1: Config flag + render-cap migration

**Files:**
- Modify: `lib/validation/schemas.ts` (botConfigSchema — booleans live alongside e.g. `launcherPulse` at :146)
- Modify: `lib/types.ts` (`interface BotConfig`, ~:167)
- Modify: `lib/widget-config.ts` (`interface PublicBotConfig` :67, `publicBotConfig()` :157)
- Create: `supabase/migrations/20260719120000_room_visualizer.sql`
- Test: `tests/unit/room-visualizer-config.test.ts`

**Interfaces:**
- Produces: `BotConfig.roomVisualizer?: boolean` (zod default `false`), `PublicBotConfig.roomVisualizer: boolean`, `conversations.visualizer_renders int not null default 0`.

- [ ] **Step 1: Write the failing test**

```ts
// tests/unit/room-visualizer-config.test.ts
import { describe, it, expect } from 'vitest'
import { botConfigSchema } from '@/lib/validation/schemas'
import { publicBotConfig } from '@/lib/widget-config'

// Minimal valid config, mirroring tests/unit/quick-actions.test.ts baseConfig.
function baseConfig(overrides: Record<string, unknown> = {}) {
  return botConfigSchema.parse({
    displayName: 'Bot',
    greeting: 'Hi',
    systemPrompt: 'You are helpful.',
    ...overrides,
  })
}

describe('roomVisualizer config flag', () => {
  it('defaults to false', () => {
    expect(baseConfig().roomVisualizer).toBe(false)
    expect(publicBotConfig(baseConfig()).roomVisualizer).toBe(false)
  })

  it('is exposed publicly when enabled', () => {
    const cfg = baseConfig({ roomVisualizer: true })
    expect(publicBotConfig(cfg).roomVisualizer).toBe(true)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- tests/unit/room-visualizer-config.test.ts`
Expected: FAIL — `roomVisualizer` unknown on schema output / missing from PublicBotConfig.

- [ ] **Step 3: Implement**

In `lib/validation/schemas.ts`, inside `botConfigSchema` next to the other top-level booleans:

```ts
  /** "See it in your room" AI visualizer (furniture stores). */
  roomVisualizer: z.boolean().default(false),
```

Also check `botConfigFormSchema` in the same file — if it lists fields explicitly (rather than deriving), add the same line there.

In `lib/types.ts` `interface BotConfig`:

```ts
  /** "See it in your room" AI product visualizer (furniture stores). */
  roomVisualizer?: boolean
```

In `lib/widget-config.ts`: add to `interface PublicBotConfig`:

```ts
  /** Widget offers the "see it in your room" product visualizer. */
  roomVisualizer: boolean
```

and in the object returned by `publicBotConfig()`:

```ts
    roomVisualizer: config.roomVisualizer ?? false,
```

Create `supabase/migrations/20260719120000_room_visualizer.sql`:

```sql
-- Room visualizer: hard per-conversation cap on AI renders (server-enforced).
alter table public.conversations
  add column visualizer_renders int not null default 0;
```

- [ ] **Step 4: Run tests**

Run: `npm test -- tests/unit/room-visualizer-config.test.ts` → PASS.
Run full suite: `npm test` → no regressions (botConfig.test.ts, quick-actions.test.ts still green).

- [ ] **Step 5: Apply the migration to the local/dev database**

Run: `npx supabase db push` (or the project's usual migration command — check `package.json` scripts / `docs/wiki/conventions.md`; if unclear, note it for the manual-verification task rather than guessing).

- [ ] **Step 6: Commit**

```bash
git add lib/validation/schemas.ts lib/types.ts lib/widget-config.ts supabase/migrations/20260719120000_room_visualizer.sql tests/unit/room-visualizer-config.test.ts
git commit -m "feat(visualizer): roomVisualizer config flag + render-cap column"
```

---

### Task 2: Gemini render module (`lib/room-visualizer.ts`)

**Files:**
- Create: `lib/room-visualizer.ts`
- Modify: `package.json` (add `@google/genai`), `.env.example` (add `GEMINI_API_KEY=`)
- Test: `tests/unit/room-visualizer.test.ts`

**Interfaces:**
- Produces (consumed by Task 3's route):

```ts
export interface InlineImage { data: string; mimeType: string }   // data = raw base64, no data: prefix
export function sanitizeInstruction(raw: string | undefined): string       // collapse whitespace, trim, cap 200 chars, '' when absent
export function parseImageDataUrl(dataUrl: string): InlineImage | null     // null unless jpeg/png/webp and ≤ 8MB decoded
export function buildVisualizePrompt(titles: string[], instruction: string): string
export async function renderRoomScene(args: {
  roomImage: InlineImage
  productImages: InlineImage[]
  titles: string[]
  instruction: string
}): Promise<InlineImage>                                                    // throws on API failure / no image in response
```

- [ ] **Step 1: Install the SDK**

Run: `npm install @google/genai`
Expected: added to `dependencies` in package.json.

- [ ] **Step 2: Write the failing test** (pure helpers only — the Gemini call itself is not unit-tested; the route test mocks this module)

```ts
// tests/unit/room-visualizer.test.ts
import { describe, it, expect } from 'vitest'
import {
  sanitizeInstruction,
  parseImageDataUrl,
  buildVisualizePrompt,
} from '@/lib/room-visualizer'

describe('sanitizeInstruction', () => {
  it('collapses whitespace and caps length', () => {
    expect(sanitizeInstruction('  near\nthe   window  ')).toBe('near the window')
    expect(sanitizeInstruction('x'.repeat(500))).toHaveLength(200)
    expect(sanitizeInstruction(undefined)).toBe('')
  })
})

describe('parseImageDataUrl', () => {
  const px = // 1x1 transparent PNG
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg=='

  it('parses a valid png data URL', () => {
    const img = parseImageDataUrl(`data:image/png;base64,${px}`)
    expect(img).toEqual({ mimeType: 'image/png', data: px })
  })

  it('rejects non-image mimes, malformed strings and oversize payloads', () => {
    expect(parseImageDataUrl(`data:text/html;base64,${px}`)).toBeNull()
    expect(parseImageDataUrl('not-a-data-url')).toBeNull()
    const big = 'A'.repeat(11.5 * 1024 * 1024) // ~8.6MB decoded > 8MB cap
    expect(parseImageDataUrl(`data:image/jpeg;base64,${big}`)).toBeNull()
  })
})

describe('buildVisualizePrompt', () => {
  it('names every product and keeps fidelity wording', () => {
    const p = buildVisualizePrompt(['Oak Sofa', 'Linen Chair'], 'by the window')
    expect(p).toContain('Oak Sofa')
    expect(p).toContain('Linen Chair')
    expect(p).toMatch(/preserve/i)
    expect(p).toContain('by the window')
  })
})
```

- [ ] **Step 3: Run test to verify it fails**

Run: `npm test -- tests/unit/room-visualizer.test.ts`
Expected: FAIL — module does not exist.

- [ ] **Step 4: Implement `lib/room-visualizer.ts`**

```ts
/**
 * Room visualizer — Gemini image editing that places selected store products
 * into a visitor's room photo. Server-only (Node): never import from edge
 * routes or the prompt path.
 */
import { GoogleGenAI } from '@google/genai'

export interface InlineImage {
  /** Raw base64 payload (no `data:` prefix). */
  data: string
  mimeType: string
}

const ALLOWED_MIMES = new Set(['image/jpeg', 'image/png', 'image/webp'])
const MAX_IMAGE_BYTES = 8 * 1024 * 1024
const MAX_INSTRUCTION_CHARS = 200

// ponytail: GA "nano banana" tier — cheap and best-in-class at multi-image
// compositing. Bump to a newer image model here if quality disappoints.
const MODEL = 'gemini-2.5-flash-image'

export function sanitizeInstruction(raw: string | undefined): string {
  if (!raw) return ''
  return raw.replace(/\s+/g, ' ').trim().slice(0, MAX_INSTRUCTION_CHARS)
}

export function parseImageDataUrl(dataUrl: string): InlineImage | null {
  const m = /^data:([a-z]+\/[a-z0-9.+-]+);base64,([A-Za-z0-9+/=]+)$/.exec(dataUrl)
  if (!m) return null
  const [, mimeType, data] = m
  if (!ALLOWED_MIMES.has(mimeType)) return null
  // base64 → bytes: 3/4 ratio is close enough for a size cap.
  if (data.length * 0.75 > MAX_IMAGE_BYTES) return null
  return { mimeType, data }
}

export function buildVisualizePrompt(titles: string[], instruction: string): string {
  const list = titles.map((t, i) => `${i + 2}. ${t}`).join('\n')
  return [
    'The first image is a photo of a room. Each following image is a furniture',
    'or home product, in this order:',
    list,
    'Edit the room photo so these exact products are placed naturally in the',
    'room. Preserve each product’s shape, materials, colors and proportions',
    'exactly as shown in its image. Match the room’s perspective, lighting and',
    'shadows. Do not change the room itself beyond adding the products.',
    instruction ? `Placement request from the customer: ${instruction}` : '',
    'Return only the edited room image.',
  ]
    .filter(Boolean)
    .join('\n')
}

export async function renderRoomScene(args: {
  roomImage: InlineImage
  productImages: InlineImage[]
  titles: string[]
  instruction: string
}): Promise<InlineImage> {
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) throw new Error('GEMINI_API_KEY is not configured')
  const ai = new GoogleGenAI({ apiKey })

  const parts = [
    { text: buildVisualizePrompt(args.titles, args.instruction) },
    { inlineData: { mimeType: args.roomImage.mimeType, data: args.roomImage.data } },
    ...args.productImages.map((img) => ({
      inlineData: { mimeType: img.mimeType, data: img.data },
    })),
  ]

  const response = await ai.models.generateContent({
    model: MODEL,
    contents: [{ role: 'user', parts }],
    config: { responseModalities: ['TEXT', 'IMAGE'] },
  })

  const out = response.candidates?.[0]?.content?.parts?.find((p) => p.inlineData?.data)
  if (!out?.inlineData?.data) throw new Error('Gemini returned no image')
  return { data: out.inlineData.data, mimeType: out.inlineData.mimeType ?? 'image/png' }
}
```

Note for the implementer: verify the installed `@google/genai` version still exposes `ai.models.generateContent` with `config.responseModalities` (it may also offer a newer `ai.interactions.create` API — either is fine as long as the exported signature above is unchanged). Check `node_modules/@google/genai/README.md` if types don't match.

Add to `.env.example`:

```
GEMINI_API_KEY=
```

- [ ] **Step 5: Run tests**

Run: `npm test -- tests/unit/room-visualizer.test.ts` → PASS.

- [ ] **Step 6: Commit**

```bash
git add lib/room-visualizer.ts tests/unit/room-visualizer.test.ts package.json package-lock.json .env.example
git commit -m "feat(visualizer): Gemini room-render module"
```

---

### Task 3: API route `POST /api/widget/visualize`

**Files:**
- Create: `app/api/widget/visualize/route.ts`
- Test: `tests/unit/visualize-route.test.ts`

**Interfaces:**
- Consumes: `renderRoomScene`, `parseImageDataUrl`, `sanitizeInstruction` (Task 2); `visualizer_renders` column (Task 1).
- Produces: `POST /api/widget/visualize` accepting `{ publicKey, conversationId, roomImage, productIds[], instruction? }`, returning `200 {'image': dataUrl, 'remaining': n}` or `{ error }` with status 400/403/404/429/502. Consumed by Task 4's transport method.

- [ ] **Step 1: Write the failing test**

```ts
// tests/unit/visualize-route.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest'

// --- mocks (declared before importing the route) ---------------------------
const single = vi.fn()
const convSingle = vi.fn()
const inFn = vi.fn()
const updateEq2 = vi.fn()

vi.mock('@/lib/supabase/service', () => ({
  createServiceClient: () => ({
    from: (table: string) => {
      if (table === 'bots')
        return { select: () => ({ eq: () => ({ single } as any) }) }
      if (table === 'conversations')
        return {
          select: () => ({ eq: () => ({ eq: () => ({ single: convSingle }) }) }),
          update: () => ({ eq: () => ({ eq: updateEq2 }) }),
        }
      if (table === 'product_embeddings')
        return { select: () => ({ eq: () => ({ in: inFn }) }) }
      throw new Error(`unexpected table ${table}`)
    },
  }),
}))

const renderRoomScene = vi.fn()
vi.mock('@/lib/room-visualizer', async (importOriginal) => ({
  ...(await importOriginal<object>()),
  renderRoomScene: (...a: unknown[]) => renderRoomScene(...a),
}))

vi.mock('@/lib/net/ssrf', () => ({
  assertPublicUrl: async (u: string) => new URL(u),
}))

import { POST } from '@/app/api/widget/visualize/route'

// --- fixtures ---------------------------------------------------------------
const PX =
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg=='
const CONV = '11111111-2222-3333-4444-555555555555'

function bot(overrides: Record<string, unknown> = {}) {
  return {
    id: 'bot-1',
    status: 'active',
    config: { allowedDomains: [], roomVisualizer: true, ...overrides },
  }
}

function req(body: Record<string, unknown>) {
  return new Request('http://localhost/api/widget/visualize', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      publicKey: 'pk',
      conversationId: CONV,
      roomImage: `data:image/png;base64,${PX}`,
      productIds: ['p1'],
      ...body,
    }),
  })
}

beforeEach(() => {
  vi.clearAllMocks()
  single.mockResolvedValue({ data: bot() })
  convSingle.mockResolvedValue({ data: { id: CONV, visualizer_renders: 0 } })
  inFn.mockResolvedValue({
    data: [{ external_id: 'p1', title: 'Oak Sofa', image_url: 'https://store.example/sofa.jpg' }],
  })
  updateEq2.mockResolvedValue({ error: null })
  renderRoomScene.mockResolvedValue({ data: PX, mimeType: 'image/png' })
  // Product image download.
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue(
    new Response(Buffer.from(PX, 'base64'), { headers: { 'Content-Type': 'image/jpeg' } }),
  ))
})

describe('POST /api/widget/visualize', () => {
  it('403 when the bot has the feature off', async () => {
    single.mockResolvedValue({ data: bot({ roomVisualizer: false }) })
    expect((await POST(req({}))).status).toBe(403)
  })

  it('429 when the conversation hit the render cap', async () => {
    convSingle.mockResolvedValue({ data: { id: CONV, visualizer_renders: 5 } })
    expect((await POST(req({}))).status).toBe(429)
  })

  it('400 on a non-image room upload', async () => {
    expect((await POST(req({ roomImage: `data:text/html;base64,${PX}` }))).status).toBe(400)
  })

  it("400 when a product id isn't in this bot's index", async () => {
    inFn.mockResolvedValue({ data: [] })
    expect((await POST(req({}))).status).toBe(400)
  })

  it('returns the render and remaining count, and consumes a slot', async () => {
    const res = await POST(req({}))
    expect(res.status).toBe(200)
    const body = (await res.json()) as { image: string; remaining: number }
    expect(body.image).toBe(`data:image/png;base64,${PX}`)
    expect(body.remaining).toBe(4)
    expect(updateEq2).toHaveBeenCalled()
  })

  it('502 on a Gemini failure without consuming a slot', async () => {
    renderRoomScene.mockRejectedValue(new Error('boom'))
    expect((await POST(req({}))).status).toBe(502)
    expect(updateEq2).not.toHaveBeenCalled()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- tests/unit/visualize-route.test.ts`
Expected: FAIL — route module does not exist.

- [ ] **Step 3: Implement the route** (template: `app/api/widget/search/route.ts`)

```ts
// app/api/widget/visualize/route.ts
import { z } from 'zod'
import { createServiceClient } from '@/lib/supabase/service'
import { isOriginAllowed, corsHeaders } from '@/lib/widget-auth'
import { createRateLimiter } from '@/lib/ratelimit'
import { assertPublicUrl } from '@/lib/net/ssrf'
import {
  parseImageDataUrl,
  sanitizeInstruction,
  renderRoomScene,
  type InlineImage,
} from '@/lib/room-visualizer'
import type { Bot } from '@/lib/types'

export const maxDuration = 60 // image generation is slow

const RENDER_CAP = 5
const MAX_PRODUCTS = 4
const MAX_PRODUCT_IMAGE_BYTES = 4 * 1024 * 1024

const limiter = createRateLimiter({ capacity: 5, refillPerSec: 0.1 })

const bodySchema = z.object({
  publicKey: z.string().min(1),
  conversationId: z.string().uuid(),
  roomImage: z.string().min(1).max(12 * 1024 * 1024),
  productIds: z.array(z.string().min(1)).min(1).max(MAX_PRODUCTS),
  instruction: z.string().max(500).optional(),
})

export async function OPTIONS(req: Request) {
  return new Response(null, { status: 204, headers: corsHeaders(req.headers.get('origin')) })
}

export async function POST(req: Request) {
  const origin = req.headers.get('origin')
  const cors = corsHeaders(origin)
  const json = (b: unknown, status = 200) =>
    new Response(JSON.stringify(b), { status, headers: { ...cors, 'Content-Type': 'application/json' } })

  const parsed = bodySchema.safeParse(await req.json().catch(() => null))
  if (!parsed.success) return json({ error: 'Invalid request.' }, 400)
  const { publicKey, conversationId, roomImage, productIds, instruction } = parsed.data

  const svc = createServiceClient()
  const { data: bot } = await svc.from('bots').select('*').eq('public_key', publicKey).single<Bot>()
  if (!bot || bot.status !== 'active') return json({ error: 'Bot not available.' }, 404)
  if (!bot.config.roomVisualizer) return json({ error: 'Not enabled.' }, 403)
  if (!isOriginAllowed(origin, bot.config.allowedDomains ?? [])) {
    return json({ error: 'Origin not allowed.' }, 403)
  }
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown'
  if (!limiter.check(`${bot.id}:${ip}`)) return json({ error: 'Too many requests.' }, 429)

  // Render cap — the conversation must belong to this bot.
  const { data: conv } = await svc
    .from('conversations')
    .select('id, visualizer_renders')
    .eq('id', conversationId)
    .eq('bot_id', bot.id)
    .single<{ id: string; visualizer_renders: number }>()
  if (!conv) return json({ error: 'Conversation not found.' }, 404)
  if (conv.visualizer_renders >= RENDER_CAP) return json({ error: 'Render limit reached.' }, 429)

  const room = parseImageDataUrl(roomImage)
  if (!room) return json({ error: 'Room photo must be a JPEG, PNG or WebP under 8 MB.' }, 400)

  // Resolve products server-side — never trust client image URLs.
  const { data: rows } = await svc
    .from('product_embeddings')
    .select('external_id, title, image_url')
    .eq('bot_id', bot.id)
    .in('external_id', productIds)
  const byId = new Map((rows ?? []).map((r) => [r.external_id, r]))
  const products = productIds.map((id) => byId.get(id))
  if (products.some((p) => !p?.image_url)) {
    return json({ error: 'Some selected products are unavailable.' }, 400)
  }

  let productImages: InlineImage[]
  try {
    productImages = await Promise.all(
      products.map(async (p) => {
        const url = await assertPublicUrl(p!.image_url!)
        const res = await fetch(url, { signal: AbortSignal.timeout(10_000) })
        const mime = res.headers.get('content-type')?.split(';')[0] ?? ''
        if (!res.ok || !mime.startsWith('image/')) throw new Error(`bad product image: ${url}`)
        const buf = await res.arrayBuffer()
        if (buf.byteLength > MAX_PRODUCT_IMAGE_BYTES) throw new Error('product image too large')
        return { data: Buffer.from(buf).toString('base64'), mimeType: mime }
      }),
    )
  } catch (err) {
    console.error('[visualizer] product image fetch failed:', err)
    return json({ error: 'Could not load the product images.' }, 502)
  }

  let rendered: InlineImage
  try {
    rendered = await renderRoomScene({
      roomImage: room,
      productImages,
      titles: products.map((p) => p!.title),
      instruction: sanitizeInstruction(instruction),
    })
  } catch (err) {
    console.error('[visualizer] render failed:', err)
    return json({ error: 'The visualization failed — please try again.' }, 502)
  }

  // Consume a slot only after success. ponytail: read-then-write race can
  // overshoot the cap by a concurrent request or two — acceptable; switch to a
  // SQL increment RPC if abuse shows up.
  await svc
    .from('conversations')
    .update({ visualizer_renders: conv.visualizer_renders + 1 })
    .eq('id', conv.id)
    .eq('bot_id', bot.id)

  return json({
    image: `data:${rendered.mimeType};base64,${rendered.data}`,
    remaining: RENDER_CAP - conv.visualizer_renders - 1,
  })
}
```

Adjust the test's supabase mock if the real chained call shapes differ (e.g. `.single()` placement) — the mock must mirror the code, not the other way around.

- [ ] **Step 4: Run tests**

Run: `npm test -- tests/unit/visualize-route.test.ts` → PASS. Then `npm test` → full suite green.

- [ ] **Step 5: Commit**

```bash
git add app/api/widget/visualize/route.ts tests/unit/visualize-route.test.ts
git commit -m "feat(visualizer): public render endpoint with cap + SSRF-guarded product images"
```

---

### Task 4: Transport method + product-card selection + tray

**Files:**
- Modify: `lib/widget-transport.ts` (interface :38, `createWidgetTransport` :79)
- Modify: `components/widget/ProductCards.tsx` (props :8, card component :184)
- Modify: `components/widget/MessageList.tsx` (props ~:45, ProductCards call site ~:233)
- Create: `components/widget/RoomVisualizer.tsx` (labels + `RoomTray`; the studio overlay itself is Task 5)
- Modify: `components/widget/ChatWindow.tsx` (selection state near `listProducts` :197, tray render above the composer)

**Interfaces:**
- Consumes: `POST /api/widget/visualize` (Task 3), `PublicBotConfig.roomVisualizer` (Task 1).
- Produces:
  - `ChatTransport.visualize?(params: { conversationId: string; roomImage: string; productIds: string[]; instruction?: string }): Promise<{ image?: string; remaining?: number; error?: string }>`
  - `ProductCardsProps.roomSelect?: RoomSelect` where `RoomSelect = { selectedIds: string[]; full: boolean; onToggle: (p: CommerceProduct) => void; addLabel: string; addedLabel: string }` (exported from `RoomVisualizer.tsx`)
  - `roomLabels(language: 'en' | 'lt')` and `<RoomTray products selection onRemove onOpen primaryColor language />` (exported from `RoomVisualizer.tsx`)
  - ChatWindow state `roomSelection: CommerceProduct[]` + `studioOpen: boolean` (consumed by Task 5).

No new unit test in this task — it's UI wiring; behavior is covered by Task 5's manual verification. Keep the existing suite green.

- [ ] **Step 1: Transport.** In `lib/widget-transport.ts` add to `interface ChatTransport` (after `transcribe?`):

```ts
  /**
   * Room visualizer: render selected products into the visitor's room photo.
   * Optional — the configurator preview omits it (renders cost real money),
   * so the feature is live-embed only.
   */
  visualize?(params: {
    conversationId: string
    roomImage: string
    productIds: string[]
    instruction?: string
  }): Promise<{ image?: string; remaining?: number; error?: string }>
```

and to `createWidgetTransport` (after `transcribe`):

```ts
    async visualize(params) {
      const res = await fetch('/api/widget/visualize', {
        method: 'POST',
        headers: JSON_HEADERS,
        body: JSON.stringify({ publicKey, ...params }),
      })
      const data = (await res.json().catch(() => ({}))) as {
        image?: string
        remaining?: number
        error?: string
      }
      if (!res.ok) return { error: data.error ?? 'The visualization failed.', ...( res.status === 429 ? { remaining: 0 } : {}) }
      return data
    },
```

- [ ] **Step 2: Create `components/widget/RoomVisualizer.tsx`** with labels, the `RoomSelect` type, and the tray (studio added in Task 5):

```tsx
'use client'

import type { CommerceProduct } from '@/lib/commerce/types'
import { readableTextColor } from '@/lib/utils'

/** Selection plumbing passed down to product cards. */
export interface RoomSelect {
  selectedIds: string[]
  /** Selection is at MAX_ROOM_PRODUCTS — unselected cards disable their button. */
  full: boolean
  onToggle: (product: CommerceProduct) => void
  addLabel: string
  addedLabel: string
}

export const MAX_ROOM_PRODUCTS = 4

export interface RoomLabels {
  addToRoom: string
  added: string
  trayCta: string
  trayTitle: string
  uploadTitle: string
  uploadHint: string
  generate: string
  generating: string
  regenerate: string
  instructionPlaceholder: string
  download: string
  back: string
  remaining: (n: number) => string
  limitReached: string
  genericError: string
  resultNote: string
}

export function roomLabels(language: 'en' | 'lt'): RoomLabels {
  return language === 'lt'
    ? {
        addToRoom: '+ Į kambarį',
        added: '✓ Pridėta',
        trayCta: 'Vizualizuoti mano kambaryje',
        trayTitle: 'Jūsų kambarys',
        uploadTitle: 'Įkelkite savo kambario nuotrauką',
        uploadHint: 'JPG, PNG arba WebP — geriausiai tinka šviesi, aiški nuotrauka.',
        generate: 'Generuoti',
        generating: 'Generuojama…',
        regenerate: 'Generuoti iš naujo',
        instructionPlaceholder: 'Pvz.: „pastatykite prie lango“ (nebūtina)',
        download: 'Atsisiųsti',
        back: 'Atgal',
        remaining: (n) => `Liko bandymų: ${n}`,
        limitReached: 'Pasiektas vizualizacijų limitas šiam pokalbiui.',
        genericError: 'Nepavyko sugeneruoti — bandykite dar kartą.',
        resultNote: 'Štai kaip atrodytų jūsų kambaryje 🛋️',
      }
    : {
        addToRoom: '+ Add to room',
        added: '✓ Added',
        trayCta: 'Visualize in your room',
        trayTitle: 'Your room',
        uploadTitle: 'Upload a photo of your room',
        uploadHint: 'JPG, PNG or WebP — a bright, straight-on photo works best.',
        generate: 'Generate',
        generating: 'Generating…',
        regenerate: 'Regenerate',
        instructionPlaceholder: 'e.g. "place it by the window" (optional)',
        download: 'Download',
        back: 'Back',
        remaining: (n) => `${n} renders left`,
        limitReached: 'Visualization limit reached for this conversation.',
        genericError: 'Generation failed — please try again.',
        resultNote: 'Here is how it could look in your room 🛋️',
      }
}

interface RoomTrayProps {
  products: CommerceProduct[]
  primaryColor: string
  language: 'en' | 'lt'
  onRemove: (id: string) => void
  onOpen: () => void
}

/** Compact selected-products strip pinned above the composer. */
export function RoomTray({ products, primaryColor, language, onRemove, onOpen }: RoomTrayProps) {
  if (products.length === 0) return null
  const labels = roomLabels(language)
  return (
    <div className="mx-3 mb-2 flex items-center gap-2 rounded-xl border bg-white p-2 shadow-sm">
      <div className="flex -space-x-2">
        {products.map((p) => (
          <button
            key={p.id}
            type="button"
            onClick={() => onRemove(p.id)}
            title={`${p.title} ✕`}
            className="relative size-9 shrink-0 overflow-hidden rounded-lg border-2 border-white bg-muted outline-none focus-visible:ring-2"
          >
            {p.imageUrl ? (
              <img src={p.imageUrl} alt={p.title} className="h-full w-full object-cover" />
            ) : (
              <span className="text-[10px]">🛋️</span>
            )}
          </button>
        ))}
      </div>
      <button
        type="button"
        onClick={onOpen}
        className="ml-auto rounded-lg px-3 py-2 text-xs font-semibold transition-opacity hover:opacity-85 outline-none focus-visible:ring-2"
        style={{ backgroundColor: primaryColor, color: readableTextColor(primaryColor) }}
      >
        {labels.trayCta} ({products.length})
      </button>
    </div>
  )
}
```

- [ ] **Step 3: Product cards.** In `components/widget/ProductCards.tsx`:
  - Add `roomSelect?: RoomSelect` (import type from `./RoomVisualizer`) to `ProductCardsProps` and pass it through to each `<ProductCard>`.
  - In `ProductCard`, under the existing "View more" link, render the toggle when `roomSelect` is set:

```tsx
{roomSelect && (() => {
  const selected = roomSelect.selectedIds.includes(product.id)
  const disabled = !selected && roomSelect.full
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={() => roomSelect.onToggle(product)}
      className="flex items-center justify-center border text-xs font-medium py-1.5 px-2 transition-colors hover:bg-gray-50 disabled:opacity-40 outline-none focus-visible:ring-2"
      style={{ borderRadius: `${Math.min(cardRadius, 12)}px` }}
      aria-pressed={selected}
    >
      {selected ? roomSelect.addedLabel : roomSelect.addLabel}
    </button>
  )
})()}
```

  - Same treatment in `ProductRow` (the "see all" list), placed beside the description toggle.

- [ ] **Step 4: MessageList pass-through.** Add `roomSelect?: RoomSelect` to `MessageListProps` and pass it to the `<ProductCards>` call (~:233).

- [ ] **Step 5: ChatWindow wiring.** In `components/widget/ChatWindow.tsx`:
  - State, next to `listProducts` (:197):

```tsx
// Room visualizer: products picked from cards, and the studio overlay.
const [roomSelection, setRoomSelection] = useState<CommerceProduct[]>([])
const [studioOpen, setStudioOpen] = useState(false)
const roomEnabled = config.roomVisualizer && Boolean(transport.visualize) && Boolean(conversationId)
```

  Note: `roomEnabled` for the *tray/cards* should not require `conversationId` (cards appear in the same turn that creates the conversation) — gate only the Generate call on it. Use `config.roomVisualizer && Boolean(transport.visualize)` for showing selection UI.

  - Handlers:

```tsx
const toggleRoomProduct = useCallback((p: CommerceProduct) => {
  setRoomSelection((prev) =>
    prev.some((x) => x.id === p.id)
      ? prev.filter((x) => x.id !== p.id)
      : prev.length >= MAX_ROOM_PRODUCTS
        ? prev
        : [...prev, p],
  )
}, [])
```

  - Build `roomSelect` and pass to `<MessageList roomSelect={...}>` only when the feature is on:

```tsx
const roomSelect: RoomSelect | undefined =
  config.roomVisualizer && transport.visualize
    ? {
        selectedIds: roomSelection.map((p) => p.id),
        full: roomSelection.length >= MAX_ROOM_PRODUCTS,
        onToggle: toggleRoomProduct,
        addLabel: roomLabels(activeLang as 'en' | 'lt').addToRoom,
        addedLabel: roomLabels(activeLang as 'en' | 'lt').added,
      }
    : undefined
```

  (If `activeLang` is a wider `BotLanguage` union, narrow the same way the existing `labelsFor` call sites do — find how `<ProductCards language=…>` is fed and copy it.)
  - Render `<RoomTray>` directly above the composer, hidden while `listProducts` overlay or lead form is open:

```tsx
{roomSelect && !listProducts && (
  <RoomTray
    products={roomSelection}
    primaryColor={config.primaryColor}
    language={lang2}
    onRemove={(id) => setRoomSelection((prev) => prev.filter((p) => p.id !== id))}
    onOpen={() => setStudioOpen(true)}
  />
)}
```

  (`config.primaryColor` — use whatever field ChatWindow already uses for the theme color; `lang2` = the narrowed language from the previous step. Match the existing composer-area layout; the tray sits inside the same container as the composer, above it.)

- [ ] **Step 6: Type-check, tests, commit**

Run: `npx tsc --noEmit` → clean. `npm test` → green.

```bash
git add lib/widget-transport.ts components/widget/RoomVisualizer.tsx components/widget/ProductCards.tsx components/widget/MessageList.tsx components/widget/ChatWindow.tsx
git commit -m "feat(visualizer): product selection tray in the chat widget"
```

---

### Task 5: RoomStudio fullscreen overlay + render-to-chat

**Files:**
- Modify: `components/widget/RoomVisualizer.tsx` (add `RoomStudio` + `downscaleImage`)
- Modify: `components/widget/MessageList.tsx` (`ChatMessage.image` + render)
- Modify: `components/widget/ChatWindow.tsx` (mount studio, append result message)

**Interfaces:**
- Consumes: `transport.visualize` (Task 4), `roomLabels`, `MAX_ROOM_PRODUCTS`.
- Produces: `<RoomStudio products conversationId visualize primaryColor language onClose onResult />` where `onResult(image: string)` receives the rendered data URL; `ChatMessage.image?: string`.

- [ ] **Step 1: `ChatMessage.image`.** In `components/widget/MessageList.tsx` add to `ChatMessage`:

```ts
  /** A generated image (room visualizer render), shown inside the bubble. */
  image?: string
```

and where assistant bubble content renders, show it when present:

```tsx
{msg.image && (
  <img
    src={msg.image}
    alt=""
    className="mt-2 w-full rounded-xl border"
    style={{ maxHeight: 280, objectFit: 'cover' }}
  />
)}
```

- [ ] **Step 2: Studio component.** Append to `components/widget/RoomVisualizer.tsx`:

```tsx
/** Client-side downscale so the JSON payload stays small (max 1536px, JPEG). */
export async function downscaleImage(file: File): Promise<string> {
  const bitmap = await createImageBitmap(file)
  const scale = Math.min(1, 1536 / Math.max(bitmap.width, bitmap.height))
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(bitmap.width * scale)
  canvas.height = Math.round(bitmap.height * scale)
  canvas.getContext('2d')!.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
  bitmap.close()
  return canvas.toDataURL('image/jpeg', 0.85)
}

interface RoomStudioProps {
  products: CommerceProduct[]
  conversationId?: string
  visualize: NonNullable<import('@/lib/widget-transport').ChatTransport['visualize']>
  primaryColor: string
  language: 'en' | 'lt'
  onClose: () => void
  /** Push the finished render into the chat transcript. */
  onResult: (image: string) => void
}

export function RoomStudio({
  products,
  conversationId,
  visualize,
  primaryColor,
  language,
  onClose,
  onResult,
}: RoomStudioProps) {
  const labels = roomLabels(language)
  const [roomImage, setRoomImage] = useState<string | null>(null)
  const [result, setResult] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [remaining, setRemaining] = useState<number | null>(null)
  const [instruction, setInstruction] = useState('')

  const capped = remaining === 0
  const canGenerate = Boolean(roomImage && conversationId && products.length > 0 && !busy && !capped)

  async function generate() {
    if (!roomImage || !conversationId) return
    setBusy(true)
    setError(null)
    const res = await visualize({
      conversationId,
      roomImage,
      productIds: products.map((p) => p.id),
      instruction: instruction || undefined,
    }).catch(() => ({ error: labels.genericError }) as const)
    setBusy(false)
    if ('error' in res && res.error) {
      if ('remaining' in res && res.remaining === 0) setRemaining(0)
      setError(res.remaining === 0 ? labels.limitReached : res.error)
      return
    }
    if (res.image) {
      setResult(res.image)
      setRemaining(res.remaining ?? null)
      onResult(res.image)
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 14 }}
      transition={{ duration: 0.22, ease: [0.25, 0.46, 0.45, 0.94] }}
      className="absolute inset-0 z-30 flex flex-col bg-white"
      role="dialog"
      aria-label={labels.trayTitle}
    >
      {/* Header — mirrors ProductListView's sub-header. */}
      <div
        className="flex items-center justify-between px-4 py-2.5 flex-shrink-0"
        style={{ backgroundColor: primaryColor, color: readableTextColor(primaryColor) }}
      >
        <button type="button" onClick={onClose} className="text-sm font-medium -ml-1 hover:opacity-80 outline-none focus-visible:ring-2">
          ← {labels.back}
        </button>
        <span className="text-xs opacity-80">
          {remaining !== null ? labels.remaining(remaining) : labels.trayTitle}
        </span>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {/* Selected products strip */}
        <div className="flex gap-2 overflow-x-auto">
          {products.map((p) => (
            <div key={p.id} className="w-16 shrink-0 text-center">
              <div className="size-16 overflow-hidden rounded-lg border bg-muted">
                {p.imageUrl && <img src={p.imageUrl} alt={p.title} className="h-full w-full object-cover" />}
              </div>
              <p className="mt-1 truncate text-[10px] text-muted-foreground" title={p.title}>{p.title}</p>
            </div>
          ))}
        </div>

        {/* Result, or the room photo / upload zone */}
        {result ? (
          <img src={result} alt={labels.resultNote} className="w-full rounded-xl border" />
        ) : roomImage ? (
          <img src={roomImage} alt="" className="w-full rounded-xl border" />
        ) : (
          <label className="flex min-h-44 cursor-pointer flex-col items-center justify-center gap-1 rounded-xl border-2 border-dashed p-6 text-center hover:bg-gray-50">
            <span className="text-sm font-medium">{labels.uploadTitle}</span>
            <span className="text-xs text-muted-foreground">{labels.uploadHint}</span>
            <input
              type="file"
              accept="image/*"
              capture="environment"
              className="sr-only"
              onChange={async (e) => {
                const f = e.target.files?.[0]
                if (f) setRoomImage(await downscaleImage(f))
              }}
            />
          </label>
        )}

        {error && <p className="text-xs text-red-600">{error}</p>}

        {/* Regenerate instruction (after a first render) */}
        {result && !capped && (
          <input
            type="text"
            value={instruction}
            maxLength={200}
            onChange={(e) => setInstruction(e.target.value)}
            placeholder={labels.instructionPlaceholder}
            className="w-full rounded-lg border px-3 py-2 text-sm outline-none focus-visible:ring-2"
          />
        )}
      </div>

      {/* Footer actions */}
      <div className="flex gap-2 border-t p-3">
        {result && (
          <a
            href={result}
            download="room-visualization.jpg"
            className="flex items-center justify-center rounded-lg border px-3 py-2 text-sm font-medium hover:bg-gray-50"
          >
            {labels.download}
          </a>
        )}
        <button
          type="button"
          disabled={!canGenerate}
          onClick={generate}
          className="flex-1 rounded-lg px-3 py-2 text-sm font-semibold transition-opacity hover:opacity-85 disabled:opacity-40 outline-none focus-visible:ring-2"
          style={{ backgroundColor: primaryColor, color: readableTextColor(primaryColor) }}
        >
          {busy ? labels.generating : result ? labels.regenerate : labels.generate}
        </button>
      </div>
    </motion.div>
  )
}
```

Add the needed imports at the top of the file: `useState` from react, `motion` from framer-motion.

- [ ] **Step 3: Mount in ChatWindow.** Where `ProductListView` is conditionally rendered (inside the same `AnimatePresence`/positioned container), add:

```tsx
{studioOpen && transport.visualize && (
  <RoomStudio
    products={roomSelection}
    conversationId={conversationId}
    visualize={transport.visualize.bind(transport)}
    primaryColor={config.primaryColor}
    language={lang2}
    onClose={() => setStudioOpen(false)}
    onResult={(image) =>
      setMessages((prev) => [
        ...prev,
        { id: generateId(), role: 'assistant', content: roomLabels(lang2).resultNote, image },
      ])
    }
  />
)}
```

The result message is client-side only (not persisted to `messages`) — v1 accepts that it disappears on restart.

- [ ] **Step 4: Type-check, tests, commit**

Run: `npx tsc --noEmit` → clean. `npm test` → green.

```bash
git add components/widget/RoomVisualizer.tsx components/widget/MessageList.tsx components/widget/ChatWindow.tsx
git commit -m "feat(visualizer): fullscreen room studio with render-to-chat"
```

---

### Task 6: Configurator toggle

**Files:**
- Modify: `components/client/ConfigForm.tsx` (Store/commerce `CollapsibleSection` — locate it via the `commerce` field bindings; sections start around :1576–:1871)

**Interfaces:**
- Consumes: `roomVisualizer` schema field (Task 1); react-hook-form context + `Switch` from `@/components/ui/switch` (pattern: `components/client/VoiceSection.tsx:105`).

- [ ] **Step 1: Add the toggle** inside the Store section, after the commerce provider fields:

```tsx
{/* Room visualizer — AI "see it in your room" for furniture stores. */}
<div className="flex items-center justify-between rounded-lg border p-3">
  <div>
    <p className="text-sm font-medium">Room visualizer</p>
    <p className="text-xs text-muted-foreground">
      Let visitors upload a room photo and see selected products placed in it (AI render, max 5 per conversation).
    </p>
  </div>
  <Switch
    checked={watch('roomVisualizer') ?? false}
    onCheckedChange={(v) => setValue('roomVisualizer', v, { shouldDirty: true })}
  />
</div>
```

Match the section's existing row markup — if neighboring toggles use a shared row component, use that instead of the raw div above. The Store section is owner-managed (`variant === 'client'` hides it) — that's the right home; clients get it configured for them, consistent with the done-for-you model.

- [ ] **Step 2: Verify the form round-trips**

Run: `npx tsc --noEmit` → clean. `npm test` → green (`botConfigFormSchema` accepts the field — Task 1 covered the schema).

- [ ] **Step 3: Commit**

```bash
git add components/client/ConfigForm.tsx
git commit -m "feat(visualizer): Room visualizer toggle in the bot configurator"
```

---

### Task 7: Env, wiki, and end-to-end verification

**Files:**
- Modify: `.env.local` (needs the user's real `GEMINI_API_KEY` — ask if absent)
- Create: `docs/wiki/room-visualizer.md`
- Modify: `docs/wiki/index.md`, `docs/wiki/log.md`

- [ ] **Step 1: Env.** Confirm `GEMINI_API_KEY` is present in `.env.local`. If not, STOP and ask the user for it (Google AI Studio key). Remind them it must also be added to Vercel env before deploying.

- [ ] **Step 2: Manual E2E** (use the browser preview tools, dev server from `.claude/launch.json`):
  1. Start the dev server; open the owner configurator for a commerce-enabled test bot (owner keeps identical test copies — identify the bot by org, never touch client bots).
  2. Enable "Room visualizer" in the Store section, save.
  3. Open the live widget embed for that bot. Ask for furniture-ish products so cards render.
  4. Verify: "+ Add to room" on cards → tray appears → studio opens → upload a room photo (any local test image) → Generate → a render appears, drops into the chat, Download works, Regenerate with an instruction works, and the remaining counter decrements.
  5. Verify gating: a bot with the toggle off shows no selection UI; the 6th render in one conversation returns the limit message.
  6. Check `preview_logs` and browser console for errors.

- [ ] **Step 3: Wiki.** Create `docs/wiki/room-visualizer.md` (concise, cite files/lines, per `docs/wiki/README.md`): flag flow (`botConfigSchema` → `publicBotConfig`), the selection-tray/studio components, the visualize route's checks (toggle, origin, cap column, SSRF-guarded product images, no storage), the "preview transport omits `visualize` so the configurator preview hides the feature" gotcha, and the Gemini model constant location. Add an index line and a log entry.

- [ ] **Step 4: Commit**

```bash
git add docs/wiki/room-visualizer.md docs/wiki/index.md docs/wiki/log.md
git commit -m "docs(wiki): room visualizer page"
```

- [ ] **Step 5: Finish the branch** — run the full suite (`npm test`), `npx tsc --noEmit`, then use superpowers:finishing-a-development-branch to merge/PR back to `main`.

---

## Self-review notes

- Spec coverage: config flag + toggle (T1, T6), card selection + tray (T4), studio + upload + regenerate + download + chat message (T5), API with origin/toggle/cap/SSRF/product resolution (T3), Gemini module + prompt (T2), migration (T1), wiki + E2E (T7). Clothes try-on, drag placement, entitlements: explicitly out of scope.
- Failed render not consuming a slot: enforced by post-success update (T3) and tested.
- Type consistency: `RoomSelect`, `roomLabels`, `MAX_ROOM_PRODUCTS`, `InlineImage`, `transport.visualize` signatures match across tasks.
