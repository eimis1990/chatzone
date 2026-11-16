import { describe, it, expect } from 'vitest'
import { knowledgeSourceDate } from '@/lib/knowledge-dates'
import type { KnowledgeSource } from '@/lib/types'

const source: KnowledgeSource = { id: 'source', bot_id: 'bot', name: 'FAQ', type: 'url', status: 'ready', error_message: null, metadata: {}, created_at: '2026-07-28T00:00:00Z', updated_at: '2026-11-13T00:00:00Z' }
describe('knowledge source dates', () => {
  it('shows the latest successful check even when content did not change', () => {
    expect(knowledgeSourceDate({ ...source, metadata: { lastCheckedAt: '2026-11-16T00:00:00Z', indexedAt: source.updated_at } })).toEqual({ label: 'Checked', date: '2026-11-16T00:00:00Z' })
  })
  it('shows a newer manual edit instead of an older website check', () => {
    expect(knowledgeSourceDate({ ...source, metadata: { lastCheckedAt: source.created_at, indexedAt: source.updated_at } })).toEqual({ label: 'Updated', date: source.updated_at })
  })
  it('does not mistake a failed attempt for a successful update', () => {
    expect(knowledgeSourceDate({ ...source, status: 'error', metadata: { indexedAt: source.created_at } })).toEqual({ label: 'Updated', date: source.created_at })
    expect(knowledgeSourceDate({ ...source, status: 'error' })).toEqual({ label: 'Added', date: source.created_at })
  })
  it('labels legacy dates honestly and ignores malformed metadata', () => {
    expect(knowledgeSourceDate({ ...source, metadata: { lastCheckedAt: 'nonsense' } })).toEqual({ label: 'Processed', date: source.updated_at })
  })
})
