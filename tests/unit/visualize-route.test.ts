import { describe, it, expect, vi, beforeEach } from 'vitest'

// --- mocks (declared before importing the route) ---------------------------
const single = vi.fn()
const orgSingle = vi.fn()
const convSingle = vi.fn()
const usageSingle = vi.fn()
const rpcMock = vi.fn()
const inFn = vi.fn()
const updateEq2 = vi.fn()

vi.mock('@/lib/supabase/service', () => ({
  createServiceClient: () => ({
    from: (table: string) => {
      if (table === 'bots')
        return { select: () => ({ eq: () => ({ single }) }) }
      if (table === 'organizations')
        return { select: () => ({ eq: () => ({ single: orgSingle }) }) }
      if (table === 'visualizer_usage')
        return { select: () => ({ eq: () => ({ eq: () => ({ maybeSingle: usageSingle }) }) }) }
      if (table === 'conversations')
        return {
          select: () => ({ eq: () => ({ eq: () => ({ single: convSingle }) }) }),
          update: () => ({ eq: () => ({ eq: updateEq2 }) }),
        }
      if (table === 'product_embeddings')
        return { select: () => ({ eq: () => ({ in: inFn }) }) }
      throw new Error(`unexpected table ${table}`)
    },
    rpc: rpcMock,
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

// Each test gets its own IP: the per-IP limiter (capacity 5) is a module-level
// singleton, so sharing one bucket across the whole file trips 429s.
let ipCounter = 0
function req(body: Record<string, unknown>) {
  ipCounter += 1
  return new Request('http://localhost/api/widget/visualize', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-forwarded-for': `198.51.100.${ipCounter}` },
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
  orgSingle.mockResolvedValue({ data: { is_demo: true, is_platform: false, visualizer_addon: false } })
  usageSingle.mockResolvedValue({ data: null })
  rpcMock.mockResolvedValue({ error: null })
  convSingle.mockResolvedValue({ data: { id: CONV, visualizer_renders: 0 } })
  inFn.mockResolvedValue({
    data: [{ external_id: 'p1', title: 'Oak Sofa', image_url: 'https://store.example/sofa.jpg' }],
  })
  updateEq2.mockResolvedValue({ error: null })
  renderRoomScene.mockResolvedValue({ data: PX, mimeType: 'image/png' })
  // Product image download. A fresh Response per call — bodies are one-shot,
  // and the rate-limit test below calls POST repeatedly.
  vi.stubGlobal(
    'fetch',
    vi.fn().mockImplementation(
      async () => new Response(Buffer.from(PX, 'base64'), { headers: { 'Content-Type': 'image/jpeg' } }),
    ),
  )
})

describe('POST /api/widget/visualize', () => {
  it('403 when the bot has the feature off', async () => {
    single.mockResolvedValue({ data: bot({ roomVisualizer: false }) })
    expect((await POST(req({}))).status).toBe(403)
  })

  it("403 when the org has neither the demo flag nor the visualizer add-on", async () => {
    orgSingle.mockResolvedValue({ data: { is_demo: false, visualizer_addon: false } })
    expect((await POST(req({}))).status).toBe(403)
  })

  it('an add-on org renders and spends from the monthly pool (RPC called)', async () => {
    orgSingle.mockResolvedValue({ data: { is_demo: false, visualizer_addon: true } })
    usageSingle.mockResolvedValue({ data: { renders: 42 } })
    const res = await POST(req({}))
    expect(res.status).toBe(200)
    expect(rpcMock).toHaveBeenCalledWith('increment_visualizer_usage', { p_org_id: undefined })
  })

  it('429 before any model spend once the monthly pool is exhausted', async () => {
    orgSingle.mockResolvedValue({ data: { is_demo: false, visualizer_addon: true } })
    usageSingle.mockResolvedValue({ data: { renders: 100 } })
    const res = await POST(req({}))
    expect(res.status).toBe(429)
    const body = (await res.json()) as { remaining?: number }
    expect(body.remaining).toBe(0)
    expect(renderRoomScene).not.toHaveBeenCalled()
  })

  it('demo orgs never touch the monthly pool', async () => {
    const res = await POST(req({}))
    expect(res.status).toBe(200)
    expect(rpcMock).not.toHaveBeenCalled()
  })

  it('the platform org (owner chatbot) is entitled and pool-exempt', async () => {
    orgSingle.mockResolvedValue({ data: { is_demo: false, is_platform: true, visualizer_addon: false } })
    usageSingle.mockResolvedValue({ data: { renders: 500 } }) // way over pool — still fine
    const res = await POST(req({}))
    expect(res.status).toBe(200)
    expect(rpcMock).not.toHaveBeenCalled()
  })

  it('passes the configured image model through to the renderer', async () => {
    single.mockResolvedValue({ data: bot({ roomVisualizerModel: 'gpt-image-2' }) })
    expect((await POST(req({}))).status).toBe(200)
    expect(renderRoomScene).toHaveBeenCalledWith(
      expect.objectContaining({ model: 'gpt-image-2' }),
    )
  })

  it('429 when the conversation hit the render cap, with remaining: 0', async () => {
    convSingle.mockResolvedValue({ data: { id: CONV, visualizer_renders: 5 } })
    const res = await POST(req({}))
    expect(res.status).toBe(429)
    const body = (await res.json()) as { error: string; remaining?: number }
    expect(body.remaining).toBe(0)
  })

  it('429 from the per-IP rate limit has no remaining field', async () => {
    // The limiter buckets by `${bot.id}:${ip}` (capacity 5) and is a
    // module-level singleton shared across tests in this file, so use a
    // dedicated IP here to avoid interference from other tests' calls.
    const ipReq = () =>
      new Request('http://localhost/api/widget/visualize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-forwarded-for': '203.0.113.9' },
        body: JSON.stringify({
          publicKey: 'pk',
          conversationId: CONV,
          roomImage: `data:image/png;base64,${PX}`,
          productIds: ['p1'],
        }),
      })
    let last: Response | null = null
    for (let i = 0; i < 6; i++) {
      last = await POST(ipReq())
    }
    expect(last!.status).toBe(429)
    const body = (await last!.json()) as { error: string; remaining?: number }
    expect(body.error).toBe('Too many requests.')
    expect('remaining' in body).toBe(false)
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
