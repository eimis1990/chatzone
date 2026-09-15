import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { OrderLookupForm } from '@/components/widget/OrderLookupForm'

const theme = { primaryColor: '#111', backgroundColor: '#ffffff', borderColor: '#e5e7eb', bubbleRadius: 16 }
const found = { found: true, orderNumber: '1001', status: 'processing' }

function fill(orderId: string, email: string) {
  fireEvent.change(screen.getByLabelText(/order number|užsakymo numeris/i), { target: { value: orderId } })
  fireEvent.change(screen.getByLabelText(/email|el. paštas/i), { target: { value: email } })
}

describe('OrderLookupForm', () => {
  it('hands a matched order to onFound', async () => {
    const lookup = vi.fn().mockResolvedValue({ found: true, order: found })
    const onFound = vi.fn()
    render(<OrderLookupForm lookup={lookup} onFound={onFound} onDismiss={vi.fn()} {...theme} />)
    fill(' 1001 ', 'a@b.lt')
    fireEvent.click(screen.getByRole('button', { name: 'Track order' }))
    await waitFor(() => expect(onFound).toHaveBeenCalledWith(found))
    expect(lookup).toHaveBeenCalledWith('1001', 'a@b.lt')
  })

  it('shows an inline error on a miss and keeps the form open', async () => {
    const lookup = vi.fn().mockResolvedValue({ found: false })
    const onFound = vi.fn()
    render(<OrderLookupForm lookup={lookup} onFound={onFound} onDismiss={vi.fn()} lang="lt" {...theme} />)
    fill('1', 'a@b.lt')
    fireEvent.click(screen.getByRole('button', { name: 'Sekti užsakymą' }))
    expect(await screen.findByRole('alert')).toHaveTextContent(/nerasta/)
    expect(onFound).not.toHaveBeenCalled()
    expect(screen.getByRole('button', { name: 'Sekti užsakymą' })).toBeInTheDocument()
  })

  it('does not call lookup with an empty field', () => {
    const lookup = vi.fn()
    render(<OrderLookupForm lookup={lookup} onFound={vi.fn()} onDismiss={vi.fn()} {...theme} />)
    fill('', 'a@b.lt')
    fireEvent.click(screen.getByRole('button', { name: 'Track order' }))
    expect(lookup).not.toHaveBeenCalled()
    expect(screen.getByRole('alert')).toBeInTheDocument()
  })

  it('reports a failed request as temporarily unavailable', async () => {
    const lookup = vi.fn().mockRejectedValue(new Error('net'))
    render(<OrderLookupForm lookup={lookup} onFound={vi.fn()} onDismiss={vi.fn()} {...theme} />)
    fill('1', 'a@b.lt')
    fireEvent.click(screen.getByRole('button', { name: 'Track order' }))
    expect(await screen.findByRole('alert')).toHaveTextContent(/temporarily unavailable/)
  })
})
