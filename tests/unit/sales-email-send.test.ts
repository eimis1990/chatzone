import { describe, expect, it } from 'vitest'
import {
  renderSalesEmailPlainText,
  SALES_EMAIL_DEMO_RECIPIENT,
  SALES_EMAIL_OPT_OUT,
  SALES_EMAIL_TEMPLATE_ID,
  validateSalesEmailSnapshot,
} from '@/lib/sales-email-send'

const VALID_BODY = `Laba diena,

Individualus pastebėjimas.

Esu Eimantas, kuriu „Loqara“.

${SALES_EMAIL_OPT_OUT}`

describe('sales email sending', () => {
  it('uses one fixed design and one fixed demo recipient', () => {
    expect(SALES_EMAIL_TEMPLATE_ID).toBe('clean')
    expect(SALES_EMAIL_DEMO_RECIPIENT).toBe('e.kudarauskas@gmail.com')
  })

  it('validates the live recipient, subject, greeting, and opt-out', () => {
    expect(validateSalesEmailSnapshot({
      recipient: 'info@example.lt',
      subject: 'Trumpas pasiūlymas',
      body: VALID_BODY,
    })).toBeNull()

    expect(validateSalesEmailSnapshot({
      recipient: 'not-an-email',
      subject: 'Trumpas pasiūlymas',
      body: VALID_BODY,
    })).toMatch(/valid email/i)

    expect(validateSalesEmailSnapshot({
      recipient: 'info@example.lt',
      subject: 'Trumpas pasiūlymas',
      body: VALID_BODY.replace(SALES_EMAIL_OPT_OUT, 'Iki pasimatymo.'),
    })).toMatch(/opt-out/i)
  })

  it('adds the branded signature to the plain-text fallback', () => {
    const text = renderSalesEmailPlainText(VALID_BODY)

    expect(text).toContain(VALID_BODY)
    expect(text).toContain('Eimantas Kudarauskas')
    expect(text).toContain('https://loqara.com')
  })
})
