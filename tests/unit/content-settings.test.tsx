import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { ContentSettingsForm } from '@/components/owner/content/ContentSettingsForm'
import { defaultContentStudioSettings, defaultPublicationTargets } from '@/lib/content-studio/publication'

vi.mock('@/app/(owner)/owner/content/actions', () => ({
  saveContentStudioSettings: vi.fn(),
}))

describe('ContentSettingsForm', () => {
  it('keeps review as the safe default and confirms auto-publish explicitly', async () => {
    const ownerId = '10000000-0000-4000-8000-000000000001'
    const { container } = render(
      <ContentSettingsForm
        initialSettings={defaultContentStudioSettings(ownerId)}
        initialTargets={defaultPublicationTargets(ownerId)}
      />,
    )

    expect(screen.getByText('Review by default')).toBeInTheDocument()
    expect(screen.getAllByText('Connector required')).toHaveLength(6)
    for (const provider of ['website', 'linkedin', 'facebook', 'instagram', 'youtube', 'tiktok']) {
      expect(container.querySelector(`[data-provider-logo="${provider}"] svg`)).toBeInTheDocument()
    }
    const linkedinAutoPublish = screen.getByRole('switch', { name: 'Auto-publish to LinkedIn' })
    expect(linkedinAutoPublish).toHaveAttribute('aria-checked', 'false')

    fireEvent.click(linkedinAutoPublish)
    expect(await screen.findByRole('dialog', { name: 'Enable auto-publish?' })).toBeInTheDocument()
    expect(linkedinAutoPublish).toHaveAttribute('aria-checked', 'false')

    fireEvent.click(screen.getByRole('button', { name: 'Enable auto-publish' }))
    expect(linkedinAutoPublish).toHaveAttribute('aria-checked', 'true')
  })
})
