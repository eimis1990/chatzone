import { beforeEach, describe, expect, it, vi } from 'vitest'

const { createServiceClient, notifyNewSignup, insert, from } = vi.hoisted(() => {
  const insert = vi.fn()
  const from = vi.fn(() => ({ insert }))
  return {
    insert,
    from,
    createServiceClient: vi.fn(() => ({ from })),
    notifyNewSignup: vi.fn(),
  }
})

vi.mock('@/lib/supabase/service', () => ({ createServiceClient }))
vi.mock('@/lib/notify', () => ({ notifyNewSignup }))

import { POST } from '@/app/api/signup/route'

function signupRequest(body: Record<string, unknown>) {
  return new Request('https://www.loqara.com/api/signup', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

describe('POST /api/signup acquisition attribution', () => {
  beforeEach(() => {
    insert.mockReset().mockResolvedValue({ error: null })
    from.mockClear()
    createServiceClient.mockClear()
    notifyNewSignup.mockClear()
  })

  it('stores the privacy-bounded first-touch fields with a real signup', async () => {
    const res = await POST(
      signupRequest({
        email: 'new-owner@north.test',
        company: 'North Store',
        website: 'https://north.test',
        source: 'hero',
        t: 3_000,
        acquisition: {
          landingPath: '/blog/example',
          referrer: 'https://www.google.com/search',
          acquisitionSource: 'google',
          acquisitionMedium: 'organic',
          utmCampaign: '',
          utmContent: '',
          capturedAt: '2026-08-26T07:00:00.000Z',
        },
      }),
    )

    expect(res.status).toBe(200)
    await expect(res.json()).resolves.toEqual({ ok: true, recorded: true })
    expect(from).toHaveBeenCalledWith('signups')
    expect(insert).toHaveBeenCalledWith(
      expect.objectContaining({
        landing_path: '/blog/example',
        referrer: 'https://www.google.com/search',
        acquisition_source: 'google',
        acquisition_medium: 'organic',
        first_touch_at: '2026-08-26T07:00:00.000Z',
      }),
    )
    expect(notifyNewSignup).toHaveBeenCalledTimes(1)
  })

  it('does not write or count a honeypot submission as a completion', async () => {
    const res = await POST(
      signupRequest({
        email: 'robot@north.test',
        company: 'Robot Store',
        confirm_url: 'filled-by-bot',
      }),
    )

    await expect(res.json()).resolves.toEqual({ ok: true, recorded: false })
    expect(createServiceClient).not.toHaveBeenCalled()
    expect(insert).not.toHaveBeenCalled()
  })

  it('rejects an attribution payload that tries to retain a query string', async () => {
    const res = await POST(
      signupRequest({
        email: 'leaky-attribution@north.test',
        company: 'North Store',
        t: 3_000,
        acquisition: {
          landingPath: '/blog/example?private=query',
          referrer: 'https://www.google.com/search?q=private',
          acquisitionSource: 'google',
          acquisitionMedium: 'organic',
          utmCampaign: '',
          utmContent: '',
          capturedAt: '2026-08-26T07:00:00.000Z',
        },
      }),
    )

    expect(res.status).toBe(400)
    expect(createServiceClient).not.toHaveBeenCalled()
  })
})
