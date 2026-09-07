import { describe, expect, it, vi } from 'vitest'
import { postWebhook, webhookPayload, type LeadRecord } from '@/lib/lead-delivery'

const bot = { id: 'bot-1', name: 'Taujėnų dvaras' }
const lead: LeadRecord = {
  id: 'lead-1',
  conversationId: 'conv-1',
  fields: { name: 'Jonas', date: '2026-10-03' },
  createdAt: '2026-09-07T10:00:00.000Z',
}

describe('lead webhook delivery', () => {
  it('POSTs the lead as JSON to a public URL', async () => {
    const fetchImpl = vi.fn(async () => new Response('ok', { status: 200 }))
    const ok = await postWebhook(bot, lead, 'https://hooks.example.com/lead', fetchImpl as unknown as typeof fetch, async (u) => new URL(u))
    expect(ok).toBe(true)
    const [url, init] = fetchImpl.mock.calls[0] as unknown as [string, RequestInit]
    expect(url).toBe('https://hooks.example.com/lead')
    expect(init.method).toBe('POST')
    expect(JSON.parse(init.body as string)).toEqual(webhookPayload(bot, lead))
    expect(JSON.parse(init.body as string)).toMatchObject({ event: 'lead.created', fields: lead.fields })
  })

  it('refuses internal hosts (SSRF) without calling fetch', async () => {
    const fetchImpl = vi.fn()
    expect(await postWebhook(bot, lead, 'http://localhost:3000/x', fetchImpl as unknown as typeof fetch)).toBe(false)
    expect(await postWebhook(bot, lead, 'http://169.254.169.254/latest', fetchImpl as unknown as typeof fetch)).toBe(false)
    expect(fetchImpl).not.toHaveBeenCalled()
  })

  it('never throws — a dead endpoint just returns false', async () => {
    const fetchImpl = vi.fn(async () => {
      throw new Error('ECONNREFUSED')
    })
    expect(await postWebhook(bot, lead, 'https://hooks.example.com/dead', fetchImpl as unknown as typeof fetch, async (u) => new URL(u))).toBe(false)
  })

  it('skips silently when no URL is configured', async () => {
    const fetchImpl = vi.fn()
    expect(await postWebhook(bot, lead, undefined, fetchImpl as unknown as typeof fetch)).toBe(false)
    expect(await postWebhook(bot, lead, '  ', fetchImpl as unknown as typeof fetch)).toBe(false)
    expect(fetchImpl).not.toHaveBeenCalled()
  })
})
