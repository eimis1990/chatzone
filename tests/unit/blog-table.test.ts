import { describe, expect, it } from 'vitest'

import { getPostBySlug } from '@/lib/blog'

describe('blog table rendering', () => {
  it('annotates wide tables with column labels for the responsive card layout', () => {
    const post = getPostBySlug('add-voice-ai-to-online-store')

    expect(post).not.toBeNull()
    expect(post?.html).toContain('class="table-wrap table-wrap--wide" data-columns="4"')
    expect(post?.html).toContain('<td data-label="Situation">')
    expect(post?.html).toContain('<td data-label="Voice">Wins</td>')
    expect(post?.html).toContain('<td data-label="Text chat">Awkward</td>')
    expect(post?.html).toContain('<td data-label="Why">No screen or thumbs needed</td>')
  })

  it('keeps compact tables in the standard table layout', () => {
    const post = getPostBySlug('ai-chatbot-for-online-store')

    expect(post).not.toBeNull()
    expect(post?.html).toContain('class="table-wrap table-wrap--compact" data-columns="3"')
  })
})
