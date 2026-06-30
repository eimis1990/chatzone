import { Marked, type Tokens } from 'marked'

/**
 * Renders a bot message as safe, lightly-formatted HTML for the chat bubble.
 *
 * Supports: **bold**, bullet / numbered lists, `inline code`, links (http(s),
 * mailto, tel — schemes validated), autolinked bare URLs and emails, and
 * tappable international phone numbers (`+…` → `tel:`).
 *
 * Hardened against XSS: raw HTML and images are dropped, link hrefs are limited
 * to a safe scheme allowlist, and all text is escaped by marked's defaults. The
 * model's inline "[source: …]" citations are stripped.
 */

// "[source: <id>]" — the grounding tag the model used to echo into replies.
const SOURCE_RE = /[ \t]*\[source:[^\]\n]*\]/gi

function escapeText(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

function escapeAttr(s: string): string {
  return escapeText(s).replace(/"/g, '&quot;')
}

/** Allow only safe link schemes; everything else renders as plain text. */
function safeHref(href: string): string | null {
  const h = (href || '').trim()
  if (/^(https?:\/\/|mailto:|tel:)/i.test(h)) return h
  // Bare email (gfm autolink may omit the mailto: scheme).
  if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(h)) return `mailto:${h}`
  return null
}

// International phone numbers only (must start with "+"), so we don't turn
// prices, years, or order numbers into call links.
const PHONE_RULE = /^\+\d[\d\s().-]{5,}\d/

interface PhoneToken extends Tokens.Generic {
  type: 'phone'
  tel: string
}

const phoneExtension = {
  name: 'phone',
  level: 'inline' as const,
  start(src: string): number | undefined {
    const i = src.search(/\+\d/)
    return i < 0 ? undefined : i
  },
  tokenizer(src: string): PhoneToken | undefined {
    const m = PHONE_RULE.exec(src)
    if (!m) return undefined
    const digits = m[0].replace(/\D/g, '')
    if (digits.length < 7 || digits.length > 15) return undefined
    return { type: 'phone', raw: m[0], tel: `+${digits}`, text: m[0] }
  },
  renderer(token: Tokens.Generic): string {
    const t = token as PhoneToken
    return `<a href="tel:${t.tel}">${escapeText(String(t.text))}</a>`
  },
}

const md = new Marked({ gfm: true, breaks: true })
md.use({
  extensions: [phoneExtension],
  renderer: {
    html: () => '',
    image: () => '',
    link({ href, text }: Tokens.Link): string {
      const safe = safeHref(href)
      const label = escapeText(text)
      if (!safe) return label
      const external = /^https?:/i.test(safe)
      const rel = external ? ' target="_blank" rel="noopener noreferrer nofollow"' : ''
      return `<a href="${escapeAttr(safe)}"${rel}>${label}</a>`
    },
  },
})

/** Remove the model's inline "[source: …]" citations (used for plain text too). */
export function stripCitations(raw: string): string {
  return (raw || '').replace(SOURCE_RE, '')
}

/** Render a finished bot message to safe formatted HTML. */
export function formatMessage(raw: string): string {
  const cleaned = stripCitations(raw).trim()
  if (!cleaned) return ''
  return (md.parse(cleaned, { async: false }) as string).trim()
}

/**
 * Convert a bot message into plain, speech-friendly text for TTS — so the same
 * "rich" reply that renders nicely in the bubble doesn't get read aloud with its
 * Markdown symbols (no "asterisk asterisk", no spelled-out URLs). Strips
 * Markdown, drops links' URLs (keeps the label) and bare URLs, and turns line
 * breaks into sentence pauses.
 */
export function toSpeechText(raw: string): string {
  let t = stripCitations(raw || '')
  t = t.replace(/```[\s\S]*?```/g, ' ') // code blocks
  t = t.replace(/!\[[^\]]*\]\([^)]*\)/g, ' ') // images
  t = t.replace(/\[([^\]]+)\]\([^)]*\)/g, '$1') // links → just the label
  t = t.replace(/`([^`]+)`/g, '$1') // inline code
  t = t.replace(/^\s{0,3}#{1,6}\s+/gm, '') // headings
  t = t.replace(/^\s*>\s?/gm, '') // blockquotes
  t = t.replace(/^\s*([-*+]|\d+[.)])\s+/gm, '') // list markers
  t = t.replace(/(\*\*|__|\*|_|~~)/g, '') // bold / italic / strike markers
  t = t.replace(/https?:\/\/\S+/g, ' ') // leftover bare URLs (don't read aloud)
  t = t.replace(/[ \t]*\n+[ \t]*/g, '. ') // line breaks → spoken pauses
  t = t.replace(/([:.!?,;])\s*\.\s/g, '$1 ') // avoid "word:." / "word.."
  t = t.replace(/\s{2,}/g, ' ').trim()
  return t
}
