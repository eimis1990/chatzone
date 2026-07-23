import { z } from 'zod'
import { createServiceClient } from '@/lib/supabase/service'
import { isOriginAllowed, corsHeaders } from '@/lib/widget-auth'
import { createRateLimiter } from '@/lib/ratelimit'
import sharp from 'sharp'
import { assertPublicUrl } from '@/lib/net/ssrf'
import {
  parseImageDataUrl,
  sanitizeInstruction,
  renderRoomScene,
  closestAspectRatio,
  visualizerUsageMonth,
  type InlineImage,
} from '@/lib/room-visualizer'
import { VISUALIZER_ADDON } from '@/lib/plans-catalog'
import type { Bot } from '@/lib/types'

export const maxDuration = 60 // image generation is slow

const RENDER_CAP = 5
const MAX_PRODUCTS = 4
// Download guard only — images are downscaled to ≤1024px JPEG after fetching,
// so this just caps how much we're willing to pull from a store.
const MAX_PRODUCT_IMAGE_BYTES = 15 * 1024 * 1024

const limiter = createRateLimiter({ capacity: 5, refillPerSec: 0.1 })

const bodySchema = z.object({
  publicKey: z.string().min(1),
  conversationId: z.string().uuid(),
  roomImage: z.string().min(1).max(12 * 1024 * 1024),
  productIds: z.array(z.string().min(1)).min(1).max(MAX_PRODUCTS),
  instruction: z.string().max(500).optional(),
  /* Room photo pixel size — picks the render's aspect ratio (no letterboxing). */
  roomWidth: z.number().int().positive().max(10000).optional(),
  roomHeight: z.number().int().positive().max(10000).optional(),
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
  const { publicKey, conversationId, roomImage, productIds, instruction, roomWidth, roomHeight } = parsed.data

  const svc = createServiceClient()
  const { data: bot } = await svc.from('bots').select('*').eq('public_key', publicKey).single<Bot>()
  if (!bot || bot.status !== 'active') return json({ error: 'Bot not available.' }, 404)
  if (!bot.config.roomVisualizer) return json({ error: 'Not enabled.' }, 403)
  // Requires the paid Room visualizer add-on (owner demo orgs are exempt) —
  // mirrors the widget-config gate, so nobody can spend renders via raw API
  // calls that the widget wouldn't offer.
  const { data: org } = await svc
    .from('organizations')
    .select('is_demo, visualizer_addon')
    .eq('id', bot.org_id)
    .single<{ is_demo: boolean | null; visualizer_addon: boolean | null }>()
  const isDemo = Boolean(org?.is_demo)
  if (!isDemo && !org?.visualizer_addon) return json({ error: 'Not enabled.' }, 403)

  // Monthly render pool (per org; demo orgs exempt). Checked BEFORE any model
  // spend; widget-config also hides the tray once the pool is gone, so this is
  // mostly a backstop for sessions already open when the pool ran out.
  if (!isDemo) {
    const { data: usage } = await svc
      .from('visualizer_usage')
      .select('renders')
      .eq('org_id', bot.org_id)
      .eq('month', visualizerUsageMonth())
      .maybeSingle<{ renders: number }>()
    if ((usage?.renders ?? 0) >= VISUALIZER_ADDON.rendersIncluded) {
      return json({ error: 'The room visualizer is taking a break this month — please check back soon.', remaining: 0 }, 429)
    }
  }
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
  if (conv.visualizer_renders >= RENDER_CAP)
    return json({ error: 'Render limit reached.', remaining: 0 }, 429)

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
        // Stores serve full-resolution originals (often several MB) — normalize
        // to ≤1024px JPEG so the Gemini payload stays small. sharp also rejects
        // non-image bytes, regardless of the claimed content-type.
        const jpeg = await sharp(Buffer.from(buf))
          .resize(1024, 1024, { fit: 'inside', withoutEnlargement: true })
          .jpeg({ quality: 80 })
          .toBuffer()
        return { data: jpeg.toString('base64'), mimeType: 'image/jpeg' }
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
      model: bot.config.roomVisualizerModel,
      ...(roomWidth && roomHeight ? { aspectRatio: closestAspectRatio(roomWidth, roomHeight) } : {}),
    })
  } catch (err) {
    console.error('[visualizer] render failed:', err)
    return json({ error: 'The visualization failed — please try again.' }, 502)
  }

  // Consume a slot only after success. ponytail: read-then-write race can
  // overshoot the cap by a concurrent request or two — acceptable; switch to a
  // SQL increment RPC if abuse shows up.
  const { error: incrementError } = await svc
    .from('conversations')
    .update({ visualizer_renders: conv.visualizer_renders + 1 })
    .eq('id', conv.id)
    .eq('bot_id', bot.id)
  if (incrementError) console.error('[visualizer] cap increment failed:', incrementError)

  // Spend from the monthly pool (atomic upsert-increment; demo orgs exempt).
  if (!isDemo) {
    const { error: usageError } = await svc.rpc('increment_visualizer_usage', {
      p_org_id: bot.org_id,
    })
    if (usageError) console.error('[visualizer] usage increment failed:', usageError)
  }

  return json({
    image: `data:${rendered.mimeType};base64,${rendered.data}`,
    remaining: RENDER_CAP - conv.visualizer_renders - 1,
  })
}
