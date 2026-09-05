import { describe, it, expect } from 'vitest'
import { inviteStatusForSignup } from '@/lib/invites'

const invites = [
  { email: 'A@x.com', status: 'pending', created_at: '2026-09-05T10:00:00Z' },
  { email: 'a@x.com', status: 'accepted', created_at: '2026-08-01T10:00:00Z' },
]

describe('inviteStatusForSignup', () => {
  it('uses the newest invite sent after the signup (case-insensitive)', () => {
    expect(inviteStatusForSignup({ email: 'a@x.com', created_at: '2026-09-01T00:00:00Z' }, invites)).toBe('pending')
  })
  it('ignores invites that predate the signup — a re-signup after deletion is New', () => {
    expect(
      inviteStatusForSignup({ email: 'a@x.com', created_at: '2026-09-06T00:00:00Z' }, invites),
    ).toBeNull()
  })
  it('returns null for emails never invited', () => {
    expect(inviteStatusForSignup({ email: 'b@x.com', created_at: '2026-09-01T00:00:00Z' }, invites)).toBeNull()
  })
})
