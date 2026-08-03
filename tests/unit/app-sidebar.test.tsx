import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { AppSidebar } from '@/components/client/AppSidebar'

vi.mock('next/navigation', () => ({
  usePathname: () => '/app/bots/bot-1/configure',
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
}))

const BOTS = [
  { id: 'bot-1', name: 'ConusAI', status: 'active', inboxCount: 2 },
  { id: 'bot-2', name: 'Second bot', status: 'active' },
]

describe('AppSidebar', () => {
  it('collapses into an accessible icon rail with a quieter active submenu', async () => {
    render(
      <AppSidebar
        bots={BOTS}
        userEmail="client@example.com"
        organizationName="Conus"
      />,
    )

    const sidebar = screen.getByTestId('client-sidebar')
    expect(sidebar).toHaveClass('w-72')

    fireEvent.click(screen.getByRole('button', { name: 'Collapse sidebar' }))

    expect(sidebar).toHaveClass('w-20')
    expect(sidebar).toHaveAttribute('data-tooltips-ready', 'false')
    expect(screen.getByRole('button', { name: 'Expand sidebar' })).toHaveAttribute(
      'aria-expanded',
      'false',
    )
    expect(screen.getByRole('link', { name: 'Home' })).toBeInTheDocument()
    const activeChild = screen.getByRole('link', { name: 'Configure' })
    expect(activeChild).toHaveClass('shrink-0', 'size-11')
    expect(activeChild).toHaveAttribute(
      'aria-current',
      'page',
    )
    expect(activeChild).toHaveClass('text-primary')
    expect(activeChild).not.toHaveClass('bg-primary', 'bg-primary/10')
    expect(screen.getByTestId('client-active-submenu')).toHaveClass(
      'shrink-0',
      'bg-white/[0.04]',
    )
    expect(screen.getByText('Loqara').parentElement).toHaveClass('w-0')
    expect(screen.getByRole('button', { name: 'Report a bug' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Sign out' })).toBeInTheDocument()
    expect(screen.getByText('My Panel')).toHaveAttribute('aria-hidden', 'true')

    await waitFor(() => {
      expect(sidebar).toHaveAttribute('data-tooltips-ready', 'true')
    })

    fireEvent.click(screen.getByRole('button', { name: 'My Bots' }))

    expect(sidebar).toHaveClass('w-72')
    expect(sidebar).toHaveAttribute('data-tooltips-ready', 'false')
    expect(screen.getByText('My Panel')).not.toHaveAttribute('aria-hidden')
    expect(screen.getByTestId('client-bot-list')).not.toHaveClass('ml-3')
    expect(screen.getByRole('link', { name: /^ConusAI/ })).toHaveClass(
      'h-10',
      'w-full',
      'shrink-0',
    )
    expect(screen.getByRole('link', { name: 'Configure' })).not.toHaveClass(
      'bg-primary',
      'bg-primary/10',
    )
    expect(screen.getByText('Second bot')).toBeInTheDocument()
  })
})
