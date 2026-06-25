import { z } from 'zod'
import { requireRole } from '@/lib/auth/guards'
import { fetchProductsFromUrl } from '@/lib/commerce/feed'
import { createRateLimiter } from '@/lib/ratelimit'
import type { CommerceProduct } from '@/lib/commerce/types'

export const maxDuration = 20

// Authenticated configurator preview of a "fetch URL" quick action. The owner is
// testing their own (possibly unsaved) config, so the URL is passed directly.
const limiter = createRateLimiter({ capacity: 20, refillPerSec: 1 })
const bodySchema = z.object({ url: z.string().url() })

export async function POST(req: Request) {
  const json = (b: unknown, status = 200) =>
    new Response(JSON.stringify(b), { status, headers: { 'Content-Type': 'application/json' } })

  const session = await requireRole('client')
  if (!limiter.check(session.id)) return json({ products: [] }, 429)

  const parsed = bodySchema.safeParse(await req.json().catch(() => null))
  if (!parsed.success) return json({ products: [] }, 400)

  let products: CommerceProduct[] = []
  try {
    products = await fetchProductsFromUrl(parsed.data.url)
  } catch {
    return json({ products: [] }, 200)
  }
  return json({ products })
}
