import { describe, it, expect } from 'vitest'
import { prefEnabled, leadEmail, handoffEmail } from '@/lib/notify'

describe('prefEnabled', () => {
  it('defaults to ON for missing/empty/legacy prefs', () => {
    expect(prefEnabled(null, 'leadEmails')).toBe(true)
    expect(prefEnabled(undefined, 'handoffEmails')).toBe(true)
    expect(prefEnabled({}, 'leadEmails')).toBe(true)
  })

  it('only an explicit false disables', () => {
    expect(prefEnabled({ leadEmails: false }, 'leadEmails')).toBe(false)
    expect(prefEnabled({ leadEmails: false }, 'handoffEmails')).toBe(true)
    expect(prefEnabled({ handoffEmails: true }, 'handoffEmails')).toBe(true)
  })
})

describe('email templates', () => {
  it('lead email includes bot name, fields, and the leads link', () => {
    const { subject, html } = leadEmail(
      'HomeByNB',
      { email: 'ona@example.lt', name: 'Ona' },
      'https://app.test/app/bots/b1/leads',
    )
    expect(subject).toContain('HomeByNB')
    expect(html).toContain('ona@example.lt')
    expect(html).toContain('Ona')
    expect(html).toContain('https://app.test/app/bots/b1/leads')
  })

  it('handoff email includes the last message and the inbox link', () => {
    const { subject, html } = handoffEmail(
      'HomeByNB',
      'Noriu pasikalbėti su žmogumi',
      'https://app.test/app/bots/b1/inbox',
    )
    expect(subject).toContain('HomeByNB')
    expect(html).toContain('Noriu pasikalbėti su žmogumi')
    expect(html).toContain('/inbox')
  })

  it('escapes user-provided HTML (no injection into admin inboxes)', () => {
    const { html } = handoffEmail('Bot', '<script>alert(1)</script>', 'https://x')
    expect(html).not.toContain('<script>')
    expect(html).toContain('&lt;script&gt;')
  })
})
