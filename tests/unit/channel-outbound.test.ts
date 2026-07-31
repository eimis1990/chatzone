import { describe, expect, it } from 'vitest'
import { messengerSendErrorText } from '@/lib/channels/outbound'

describe('messengerSendErrorText', () => {
  it('maps the 24-hour window rejection to agent guidance', () => {
    expect(
      messengerSendErrorText('Messenger send failed (400): This message is sent outside of allowed window.'),
    ).toMatch(/24-hour reply window/)
    expect(messengerSendErrorText('(#10) code 2018278')).toMatch(/24-hour reply window/)
  })

  it('maps token failures to a reconnect hint', () => {
    expect(messengerSendErrorText('Error validating access token: session expired')).toMatch(/token is invalid/)
  })

  it('passes through unknown errors with context', () => {
    expect(messengerSendErrorText('boom')).toBe('Messenger delivery failed: boom')
  })
})
