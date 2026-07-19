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
        return { select: () => ({ eq: () => ({ single }) }) }
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
// Note: must be a strictly RFC4122-valid v4 UUID (variant nibble 8-b) since
// the route validates conversationId with zod's `.uuid()`.
const CONV = '11111111-2222-4333-8444-555555555555'

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
