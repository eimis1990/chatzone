import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { FontPickerDialog } from '@/components/client/FontPickerDialog'

describe('FontPickerDialog', () => {
  it('previews repeatedly without closing and restores the original font on cancel', () => {
    const onValueChange = vi.fn()
    render(
      <FontPickerDialog label="Chat font" value="geist" onValueChange={onValueChange} />,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Geist' }))
    expect(screen.getByRole('dialog', { name: 'Choose chat font' })).toBeInTheDocument()

    fireEvent.click(screen.getByRole('radio', { name: 'DynaPuff' }))
    fireEvent.click(screen.getByRole('radio', { name: 'Mali' }))

    expect(onValueChange).toHaveBeenNthCalledWith(1, 'dynapuff')
    expect(onValueChange).toHaveBeenNthCalledWith(2, 'mali')
    expect(screen.getByRole('dialog', { name: 'Choose chat font' })).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }))
    expect(onValueChange).toHaveBeenLastCalledWith('geist')
    expect(screen.queryByRole('dialog', { name: 'Choose chat font' })).not.toBeInTheDocument()
  })

  it('keeps the previewed font when confirmed and exposes the preview above its backdrop', () => {
    const onValueChange = vi.fn()
    render(
      <FontPickerDialog label="Chat font" value="geist" onValueChange={onValueChange} />,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Geist' }))
    fireEvent.click(screen.getByRole('radio', { name: 'Baloo 2' }))

    const overlay = document.querySelector<HTMLElement>('[data-slot="dialog-overlay"]')
    expect(overlay?.style.zIndex).toBe('40')

    fireEvent.click(screen.getByRole('button', { name: 'Keep' }))
    expect(onValueChange).toHaveBeenCalledTimes(1)
    expect(onValueChange).toHaveBeenLastCalledWith('baloo')
    expect(screen.queryByRole('dialog', { name: 'Choose chat font' })).not.toBeInTheDocument()
  })
})
