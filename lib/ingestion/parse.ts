/**
 * Extracts the main content of a page as **Markdown** — preserving headings,
 * lists and paragraph breaks. Structured Markdown chunks far better than flat
 * text (the chunker is heading-aware) and fixes blocks running together (e.g.
 * "…kasdienybei.Mums svarbu…"). Readability strips nav/boilerplate; Turndown
 * converts the cleaned HTML to Markdown, falling back to the whole body.
 */
export async function extractReadableText(html: string, url: string): Promise<string> {
  // Dynamic imports keep jsdom (ESM-only in recent versions) out of the
  // module graph at build time, avoiding the require()-of-ESM error.
  const { JSDOM } = await import('jsdom')
  const { Readability } = await import('@mozilla/readability')
  const TurndownService = (await import('turndown')).default

  const dom = new JSDOM(html, { url })
  const article = new Readability(dom.window.document).parse()

  const td = new TurndownService({ headingStyle: 'atx', bulletListMarker: '-', codeBlockStyle: 'fenced' })
  td.remove(['script', 'style', 'noscript'])

  // Prefer Readability's cleaned article HTML; else fall back to the body with
  // chrome (header/footer/nav) removed.
  let bodyHtml = article?.content
  if (!bodyHtml) {
    td.remove(['header', 'footer', 'nav', 'aside'])
    bodyHtml = dom.window.document.body?.innerHTML ?? html
  }

  const title = article?.title?.trim()
  let md = td.turndown(bodyHtml)
  if (title && !md.startsWith('#')) md = `# ${title}\n\n${md}`
  return md.replace(/\n{3,}/g, '\n\n').trim()
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
  // Real-network path only (tests inject a mock fetch and get the direct path).
  if (fetchImpl === fetch) {
    const { assertPublicUrl } = await import('@/lib/net/ssrf')
    await assertPublicUrl(url)
    // Prefer Jina Reader: it renders JS and returns clean Markdown, so JS-heavy
    // sites yield real content. Falls through to a direct fetch if unavailable.
    const { readerMarkdown } = await import('@/lib/ingestion/jina-reader')
    const md = await readerMarkdown(url)
    if (md) return md
  }
  const res = await fetchImpl(url)
  if (!res.ok) throw new Error(`Failed to fetch ${url}: HTTP ${res.status}`)
  const html = await res.text()
  return await extractReadableText(html, url)
}
