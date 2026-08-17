import { fireEvent, render, screen } from '@testing-library/react'
import { useState } from 'react'
import { describe, expect, it, vi } from 'vitest'
import {
  LeadEmailPreviewDialog,
  LeadEmailTemplates,
} from '@/components/owner/LeadEmailTemplates'

vi.mock('@/app/(owner)/owner/leads/actions', () => ({
  sendSalesLeadEmail: vi.fn(),
}))

const BODY = `Laba diena,

Pastebėjimas apie klientą.

Esu Eimantas, kuriu „Loqara“ – lietuviškai bendraujantį AI konsultantą svetainėms.

Galiu paruošti trumpą demo.

Ar norėtumėte jį pamatyti?

Jei tokie pasiūlymai šiuo metu neaktualūs, tiesiog atsakykite „ne“ – daugiau nerašysiu.`

function EmailTemplateHarness() {
  const [previewOpen, setPreviewOpen] = useState(false)

  return (
    <>
      <aside aria-label="Lead drawer">
        <LeadEmailTemplates
          leadId="lead-1"
          leadName="The House of DROPS"
          recipient="info@example.lt"
          subject="Trumpas pasiūlymas"
          body={BODY}
          alreadySentAt={null}
          onPreview={() => setPreviewOpen(true)}
          onSent={() => undefined}
        />
      </aside>
      <LeadEmailPreviewDialog
        open={previewOpen}
        onOpenChange={setPreviewOpen}
        leadName="The House of DROPS"
        recipient="info@example.lt"
        subject="Trumpas pasiūlymas"
        body={BODY}
      />
    </>
  )
}

describe('LeadEmailTemplates', () => {
  it('offers only Clean update and opens a centered preview', () => {
    render(<EmailTemplateHarness />)

    expect(screen.getByText('Clean update')).toBeInTheDocument()
    expect(screen.queryByText('Editorial')).not.toBeInTheDocument()
    expect(screen.queryByText('Founder note')).not.toBeInTheDocument()
    expect(screen.queryByText('Focused proposal')).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Open Clean update preview' }))

    const dialog = screen.getByRole('dialog')
    expect(dialog).toBeInTheDocument()
    expect(dialog.className).toContain('h-[92dvh]')
    expect(dialog.className).toContain('sm:max-w-none')
    expect(dialog.className).toContain('lg:w-[56vw]')
    expect(screen.getByText('Email preview for The House of DROPS')).toBeInTheDocument()
    expect(screen.getByText('info@example.lt')).toBeInTheDocument()
    expect(screen.getByText('Trumpas pasiūlymas')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Copy styled email' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Close email preview' })).toBeInTheDocument()
  })

  it('shows a confirmation dialog before sending the Clean update email', () => {
    render(<EmailTemplateHarness />)

    fireEvent.click(screen.getByRole('button', { name: 'Send email' }))

    expect(screen.getByRole('heading', { name: 'Send this email?' })).toBeInTheDocument()
    expect(screen.getByText('Loqara <hello@loqara.com>')).toBeInTheDocument()
    expect(screen.getByText('info@example.lt')).toBeInTheDocument()
    expect(screen.getAllByText('Trumpas pasiūlymas').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Clean update')).toHaveLength(2)
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeInTheDocument()
  })
})
