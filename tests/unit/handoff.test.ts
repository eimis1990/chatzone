import { describe, it, expect } from 'vitest'
import {
  nextHandoffStatus,
  botShouldReply,
  detectHandoffIntent,
  HANDOFF_ACK,
} from '@/lib/handoff'

describe('nextHandoffStatus', () => {
  it('take → live, resolve → resolved, return → bot (from any state)', () => {
    const states = ['bot', 'requested', 'live', 'resolved'] as const
    for (const s of states) {
      expect(nextHandoffStatus(s, 'take')).toBe('live')
      expect(nextHandoffStatus(s, 'resolve')).toBe('resolved')
      expect(nextHandoffStatus(s, 'return')).toBe('bot')
    }
  })
})

describe('botShouldReply', () => {
  it('replies only when the bot is in control or the episode resolved', () => {
    expect(botShouldReply('bot')).toBe(true)
    expect(botShouldReply('resolved')).toBe(true)
    expect(botShouldReply('requested')).toBe(false)
    expect(botShouldReply('live')).toBe(false)
  })
})

describe('detectHandoffIntent (en)', () => {
  it('matches explicit human-request phrasing', () => {
    expect(detectHandoffIntent('Can I talk to a person?')).toBe(true)
    expect(detectHandoffIntent('I want to speak to someone')).toBe(true)
    expect(detectHandoffIntent('connect me to a real human please')).toBe(true)
    expect(detectHandoffIntent('I need a representative')).toBe(true)
    expect(detectHandoffIntent('live agent now')).toBe(true)
  })

  it('does not fire on ordinary questions', () => {
    expect(detectHandoffIntent('what are your opening hours?')).toBe(false)
    expect(detectHandoffIntent('do you have this in red?')).toBe(false)
    expect(detectHandoffIntent('thanks, that helps')).toBe(false)
  })
})

describe('detectHandoffIntent (lt)', () => {
  it('matches Lithuanian human-request phrasing', () => {
    expect(detectHandoffIntent('noriu pasikalbėti su žmogumi', 'lt')).toBe(true)
    expect(detectHandoffIntent('sujunkite su operatoriumi', 'lt')).toBe(true)
    expect(detectHandoffIntent('su darbuotoju prašau', 'lt')).toBe(true)
    expect(detectHandoffIntent('ar galiu kalbėti su konsultantu?', 'lt')).toBe(true)
  })

  it('is diacritic-insensitive (visitors often drop LT diacritics)', () => {
    // The exact phrase from the bug report — "real zmogumi", no diacritics.
    expect(detectHandoffIntent('gal galiu kalbetis su real zmogumi?', 'lt')).toBe(true)
    expect(detectHandoffIntent('noriu su zmogumi pasikalbeti', 'lt')).toBe(true)
  })

  it('still catches English phrasing on a Lithuanian bot', () => {
    expect(detectHandoffIntent('talk to a person', 'lt')).toBe(true)
  })

  it('does not fire on ordinary Lithuanian questions', () => {
    expect(detectHandoffIntent('kokia šito kaina?', 'lt')).toBe(false)
    // "žmonės" = plural "people", not a singular human-agent request.
    expect(detectHandoffIntent('ar dirba žmonės savaitgalį?', 'lt')).toBe(false)
  })
})

describe('widget request phrases are self-detecting', () => {
  // The widget escalation button sends these; the chat route must recognize them.
  it('English canned phrase escalates', () => {
    expect(detectHandoffIntent('I would like to talk to a person.', 'en')).toBe(true)
  })
  it('Lithuanian canned phrase escalates', () => {
    expect(detectHandoffIntent('Norėčiau pasikalbėti su žmogumi.', 'lt')).toBe(true)
  })
})

describe('HANDOFF_ACK', () => {
  it('has localized acknowledgements', () => {
    expect(HANDOFF_ACK.en.length).toBeGreaterThan(0)
    expect(HANDOFF_ACK.lt.length).toBeGreaterThan(0)
  })
})
