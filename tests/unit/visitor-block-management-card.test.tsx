import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { VisitorBlockManagementCard } from '@/components/client/VisitorBlockManagementCard'

describe('VisitorBlockManagementCard', () => {
  it('shows the block expiry and extends the remaining block', async () => {
    const extendedExpiry = '2026-07-25T18:41:40.952Z'
    const onAction = vi.fn().mockResolvedValue({ blocked: true, expiresAt: extendedExpiry })
    const onChange = vi.fn()

    render(
      <VisitorBlockManagementCard
        expiresAt="2026-07-24T18:41:40.952Z"
        onAction={onAction}
        onChange={onChange}
      />,
    )

    expect(screen.getByText('Blocked')).toBeInTheDocument()
    expect(screen.getByText('Active')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Extend block' }))

    await waitFor(() => {
      expect(onAction).toHaveBeenCalledWith('extend')
      expect(onChange).toHaveBeenCalledWith(extendedExpiry)
    })
  })

  it('removes the compact section after unblocking', async () => {
    const onAction = vi.fn().mockResolvedValue({ blocked: false, expiresAt: null })
    const onChange = vi.fn()

    render(
      <VisitorBlockManagementCard
        expiresAt="2026-07-24T18:41:40.952Z"
        onAction={onAction}
        onChange={onChange}
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Unblock' }))

    await waitFor(() => {
      expect(onAction).toHaveBeenCalledWith('unblock')
      expect(onChange).toHaveBeenCalledWith(null)
    })
  })
})
