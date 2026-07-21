import { render, waitFor } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { WidgetEmbed } from '@/components/landing/WidgetEmbed'

describe('WidgetEmbed loading policy', () => {
  it('keeps immediate loading as the default for presentation routes', async () => {
    const { unmount } = render(<WidgetEmbed botKey="presentation-bot" />)

    await waitFor(() => {
      expect(document.querySelector('script[data-cbz-embed]')).not.toBeNull()
    })
    expect(document.querySelector('script[data-cbz-embed]')).toHaveAttribute(
      'data-bot-key',
      'presentation-bot',
    )
    expect(document.querySelector('[data-testid="deferred-widget-launcher"]')).toBeNull()

    unmount()
    expect(document.querySelector('script[data-cbz-embed]')).toBeNull()
  })
})
