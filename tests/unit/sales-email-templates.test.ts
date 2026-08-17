import { describe, expect, it } from 'vitest'
import { renderSalesEmailHtml, splitSalesEmailBody } from '@/lib/sales-email-templates'

const BODY = `Laba diena,

Individualus pastebėjimas apie įmonę.

Esu Eimantas, kuriu „Loqara“ – lietuviškai bendraujantį AI konsultantą svetainėms.

Tai nėra įprastas DUK langas.

Galiu paruošti trumpą demo.

Ar norėtumėte jį pamatyti?

Jei tokie pasiūlymai šiuo metu neaktualūs, tiesiog atsakykite „ne“ – daugiau nerašysiu.`

describe('sales email templates', () => {
  it('separates the personalized opening, shared pitch, CTA, and opt-out', () => {
    expect(splitSalesEmailBody(BODY)).toEqual({
      personalized: ['Laba diena,', 'Individualus pastebėjimas apie įmonę.'],
      pitch: [
        'Esu Eimantas, kuriu „Loqara“ – lietuviškai bendraujantį AI konsultantą svetainėms.',
        'Tai nėra įprastas DUK langas.',
        'Galiu paruošti trumpą demo.',
      ],
      callToAction: 'Ar norėtumėte jį pamatyti?',
      optOut: 'Jei tokie pasiūlymai šiuo metu neaktualūs, tiesiog atsakykite „ne“ – daugiau nerašysiu.',
    })
  })

  it('renders email-safe paragraph markup', () => {
    const html = renderSalesEmailHtml({ body: BODY })

    expect(html).toContain('<p style=')
    expect(html).toContain('role="presentation"')
    expect(html).toContain('https://loqara.com/loqara-email-logo.jpg')
    expect(html).toContain('Individualus pastebėjimas apie įmonę.')
    expect(html).toContain('Jei tokie pasiūlymai')
    expect(html).not.toContain('white-space: pre-wrap')
  })

  it('renders the clean variation with Loqara accent and structured sections', () => {
    const html = renderSalesEmailHtml({ body: BODY })

    expect(html).toContain('border-top:5px solid #e97634')
    expect(html).toContain('Idėja jūsų svetainei')
    expect(html).toContain('Trumpai apie Loqara')
    expect(html).toContain('border:1px solid #e7e5e4')
    expect(html).not.toContain('mailto:')
    expect(html.match(/color:#292524;font-size:16px;line-height:1\.6;/g)).toHaveLength(3)
    expect(html).toContain('Esu Eimantas')
    expect(html.indexOf('Trumpai apie Loqara')).toBeLessThan(html.indexOf('Esu Eimantas'))
  })

  it('escapes user-controlled lead copy', () => {
    const html = renderSalesEmailHtml({
      body: 'Laba diena,\n\n<script>alert("x")</script>\n\nEsu Eimantas.',
    })

    expect(html).not.toContain('<script>')
    expect(html).toContain('&lt;script&gt;alert(&quot;x&quot;)&lt;/script&gt;')
  })
})
