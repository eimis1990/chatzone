import { describe, it, expect } from 'vitest'
import { formatMessage, stripCitations } from '@/lib/format-message'

describe('stripCitations', () => {
  it('removes inline [source: …] tags', () => {
    expect(stripCitations('Works anywhere. [source: 70e24026-c7aa-440e-a3fb-7277f80e5546]')).toBe(
      'Works anywhere.',
    )
  })
  it('leaves text without citations untouched', () => {
    expect(stripCitations('Just a normal answer.')).toBe('Just a normal answer.')
  })
})

describe('formatMessage', () => {
  it('strips the source citation from rendered output', () => {
    const html = formatMessage('We support Shopify. [source: abc-123]')
    expect(html).not.toContain('source:')
    expect(html).toContain('We support Shopify.')
  })

  it('renders bold', () => {
    expect(formatMessage('This is **important**.')).toContain('<strong>important</strong>')
  })

  it('renders bullet lists', () => {
    const html = formatMessage('- Shopify\n- WooCommerce\n- Magento')
    expect(html).toContain('<ul>')
    expect(html).toContain('<li>Shopify</li>')
    expect(html).toContain('<li>Magento</li>')
  })

  it('renders numbered lists', () => {
    const html = formatMessage('1. First\n2. Second')
    expect(html).toContain('<ol>')
    expect(html).toContain('<li>First</li>')
  })

  it('renders markdown links with a safe scheme, opening in a new tab', () => {
    const html = formatMessage('See [our docs](https://loqara.com/docs).')
    expect(html).toContain('href="https://loqara.com/docs"')
    expect(html).toContain('target="_blank"')
    expect(html).toContain('rel="noopener noreferrer nofollow"')
    expect(html).toContain('>our docs</a>')
  })

  it('autolinks bare URLs', () => {
    const html = formatMessage('Visit https://loqara.com today')
    expect(html).toContain('href="https://loqara.com"')
  })

  it('links emails as mailto', () => {
    const html = formatMessage('Email us at hello@loqara.com')
    expect(html).toContain('href="mailto:hello@loqara.com"')
  })

  it('turns international phone numbers into tel links (no new tab)', () => {
    const html = formatMessage('Call us on +370 600 12345 anytime')
    expect(html).toContain('href="tel:+37060012345"')
    expect(html).not.toContain('target="_blank"') // tel links stay in-app
  })

  it('does not turn prices or plain numbers into phone links', () => {
    expect(formatMessage('Plans start at €1,500+ per month')).not.toContain('tel:')
    expect(formatMessage('Your order 70024026 is on the way')).not.toContain('tel:')
  })

  it('drops javascript: links, keeping the visible text', () => {
    const html = formatMessage('[click me](javascript:alert(1))')
    expect(html).not.toContain('javascript:')
    expect(html).not.toContain('<a')
    expect(html).toContain('click me')
  })

  it('strips raw HTML tags to prevent injection (inert text may remain)', () => {
    const html = formatMessage('hello <script>alert(1)</script> world')
    expect(html).not.toMatch(/<\s*script/i) // no executable element
    expect(html).toContain('hello')
    expect(html).toContain('world')
  })

  it('drops raw HTML with event-handler attributes', () => {
    const html = formatMessage('<img src=x onerror="alert(1)">')
    expect(html).not.toContain('onerror')
    expect(html).not.toMatch(/<\s*img/i)
  })

  it('escapes stray angle brackets in plain text', () => {
    expect(formatMessage('use a < b comparison')).toContain('a &lt; b')
  })

  it('returns empty string for blank input', () => {
    expect(formatMessage('   ')).toBe('')
    expect(formatMessage('[source: only-a-citation]')).toBe('')
  })
})
