import { describe, it, expect, vi } from 'vitest'
import type { SupabaseClient } from '@supabase/supabase-js'
import { conversationPage, loadConversationPage } from '@/lib/conversations'

function database(responses: unknown[]) {
  const query = { select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(), order: vi.fn().mockReturnThis(), range: vi.fn() }
  for (const response of responses) query.range.mockResolvedValueOnce(response)
  const db = { from: vi.fn(() => query) } as unknown as SupabaseClient
  return { db, query }
}

describe('conversation pagination', () => {
  it.each([undefined, '0', '-1', '1.5', ['2'], '1e4', '99999999999999999'])('rejects invalid page %j', (value) => {
    expect(conversationPage(value)).toBe(1)
  })
  it('loads the last seven conversations beyond the old 1000-row ceiling', async () => {
    const rows = Array.from({ length: 7 }, (_, i) => ({ id: `old-${i}`, messages: [{ count: 1500 }], negative_messages: [{ count: 1 }] }))
    const { db, query } = database([{ data: rows, error: null, count: 1007 }])
    const page = await loadConversationPage(db, 'home-bot', 21)
    expect(query.range).toHaveBeenCalledWith(1000, 1049)
    expect(query.eq).toHaveBeenCalledWith('bot_id', 'home-bot')
    expect(query.eq).toHaveBeenCalledWith('negative_messages.feedback', 'down')
    expect(query.select.mock.calls[0][0]).toContain('messages(count)')
    expect(page.conversations).toEqual(rows)
    expect(page.total).toBe(1007)
  })
  it('recovers stale page links after retention deletes old conversations', async () => {
    const { db, query } = database([{ data: [], error: null, count: 51 }, { data: [{ id: 'last' }], error: null, count: 51 }])
    expect((await loadConversationPage(db, 'bot', 21)).currentPage).toBe(2)
    expect(query.range).toHaveBeenLastCalledWith(50, 99)
  })
  it('returns database failures explicitly rather than showing an empty history', async () => {
    const error = { message: 'connection failed' }
    const { db } = database([{ data: null, error, count: null }])
    expect((await loadConversationPage(db, 'bot', 1)).error).toBe(error)
  })
})
