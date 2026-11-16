import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { SupabaseClient } from '@supabase/supabase-js'
const mocks = vi.hoisted(() => ({ access: vi.fn(), send: vi.fn(), connection: vi.fn() }))
vi.mock('@/lib/conversation-access', () => ({ canHandleConversation: async () => true }))
vi.mock('@/lib/channels/access', () => ({ hasMessengerAccess: mocks.access }))
vi.mock('@/lib/channels/meta', () => ({ sendTextMessage: mocks.send }))
vi.mock('@/lib/supabase/service', () => ({ createServiceClient: () => ({ from: () => ({ select: () => ({ eq: () => ({ maybeSingle: mocks.connection }) }) }) }) }))
import { deliverAgentMessage } from '@/lib/channels/outbound'
const db = { from: vi.fn(() => ({ select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: { channel: 'messenger', visitor_id: 'visitor', channel_connection_id: 'connection' } }) }) }) })) } as unknown as SupabaseClient
beforeEach(() => { vi.clearAllMocks(); mocks.connection.mockResolvedValue({ data: { org_id: 'org', status: 'active' } }) })
describe('Messenger Inbox billing guard', () => {
  it('does not send or save replies after the add-on is removed', async () => {
    mocks.access.mockResolvedValue(false)
    expect(await deliverAgentMessage(db, 'conversation', 'Hello', 'agent')).toMatchObject({ ok: false, error: expect.stringContaining('inactive') })
    expect(mocks.send).not.toHaveBeenCalled()
    expect(db.from).toHaveBeenCalledTimes(1)
  })
  it('fails closed when entitlement lookup fails', async () => {
    mocks.access.mockRejectedValue(new Error('Database unavailable'))
    expect(await deliverAgentMessage(db, 'conversation', 'Hello', 'agent')).toMatchObject({ ok: false, error: expect.stringContaining('verify') })
    expect(mocks.send).not.toHaveBeenCalled()
  })
  it('requires an active connection even if the add-on was purchased', async () => {
    mocks.connection.mockResolvedValue({ data: { org_id: 'org', status: 'disconnected' } })
    expect(await deliverAgentMessage(db, 'conversation', 'Hello', 'agent')).toMatchObject({ ok: false, error: expect.stringContaining('disconnected') })
    expect(mocks.access).not.toHaveBeenCalled()
    expect(mocks.send).not.toHaveBeenCalled()
  })
})
