import { JSDOM } from 'jsdom'
import { Readability } from '@mozilla/readability'

/** Extracts the main readable text from an HTML string. */
export function extractReadableText(html: string, url: string): string {
  const dom = new JSDOM(html, { url })
  const reader = new Readability(dom.window.document)
  const article = reader.parse()
  const text = article?.textContent ?? dom.window.document.body?.textContent ?? ''
  return text.replace(/\n{3,}/g, '\n\n').trim()
}

/**
 * Parses an uploaded knowledge-base file into plain text.
 * Supports text/markdown directly, PDF via pdf-parse, DOCX via mammoth.
 */
export async function parseFile(buffer: Buffer, mime: string): Promise<string> {
  if (mime === 'text/plain' || mime === 'text/markdown' || mime === 'text/x-markdown') {
    return buffer.toString('utf8').trim()
  }
  if (mime === 'application/pdf') {
    // Import the lib entry directly to avoid pdf-parse's debug harness.
    const pdfParse = (await import('pdf-parse')).default
    const result = await pdfParse(buffer)
    return result.text.trim()
  }
  if (
    mime === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
    mime === 'application/msword'
  ) {
    const mammoth = await import('mammoth')
    const result = await mammoth.extractRawText({ buffer })
    return result.value.trim()
  }
  throw new Error(`Unsupported file type: ${mime}`)
}

/** Fetches a URL and extracts its readable text. `fetchImpl` is injectable for tests. */
export async function parseUrl(url: string, fetchImpl: typeof fetch = fetch): Promise<string> {
  const res = await fetchImpl(url)
  if (!res.ok) throw new Error(`Failed to fetch ${url}: HTTP ${res.status}`)
  const html = await res.text()
  return extractReadableText(html, url)
}
