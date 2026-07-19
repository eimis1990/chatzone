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
  const { error: incrementError } = await svc
    .from('conversations')
    .update({ visualizer_renders: conv.visualizer_renders + 1 })
    .eq('id', conv.id)
    .eq('bot_id', bot.id)
  if (incrementError) console.error('[visualizer] cap increment failed:', incrementError)

  return json({
    image: `data:${rendered.mimeType};base64,${rendered.data}`,
    remaining: RENDER_CAP - conv.visualizer_renders - 1,
  })
}
