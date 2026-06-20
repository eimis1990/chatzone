/** Extracts the main readable text from an HTML string. */
export async function extractReadableText(html: string, url: string): Promise<string> {
  // Dynamic imports keep jsdom (ESM-only in recent versions) out of the
  // module graph at build time, avoiding the require()-of-ESM error.
  const { JSDOM } = await import('jsdom')
  const { Readability } = await import('@mozilla/readability')
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
  if (
    mime === 'text/plain' ||
    mime === 'text/markdown' ||
    mime === 'text/x-markdown' ||
    mime.startsWith('text/')
  ) {
    return buffer.toString('utf8').trim()
  }
  if (mime === 'application/pdf') {
    const { PDFParse } = await import('pdf-parse')
    const parser = new PDFParse({ data: new Uint8Array(buffer) })
    const result = await parser.getText()
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
  // Fallback: some browsers send an empty/generic MIME for .md/.txt uploads.
  // If the bytes look like UTF-8 text (no NUL), treat them as plain text.
  if ((mime === '' || mime === 'application/octet-stream') && !buffer.includes(0)) {
    return buffer.toString('utf8').trim()
  }
  throw new Error(`Unsupported file type: ${mime}`)
}

/** Fetches a URL and extracts its readable text. `fetchImpl` is injectable for tests. */
export async function parseUrl(url: string, fetchImpl: typeof fetch = fetch): Promise<string> {
  const res = await fetchImpl(url)
  if (!res.ok) throw new Error(`Failed to fetch ${url}: HTTP ${res.status}`)
  const html = await res.text()
  return await extractReadableText(html, url)
}
