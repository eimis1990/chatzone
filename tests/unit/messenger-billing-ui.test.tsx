import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { BillingPanel } from '@/components/client/BillingPanel'
vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh: vi.fn() }) }))
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }))
afterEach(cleanup)
const props = {
  billingEnabled: true, plan: 'starter' as const, status: 'active' as const,
  interval: 'month' as const, currentPeriodEnd: null, cancelAtPeriodEnd: false,
  hasCustomer: true, isPaying: true,
  usage: { conversationsUsed: 0, conversationsLimit: 1000, botsUsed: 1, botsLimit: 1 },
  voiceActive: false, voiceConfigured: false,
  voice: { name: 'Voice', monthly: 49, blurb: '', features: [] },
  visualizerActive: false, visualizerConfigured: false,
  visualizer: { name: 'Visualizer', monthly: 29, blurb: '', features: [] },
  messengerConfigured: true, plans: [], selectPlan: vi.fn(), setVoice: vi.fn(),
  setVisualizer: vi.fn(), openPortal: vi.fn(),
}
describe('Messenger subscription controls', () => {
  it('requires explicit price confirmation before adding the recurring item', async () => {
    const setMessenger = vi.fn().mockResolvedValue({ ok: true })
    render(<BillingPanel {...props} setMessenger={setMessenger} />)
    fireEvent.click(screen.getByRole('button', { name: 'Add Messenger' }))
    expect(setMessenger).not.toHaveBeenCalled()
    expect(screen.getByText(/€19\/month, plus applicable tax/)).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Add and connect' }))
    await waitFor(() => expect(setMessenger).toHaveBeenCalledWith(true))
  })
  it('shows annual billing explicitly and prevents unpaid users buying', () => {
    const { rerender } = render(<BillingPanel {...props} interval="year" setMessenger={vi.fn()} />)
    fireEvent.click(screen.getByRole('button', { name: 'Add Messenger' }))
    expect(screen.getByText(/€228\/year \(€19\/month\)/)).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }))
    rerender(<BillingPanel {...props} isPaying={false} setMessenger={vi.fn()} />)
    expect(screen.getByRole('button', { name: 'Add Messenger' })).toBeDisabled()
  })
  it('offers management for an entitled org', () => {
    render(<BillingPanel {...props} messengerEntitled messengerPaid setMessenger={vi.fn()} />)
    expect(screen.getByRole('link', { name: /Connect \/ manage Messenger/ })).toHaveAttribute('href', '/app/channels/messenger/connect')
    fireEvent.click(screen.getByRole('button', { name: 'Remove Messenger' }))
    expect(screen.getByText(/Messenger replies stop immediately/)).toBeTruthy()
  })
})
