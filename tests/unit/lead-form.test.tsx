import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { LeadForm } from '@/components/widget/LeadForm'

const fields = [{ key: 'email', label: 'El. paštas', required: true }]
const noop = { onSubmit: vi.fn(), onDismiss: vi.fn(), primaryColor: '#111' }

describe('LeadForm', () => {
  it('uses Lithuanian built-in strings when the widget language is lt', () => {
    render(<LeadForm fields={fields} lang="lt" {...noop} />)
    expect(screen.getByText('Palikite savo kontaktus')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Siųsti' })).toBeInTheDocument()
  })

  it('defaults to English strings', () => {
    render(<LeadForm fields={fields} {...noop} />)
    expect(screen.getByText('Leave your details')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Send' })).toBeInTheDocument()
  })

  it('a custom title overrides the built-in one in any language', () => {
    render(<LeadForm fields={fields} lang="lt" title="Gaukite -10% kodą" {...noop} />)
    expect(screen.getByText('Gaukite -10% kodą')).toBeInTheDocument()
    expect(screen.queryByText('Palikite savo kontaktus')).not.toBeInTheDocument()
  })
})
