import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { VisitorBlockedScreen } from '@/components/widget/VisitorBlockedScreen'

describe('VisitorBlockedScreen', () => {
  it('shows the English 24-hour block notice as the only alert', () => {
    render(<VisitorBlockedScreen language="en" />)
    expect(screen.getByRole('alert')).toHaveTextContent(
      "You've been blocked. Try again in 24 hours.",
    )
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument()
    expect(screen.queryByRole('button')).not.toBeInTheDocument()
  })

  it('localizes the notice for Lithuanian visitors', () => {
    render(<VisitorBlockedScreen language="lt" />)
    expect(screen.getByRole('alert')).toHaveTextContent(
      'Jūs užblokuoti. Bandykite dar kartą po 24 valandų.',
    )
  })
})
