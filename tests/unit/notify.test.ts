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

describe('usage / signup / invite templates', () => {
  it('usage warning shows the percentage and plan link', async () => {
    const { usageWarningEmail } = await import('@/lib/notify')
    const { subject, html } = usageWarningEmail(1200, 1500, 'https://app.test/app/subscription')
    expect(subject).toContain('80%')
    expect(html).toContain('1,200')
    expect(html).toContain('/app/subscription')
  })

  it('signup notification carries email + website', async () => {
    const { signupNotificationEmail } = await import('@/lib/notify')
    const { html } = signupNotificationEmail('ona@shop.lt', 'https://shop.lt', 'https://app.test/owner/signups')
    expect(html).toContain('ona@shop.lt')
    expect(html).toContain('https://shop.lt')
  })

  it('client invite email names the company and links the invite', async () => {
    const { clientInviteEmail } = await import('@/lib/notify')
    const { subject, html } = clientInviteEmail('HomeByNB', 'https://app.test/accept-invite/tok')
    expect(subject).toContain('HomeByNB')
    expect(html).toContain('/accept-invite/tok')
  })
})
