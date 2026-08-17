import type { SalesEmailTemplateId } from '@/lib/sales-email-templates'

export const SALES_EMAIL_SENDER = 'hello@loqara.com'
export const SALES_EMAIL_DEMO_RECIPIENT = 'e.kudarauskas@gmail.com'
export const SALES_EMAIL_TEMPLATE_ID: SalesEmailTemplateId = 'clean'
export const SALES_EMAIL_OPT_OUT = 'Jei tokie pasiūlymai šiuo metu neaktualūs, tiesiog atsakykite „ne“ – daugiau nerašysiu.'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export function validateSalesEmailSnapshot({
  recipient,
  subject,
  body,
}: {
  recipient: string | null
  subject: string | null
  body: string | null
}): string | null {
  if (!recipient || !EMAIL_RE.test(recipient.trim())) return 'This lead does not have a valid email address.'
  if (!subject?.trim()) return 'This lead does not have a prepared subject.'
  if (!body?.trim()) return 'This lead does not have a prepared email body.'

  const normalized = body.replace(/\r\n?/g, '\n').trim()
  if (!/^Laba diena,\n\s*\n/.test(normalized)) {
    return 'The prepared email must begin with “Laba diena,” followed by a blank line.'
  }
  if (!normalized.endsWith(SALES_EMAIL_OPT_OUT)) {
    return 'The prepared email is missing the required opt-out sentence.'
  }
  return null
}

export function renderSalesEmailPlainText(body: string): string {
  return `${body.trim()}\n\n--\nEimantas Kudarauskas\nĮkūrėjas · Loqara\nDI pokalbių ir balso agentai šiuolaikiniam verslui\nhttps://loqara.com`
}
