import { describe, expect, it } from 'vitest'
import { buildDemandRadarSnapshot } from '@/lib/demand-radar'

const NOW = new Date('2026-08-01T12:00:00.000Z')

describe('buildDemandRadarSnapshot', () => {
  it('groups similar missed product questions and recommends catalog actions', () => {
    const conversations = [
      {
        id: 'c1', visitor_id: 'v1', started_at: '2026-07-31T10:00:00.000Z',
        had_fallback: true, topics: ['dining chairs'],
      },
      {
        id: 'c2', visitor_id: 'v2', started_at: '2026-07-30T10:00:00.000Z',
        success_score: 2, topics: ['dining chairs'],
      },
    ]
    const messages = [
      {
        conversation_id: 'c1', role: 'user' as const,
        content: 'Do you have beige dining chairs under €200?', created_at: '2026-07-31T10:00:00.000Z',
      },
      {
        conversation_id: 'c2', role: 'user' as const,
        content: 'Any beige dining chairs that cost under €200?', created_at: '2026-07-30T10:00:00.000Z',
      },
    ]

    const snapshot = buildDemandRadarSnapshot({ conversations, messages, rangeDays: 30, now: NOW })

    expect(snapshot.opportunities).toHaveLength(1)
    expect(snapshot.opportunities[0].shoppers).toBe(2)
    expect(snapshot.opportunities[0].issueType).toBe('product_gap')
    expect(snapshot.opportunities[0].actions.map((action) => action.id)).toEqual(expect.arrayContaining([
      'fix_product_attributes',
      'add_faq',
      'improve_product_description',
      'create_collection',
      'add_missing_synonym',
      'notify_merchandising_team',
      'publish_correction',
    ]))
  })

  it('redacts emails from evidence and ignores resolved conversations', () => {
    const conversations = [
      { id: 'c1', visitor_id: 'v1', started_at: '2026-07-31T10:00:00.000Z', had_fallback: true },
      { id: 'c2', visitor_id: 'v2', started_at: '2026-07-31T11:00:00.000Z', success_score: 5 },
    ]
    const messages = [
      {
        conversation_id: 'c1', role: 'user' as const,
        content: 'Can you explain returns to buyer@example.com please?', created_at: '2026-07-31T10:00:00.000Z',
      },
      {
        conversation_id: 'c2', role: 'user' as const,
        content: 'Thanks, that answered everything.', created_at: '2026-07-31T11:00:00.000Z',
      },
    ]

    const snapshot = buildDemandRadarSnapshot({ conversations, messages, rangeDays: 30, now: NOW })

    expect(snapshot.opportunities).toHaveLength(1)
    expect(snapshot.opportunities[0].evidence[0].question).toContain('[email removed]')
    expect(snapshot.opportunities[0].evidence[0].question).not.toContain('buyer@example.com')
  })

  it('counts daily demand signals once per conversation and issue type', () => {
    const conversations = [
      { id: 'c1', visitor_id: 'v1', started_at: '2026-07-31T10:00:00.000Z', had_fallback: true },
    ]
    const messages = [
      {
        conversation_id: 'c1', role: 'user' as const,
        content: 'Do you deliver to Latvia?', created_at: '2026-07-31T10:00:00.000Z',
      },
      {
        conversation_id: 'c1', role: 'user' as const,
        content: 'How much is delivery to Latvia?', created_at: '2026-07-31T10:01:00.000Z',
      },
    ]

    const snapshot = buildDemandRadarSnapshot({ conversations, messages, rangeDays: 7, now: NOW })
    const july31 = snapshot.daily.find((day) => day.date === '2026-07-31')

    expect(july31?.storeLimitations).toBe(1)
    expect(snapshot.totalConversations).toBe(1)
    expect(snapshot.totalSignals).toBe(2)
  })
})
