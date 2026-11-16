import { describe, it, expect, vi } from 'vitest'
import { canConnectChannels } from '@/lib/channels/entitlement'
import { hasMessengerAccess } from '@/lib/channels/access'
import type { SupabaseClient } from '@supabase/supabase-js'

describe('Messenger access', () => {
  it('requires entitlement outside internal orgs, including local development', () => {
    expect(canConnectChannels(null)).toBe(false)
    expect(canConnectChannels({ messenger_addon: false })).toBe(false)
    expect(canConnectChannels({ messenger_addon: true })).toBe(true)
    expect(canConnectChannels({ is_demo: true })).toBe(true)
    expect(canConnectChannels({ is_platform: true })).toBe(true)
  })
  it('fails closed on a database error', async () => {
    const chain = { select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(), maybeSingle: vi.fn().mockResolvedValue({ error: { message: 'outage' } }) }
    const db = { from: () => chain } as unknown as SupabaseClient
    await expect(hasMessengerAccess(db, 'org')).rejects.toThrow('verify Messenger')
    expect(chain.eq).toHaveBeenCalledWith('id', 'org')
  })
})
