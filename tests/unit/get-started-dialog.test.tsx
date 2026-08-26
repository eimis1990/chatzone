import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { GetStartedDialog } from '@/components/landing/GetStartedDialog'

const { trackEvent } = vi.hoisted(() => ({ trackEvent: vi.fn() }))

vi.mock('@/lib/analytics', () => ({ trackEvent }))
vi.mock('canvas-confetti', () => ({ default: vi.fn() }))

describe('GetStartedDialog acquisition funnel', () => {
  beforeEach(() => {
    trackEvent.mockReset()
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({ ok: true, recorded: true }),
      }),
    )
  })

  it('tracks each funnel stage once and carries first touch into the signup request', async () => {
    render(<GetStartedDialog source="hero" />)

    fireEvent.click(screen.getByRole('button', { name: 'Get started' }))
    expect(trackEvent).toHaveBeenCalledWith(
      'get_started_cta_clicked',
      expect.objectContaining({ ctaSource: 'hero', landingPath: '/' }),
    )
    expect(trackEvent).toHaveBeenCalledWith(
      'get_started_opened',
      expect.objectContaining({ ctaSource: 'hero', landingPath: '/' }),
    )

    fireEvent.change(screen.getByLabelText('Company name'), { target: { value: 'North Store' } })
    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'owner@north.test' } })
    fireEvent.change(screen.getByLabelText(/Your website/), { target: { value: 'north.test' } })

    expect(trackEvent.mock.calls.filter(([name]) => name === 'signup_started')).toHaveLength(1)

    fireEvent.click(screen.getByRole('button', { name: 'Request access' }))

    await waitFor(() => expect(fetch).toHaveBeenCalledTimes(1))
    const request = vi.mocked(fetch).mock.calls[0]
    const body = JSON.parse(String((request[1] as RequestInit).body))
    expect(body).toMatchObject({
      email: 'owner@north.test',
      company: 'North Store',
      website: 'https://north.test',
      source: 'hero',
      acquisition: {
        landingPath: '/',
        acquisitionSource: 'direct',
        acquisitionMedium: 'none',
      },
    })
    await waitFor(() =>
      expect(trackEvent).toHaveBeenCalledWith(
        'signup_succeeded',
        expect.objectContaining({ ctaSource: 'hero', landingPath: '/' }),
      ),
    )
  })
})
