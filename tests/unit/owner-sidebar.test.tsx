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
    expect(screen.getByRole('link', { name: 'Our chatbot' })).toHaveAttribute(
      'aria-current',
      'page',
    )
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
    expect(activeChild).toHaveClass('bg-primary/10', 'text-primary')
    expect(activeChild).not.toHaveClass('bg-primary')
    expect(screen.getByTestId('owner-active-submenu')).toHaveClass('bg-white/[0.04]')
    expect(screen.queryByTestId('owner-submenu-guide')).not.toBeInTheDocument()
    expect(screen.getByText('Loqara').parentElement).toHaveClass('w-0')
    expect(screen.getByLabelText('3 new bug reports')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Report a bug' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Sign out' })).toBeInTheDocument()
    expect(screen.getByText('Operator panel')).toHaveAttribute('aria-hidden', 'true')
    expect(screen.queryByText('owner@example.com')).not.toBeInTheDocument()

    await waitFor(() => {
      expect(sidebar).toHaveAttribute('data-tooltips-ready', 'true')
    })

    fireEvent.click(screen.getByRole('button', { name: 'Expand sidebar' }))

    expect(sidebar).toHaveClass('w-64')
    expect(sidebar).toHaveAttribute('data-tooltips-ready', 'false')
    expect(screen.getByText('Operator panel')).not.toHaveAttribute('aria-hidden')
    expect(screen.getByText('owner@example.com')).toBeInTheDocument()
  })
})
