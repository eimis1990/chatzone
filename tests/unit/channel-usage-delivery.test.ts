import { beforeEach, expect, it, vi } from 'vitest'
import type { SupabaseClient } from '@supabase/supabase-js'
const { finish } = vi.hoisted(() => ({ finish: vi.fn() }))
vi.mock('@/lib/conversation-sessions', () => ({ finishConversationSession: finish }))
import { deliverMeteredChannelReply } from '@/lib/channels/usage-delivery'
const update = vi.fn(), send = vi.fn()
const db = { from: () => ({ update: (patch: unknown) => {
  const q = { eq: () => q, then: (resolve: (v:unknown)=>unknown) => update(patch).then(resolve) }; return q
} }) } as unknown as SupabaseClient
const input = {provider:'messenger', eventId:'event', orgId:'org', reservation:{session_id:'session',allowed:true,reason:'reserved' as const}}
beforeEach(() => { vi.clearAllMocks(); update.mockResolvedValue({error:null}); send.mockResolvedValue({messageId:'meta_receipt'}); finish.mockResolvedValue(undefined) })
it('journals the reservation and receipt before committing the allowance', async () => {
 await deliverMeteredChannelReply(db,input,send)
 expect(update.mock.calls[0][0]).toEqual({usage_org_id:'org',usage_session_id:'session'})
 expect(update.mock.calls[1][0]).toEqual({outbound_message_id:'meta_receipt'})
 expect(finish).toHaveBeenCalledWith(db,'org',input.reservation,true); expect(send).toHaveBeenCalledOnce()
})
it('does not send when journaling fails and releases its reservation', async () => {
 update.mockResolvedValue({error:{message:'offline'}})
 await expect(deliverMeteredChannelReply(db,input,send)).rejects.toThrow('journal')
 expect(send).not.toHaveBeenCalled(); expect(finish).toHaveBeenCalledWith(db,'org',input.reservation,false)
})
it('releases a failed send without counting it', async () => {
 send.mockRejectedValue(new Error('Meta unavailable'))
 await expect(deliverMeteredChannelReply(db,input,send)).rejects.toThrow('Meta unavailable')
 expect(finish).toHaveBeenCalledWith(db,'org',input.reservation,false)
})
it('retains the delivery receipt for recovery and never resends after an accounting failure', async () => {
 finish.mockRejectedValue(new Error('commit unavailable'))
 await expect(deliverMeteredChannelReply(db,input,send)).rejects.toThrow('Delivered meta_receipt; accounting needs review')
 expect(send).toHaveBeenCalledOnce(); expect(finish).toHaveBeenCalledOnce()
 expect(update).toHaveBeenCalledWith({outbound_message_id:'meta_receipt'})
})
