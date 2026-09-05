import { describe, it, expect } from 'vitest'
import { usersToDeleteWithOrg } from '@/lib/orgs/delete'

describe('usersToDeleteWithOrg', () => {
  it('deletes members who belong only to this org', () => {
    expect(usersToDeleteWithOrg([{ userId: 'a', role: 'client', membershipCount: 1 }])).toEqual(['a'])
  })
  it('keeps accounts that belong to other orgs too', () => {
    expect(usersToDeleteWithOrg([{ userId: 'a', role: 'client', membershipCount: 2 }])).toEqual([])
  })
  it('never deletes platform owners, even if they are a member', () => {
    expect(usersToDeleteWithOrg([{ userId: 'o', role: 'owner', membershipCount: 1 }])).toEqual([])
  })
})
