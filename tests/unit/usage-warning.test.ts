import { describe, it, expect } from 'vitest'
import { shouldWarnUsage, USAGE_WARNING_THRESHOLD } from '@/lib/usage'
import { companyNameFromWebsite } from '@/lib/invites'

describe('shouldWarnUsage', () => {
  it('warns at/above 80% of a finite limit', () => {
    // starter = 1500 conversations
    expect(shouldWarnUsage(1200, 'starter')).toBe(true)
    expect(shouldWarnUsage(1199, 'starter')).toBe(false)
    expect(shouldWarnUsage(1500, 'starter')).toBe(true)
  })

  it('never warns on unlimited plans', () => {
    expect(shouldWarnUsage(1_000_000, 'enterprise')).toBe(false)
  })

  it('threshold constant is 80%', () => {
    expect(USAGE_WARNING_THRESHOLD).toBe(0.8)
  })
})

describe('companyNameFromWebsite', () => {
  it('derives a capitalized name from the domain', () => {
    expect(companyNameFromWebsite('https://www.homebynb.lt/apie')).toBe('Homebynb')
    expect(companyNameFromWebsite('shop.example.com')).toBe('Shop')
  })
  it('handles empty/broken input', () => {
    expect(companyNameFromWebsite(null)).toBe('')
    expect(companyNameFromWebsite('not a url at all //')).toBe('')
  })
})
