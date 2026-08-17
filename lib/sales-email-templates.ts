export type SalesEmailTemplateId = 'clean'

export interface SalesEmailTemplateMeta {
  id: SalesEmailTemplateId
  name: string
  description: string
  accent: string
}

export const SALES_EMAIL_TEMPLATE: SalesEmailTemplateMeta = {
  id: 'clean',
  name: 'Clean update',
  description: 'Airy email styling with quiet, structured sections.',
  accent: '#e97634',
}

export interface SalesEmailSections {
  personalized: string[]
  pitch: string[]
  callToAction: string | null
  optOut: string | null
}

const SHARED_PITCH_START = /^Esu\s+Eimantas\b/i
const OPT_OUT_START = /^Jei\s+tokie\s+pasiūlymai\b/i

export function splitSalesEmailBody(body: string): SalesEmailSections {
  const paragraphs = body
    .replace(/\r\n?/g, '\n')
    .split(/\n\s*\n+/)
    .map((paragraph) => paragraph.replace(/\s*\n\s*/g, ' ').trim())
    .filter(Boolean)

  const sharedIndex = paragraphs.findIndex((paragraph) => SHARED_PITCH_START.test(paragraph))
  const personalizedEnd = sharedIndex >= 0 ? sharedIndex : Math.min(2, paragraphs.length)
  const personalized = paragraphs.slice(0, personalizedEnd)
  const shared = paragraphs.slice(personalizedEnd)

  const optOutIndex = shared.findIndex((paragraph) => OPT_OUT_START.test(paragraph))
  const optOut = optOutIndex >= 0 ? shared[optOutIndex] : null
  const beforeOptOut = optOutIndex >= 0 ? shared.slice(0, optOutIndex) : shared
  const ctaIndex = beforeOptOut.findLastIndex((paragraph) => paragraph.endsWith('?'))
  const callToAction = ctaIndex >= 0 ? beforeOptOut[ctaIndex] : null
  const pitch = beforeOptOut.filter((_, index) => index !== ctaIndex)

  return { personalized, pitch, callToAction, optOut }
}

function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;')
}

function paragraphsHtml(paragraphs: string[], color = '#292524'): string {
  return paragraphs
    .map((paragraph) => `<p style="Margin:0 0 18px;color:${color};font-size:16px;line-height:1.65;">${escapeHtml(paragraph)}</p>`)
    .join('')
}

function signatureHtml(logoUrl: string): string {
  return `
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="Margin-top:30px;border-collapse:collapse;">
      <tr>
        <td style="padding:0 13px 0 0;vertical-align:top;">
          <img src="${escapeHtml(logoUrl)}" width="50" height="50" alt="Loqara" style="display:block;width:50px;height:50px;border:0;border-radius:12px;" />
        </td>
        <td style="vertical-align:top;font-family:Arial,Helvetica,sans-serif;">
          <p style="Margin:0;color:#1c1917;font-size:16px;line-height:1.35;font-weight:700;">Eimantas Kudarauskas</p>
          <p style="Margin:3px 0 0;color:#44403c;font-size:14px;line-height:1.4;">Įkūrėjas · Loqara</p>
          <p style="Margin:2px 0 0;color:#a8a29e;font-size:13px;line-height:1.4;">DI pokalbių ir balso agentai šiuolaikiniam verslui</p>
          <p style="Margin:6px 0 0;font-size:14px;line-height:1.4;"><a href="https://loqara.com" style="color:#f36b21;text-decoration:underline;">loqara.com</a></p>
        </td>
      </tr>
    </table>`
}

function cleanTemplate(sections: SalesEmailSections, logoUrl: string): string {
  const pitchRows = sections.pitch
    .map((paragraph) => `
      <tr>
        <td style="padding:17px 20px;border-top:1px solid #e7e5e4;color:#292524;font-size:16px;line-height:1.6;">
          ${escapeHtml(paragraph)}
        </td>
      </tr>`)
    .join('')

  return `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="Margin:0 0 28px;border-collapse:collapse;">
      <tr>
        <td width="42" style="width:42px;padding:0 12px 0 0;vertical-align:middle;">
          <img src="${escapeHtml(logoUrl)}" width="42" height="42" alt="Loqara" style="display:block;width:42px;height:42px;border:0;border-radius:10px;" />
        </td>
        <td style="vertical-align:middle;color:#1c1917;font-size:20px;line-height:1.2;font-weight:700;letter-spacing:-.3px;">Loqara</td>
      </tr>
    </table>
    <p style="Margin:0 0 28px;color:#1c1917;font-size:27px;line-height:1.25;font-weight:700;letter-spacing:-.4px;">Idėja jūsų svetainei</p>
    ${paragraphsHtml(sections.personalized)}
    ${pitchRows ? `
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="Margin:0 0 22px;border-collapse:separate;background:#ffffff;border:1px solid #e7e5e4;border-radius:12px;">
        <tr><td style="padding:14px 20px;background:#fafaf9;border-radius:12px 12px 0 0;color:#78716c;font-size:11px;line-height:1.4;font-weight:700;letter-spacing:1px;text-transform:uppercase;">Trumpai apie Loqara</td></tr>
        ${pitchRows}
      </table>` : ''}
    ${sections.callToAction ? `<p style="Margin:26px 0 0;color:#1c1917;font-size:18px;line-height:1.5;font-weight:700;">${escapeHtml(sections.callToAction)}</p>` : ''}
    ${sections.optOut ? `<p style="Margin:27px 0 0;color:#78716c;font-size:13px;line-height:1.55;">${escapeHtml(sections.optOut)}</p>` : ''}`
}

export function renderSalesEmailHtml({
  body,
  logoUrl = 'https://loqara.com/loqara-email-logo.jpg',
}: {
  body: string
  logoUrl?: string
}): string {
  const sections = splitSalesEmailBody(body)
  const content = cleanTemplate(sections, logoUrl)

  return `<!doctype html>
<html lang="lt">
  <head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
  <body style="Margin:0;padding:0;background:#f5f5f4;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="width:100%;border-collapse:collapse;background:#f5f5f4;">
      <tr><td align="center" style="padding:36px 16px;">
        <table role="presentation" width="640" cellpadding="0" cellspacing="0" border="0" style="width:100%;max-width:640px;border-collapse:separate;background:#ffffff;border:1px solid #e7e5e4;border-top:5px solid #e97634;border-radius:18px;box-shadow:0 10px 35px rgba(41,37,36,.08);">
          <tr><td style="padding:34px 42px 38px;font-family:Arial,Helvetica,sans-serif;">
            ${content}
            <div style="height:1px;background:#e7e5e4;Margin:30px 0 0;"></div>
            ${signatureHtml(logoUrl)}
          </td></tr>
        </table>
      </td></tr>
    </table>
  </body>
</html>`
}
