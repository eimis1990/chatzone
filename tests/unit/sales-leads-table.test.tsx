import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { SalesLeadsTable } from '@/components/owner/SalesLeadsTable'
import type { SalesLead, SalesLeadOrigin } from '@/lib/types'

vi.mock('@/app/(owner)/owner/leads/actions', () => ({
  sendSalesLeadDemoEmail: vi.fn(),
  setLeadStatus: vi.fn(),
}))

function lead(
  id: string,
  name: string,
  leadOrigin: SalesLeadOrigin,
  country: string,
): SalesLead {
  return {
    id,
    name,
    legal_name: null,
    website: `https://${id}.example`,
    city: null,
    vertical: 'Retail',
    ceo: null,
    email: null,
    phone: null,
    size_info: null,
    platform: null,
    hook: null,
    fit_note: null,
    source: null,
    lead_origin: leadOrigin,
    country,
    linkedin_url: leadOrigin === 'linkedin' ? `https://www.linkedin.com/in/${id}` : null,
    score: 70,
    score_why: null,
    email_subject: null,
    email_body: null,
    initial_email_sent_at: null,
    initial_email_template: null,
    initial_email_message_id: null,
    delivery_failed_at: null,
    delivery_failure_reason: null,
    has_chatbot: false,
    status: 'ready',
    status_updated_at: '2026-08-28T08:00:00.000Z',
    created_at: '2026-08-28T08:00:00.000Z',
    updated_at: '2026-08-28T08:00:00.000Z',
  }
}

describe('SalesLeadsTable source tabs', () => {
  it('separates Default and LinkedIn leads and exposes country controls only for LinkedIn', () => {
    render(
      <SalesLeadsTable
        leads={[
          lead('default-shop', 'Default Shop', 'default', 'Lithuania'),
          lead('linkedin-lt', 'LinkedIn Lithuania', 'linkedin', 'Lithuania'),
          lead('linkedin-lv', 'LinkedIn Latvia', 'linkedin', 'Latvia'),
        ]}
        asOf="2026-08-28T12:00:00.000Z"
      />,
    )

    expect(screen.getByRole('tab', { name: 'Default (1)' })).toHaveAttribute('aria-selected', 'true')
    expect(screen.getByText('Default pipeline')).toBeInTheDocument()
    expect(screen.queryByLabelText('Filter by country')).not.toBeInTheDocument()
    expect(screen.getByText('Showing 1 of 1')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('tab', { name: 'LinkedIn (2)' }))

    expect(screen.getByRole('tab', { name: 'LinkedIn (2)' })).toHaveAttribute('aria-selected', 'true')
    expect(screen.getByText('LinkedIn pipeline')).toBeInTheDocument()
    expect(screen.getByLabelText('Filter by country')).toBeInTheDocument()
    expect(screen.getByText('Showing 2 of 2')).toBeInTheDocument()
    expect(screen.getAllByText('Lithuania').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Latvia').length).toBeGreaterThan(0)
  })
})
