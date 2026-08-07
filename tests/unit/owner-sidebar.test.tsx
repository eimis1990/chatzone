import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { OwnerSidebar } from '@/components/owner/OwnerSidebar'

vi.mock('next/navigation', () => ({
  usePathname: () => '/owner/chatbot/knowledge',
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
}))

describe('OwnerSidebar', () => {
  it('collapses into an accessible icon rail with a quieter active submenu', async () => {
    render(<OwnerSidebar userEmail="owner@example.com" openBugs={3} />)

    const sidebar = screen.getByTestId('owner-sidebar')
    expect(sidebar).toHaveClass('w-64')
    const activeParent = screen.getByRole('link', { name: 'Our chatbot' })
    expect(activeParent).toHaveAttribute('aria-current', 'page')
    expect(activeParent).toHaveClass('bg-white', 'text-neutral-900')
    expect(screen.getByTestId('owner-active-submenu')).not.toHaveClass(
      'ml-4',
      'pl-2',
      'border-l',
    )
    expect(screen.getByTestId('owner-submenu-guide')).toHaveClass(
      'absolute',
      'left-4',
      'w-px',
    )
    expect(screen.getByRole('link', { name: 'Knowledge' })).toHaveClass(
      'w-full',
      'pl-10',
    )

    fireEvent.click(screen.getByRole('button', { name: 'Collapse sidebar' }))

    expect(sidebar).toHaveClass('w-20')
    expect(sidebar).toHaveAttribute('data-tooltips-ready', 'false')
    expect(screen.getByRole('button', { name: 'Expand sidebar' })).toHaveAttribute(
      'aria-expanded',
      'false',
    )
    expect(screen.getByRole('link', { name: 'Dashboard' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Content' })).toHaveAttribute('href', '/owner/content')
    const activeChild = screen.getByRole('link', { name: 'Knowledge' })
    expect(activeChild).toHaveAttribute(
      'aria-current',
      'page',
    )
    expect(activeChild).toHaveClass('text-primary')
    expect(activeChild).not.toHaveClass('bg-primary', 'bg-primary/10')
    expect(screen.getByTestId('owner-active-submenu')).toHaveClass('bg-white/[0.04]')
    expect(screen.queryByTestId('owner-submenu-guide')).not.toBeInTheDocument()
    expect(screen.getByText('Loqara').parentElement).toHaveClass('w-0')
    expect(screen.getByLabelText('3 new bug reports')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Report a bug' })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Sign out' })).toBeInTheDocument()
    expect(screen.queryByText('Main')).not.toBeInTheDocument()
    expect(screen.queryByText('Growth')).not.toBeInTheDocument()
    expect(screen.queryByText('owner@example.com')).not.toBeInTheDocument()

    await waitFor(() => {
      expect(sidebar).toHaveAttribute('data-tooltips-ready', 'true')
    })

    fireEvent.click(screen.getByRole('button', { name: 'Expand sidebar' }))

    expect(sidebar).toHaveClass('w-64')
    expect(sidebar).toHaveAttribute('data-tooltips-ready', 'false')
    expect(screen.getByText('Main')).toBeInTheDocument()
    expect(screen.getByText('Growth')).toBeInTheDocument()
    expect(screen.getByText('Support')).toBeInTheDocument()
    expect(screen.getByText('owner@example.com')).toBeInTheDocument()
  })
})
