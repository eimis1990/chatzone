import { describe, it, expect } from 'vitest'
import { groupVoicesByGender } from '@/lib/voices-group'
import { ownerVoiceSchema } from '@/lib/validation/schemas'
import type { PlatformVoice } from '@/lib/types'

const v = (over: Partial<PlatformVoice>): PlatformVoice => ({
  id: 'x',
  voice_id: 'vx',
  name: 'X',
  gender: 'male',
  preview_url: null,
  sort_order: 0,
  created_at: '',
  ...over,
})

describe('groupVoicesByGender', () => {
  it('splits voices into male/female and maps to options', () => {
    const out = groupVoicesByGender([
      v({ voice_id: 'm1', name: 'Adam', gender: 'male', preview_url: 'http://a' }),
      v({ voice_id: 'f1', name: 'Bella', gender: 'female' }),
    ])
    expect(out.male).toEqual([{ id: 'm1', name: 'Adam', previewUrl: 'http://a' }])
    expect(out.female).toEqual([{ id: 'f1', name: 'Bella' }])
  })

  it('orders by sort_order then name', () => {
    const out = groupVoicesByGender([
      v({ voice_id: 'a', name: 'Zed', gender: 'male', sort_order: 0 }),
      v({ voice_id: 'b', name: 'Amy', gender: 'male', sort_order: 0 }),
      v({ voice_id: 'c', name: 'First', gender: 'male', sort_order: -1 }),
    ])
    expect(out.male.map((o) => o.name)).toEqual(['First', 'Amy', 'Zed'])
  })

  it('returns empty groups for no rows', () => {
    expect(groupVoicesByGender([])).toEqual({ male: [], female: [] })
  })
})

describe('ownerVoiceSchema', () => {
  it('accepts a valid voice', () => {
    expect(() =>
      ownerVoiceSchema.parse({ voiceId: 'v1', name: 'Adam', gender: 'male' }),
    ).not.toThrow()
  })
  it('rejects an invalid gender', () => {
    expect(() => ownerVoiceSchema.parse({ voiceId: 'v1', name: 'A', gender: 'robot' })).toThrow()
  })
})
