import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { LinkedInBoard } from '@/components/owner/LinkedInBoard'
import type { LinkedInPost } from '@/lib/types'

vi.mock('@/app/(owner)/owner/linkedin/actions', () => ({
  createLinkedInPost: vi.fn(),
  deleteLinkedInPost: vi.fn(),
  updateLinkedInPost: vi.fn(),
  updateLinkedInPostPositions: vi.fn(),
}))

const post: LinkedInPost = {
  id: '10000000-0000-4000-8000-000000000001',
  title: 'The quiet cost of making customers repeat themselves',
  body: 'The first answer can be correct and the experience can still feel broken.',
  link: 'https://www.loqara.com/blog/conversational-ai-vs-chatbot',
  image_url: '/linkedin/21-repeat-yourself.webp',
  image_alt: 'Two overlapping speech trails showing a customer repeating the same request.',
  status: 'draft',
  sort_order: 0,
  posted_at: null,
  created_at: '2026-07-15T00:00:00.000Z',
  updated_at: '2026-07-15T00:00:00.000Z',
}

describe('LinkedInBoard', () => {
  it('keeps board cards compact and opens the complete post in a side drawer', async () => {
    render(<LinkedInBoard initialPosts={[post]} />)

    expect(screen.getByText('Suggested #1')).toBeInTheDocument()
    expect(screen.queryByText(post.body)).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: `Copy ${post.title}` })).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: `Open ${post.title}` }))

    expect(await screen.findByRole('dialog', { name: 'Edit LinkedIn post' })).toBeInTheDocument()
    expect(screen.getByDisplayValue(post.body)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Copy post and link' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Copy image alt text' })).toBeInTheDocument()
  })
})
