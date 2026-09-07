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

describe('LeadForm typed fields', () => {
  const typed = [
    { key: 'phone', label: 'Tel. numeris', required: true, type: 'tel' as const },
    { key: 'guests', label: 'Dalyvių kiekis', required: false, type: 'number' as const },
    { key: 'date', label: 'Data', required: true, type: 'date' as const },
    { key: 'occasion', label: 'Šventė', required: false, type: 'select' as const, options: ['Vestuvės', 'Konferencija'] },
    { key: 'message', label: 'Aprašymas', required: false, type: 'textarea' as const },
  ]

  it('renders native inputs per type and applies assistant prefill', () => {
    render(<LeadForm fields={typed} lang="lt" initialValues={{ date: '2026-10-03', guests: '120' }} {...noop} />)
    expect(screen.getByLabelText('Tel. numeris')).toHaveAttribute('type', 'tel')
    expect(screen.getByLabelText('Dalyvių kiekis')).toHaveValue(120)
    expect(screen.getByLabelText('Data')).toHaveAttribute('type', 'date')
    expect(screen.getByLabelText('Data')).toHaveValue('2026-10-03')
    expect(screen.getByRole('combobox', { name: 'Šventė' })).toBeInTheDocument()
    expect(screen.getByRole('option', { name: 'Konferencija' })).toBeInTheDocument()
    expect(screen.getByLabelText('Aprašymas').tagName).toBe('TEXTAREA')
  })

  it('keeps legacy fields (no type) working: email key → email input, others text', () => {
    render(<LeadForm fields={[{ key: 'email', label: 'Email', required: true }, { key: 'name', label: 'Name', required: false }]} {...noop} />)
    expect(screen.getByLabelText('Email')).toHaveAttribute('type', 'email')
    expect(screen.getByLabelText('Name')).toHaveAttribute('type', 'text')
  })
})
