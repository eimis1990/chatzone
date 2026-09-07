import { describe, expect, it } from 'vitest'
import { leadFieldSchema, botConfigFormSchema } from '@/lib/validation/schemas'

describe('lead capture config schema', () => {
  it('accepts legacy fields without a type', () => {
    expect(leadFieldSchema.parse({ key: 'email', label: 'Email' })).toEqual({ key: 'email', label: 'Email', required: false })
  })

  it('accepts typed fields with select options, rejects unknown types', () => {
    expect(leadFieldSchema.parse({ key: 'occasion', label: 'Šventė', type: 'select', options: ['A', 'B'] }).options).toEqual(['A', 'B'])
    expect(leadFieldSchema.safeParse({ key: 'x', label: 'X', type: 'color' }).success).toBe(false)
  })

  it('validates delivery: emails must be emails, webhook may be empty or a URL', () => {
    const lc = botConfigFormSchema.shape.leadCapture
    const base = { enabled: true, trigger: 'manual', fields: [], offerOnIntent: true, intentHint: 'bookings' }
    expect(lc.safeParse({ ...base, delivery: { emails: ['a@b.lt'], webhookUrl: '' } }).success).toBe(true)
    expect(lc.safeParse({ ...base, delivery: { webhookUrl: 'https://hooks.zapier.com/x' } }).success).toBe(true)
    expect(lc.safeParse({ ...base, delivery: { emails: ['not-an-email'] } }).success).toBe(false)
    expect(lc.safeParse({ ...base, delivery: { webhookUrl: 'ftp:/nope' } }).success).toBe(false)
  })
})
