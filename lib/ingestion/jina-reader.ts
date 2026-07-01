/**
 * Jina Reader (https://jina.ai/reader) — fetches a URL through r.jina.ai, which
 * renders JavaScript in a real browser and returns clean Markdown. This is how
 * we get real content from JS-rendered sites (SPAs / modern stores) that a plain
 * server fetch can't see.
 *
 * Works keyless (IP rate-limited); set JINA_API_KEY for higher limits. Returns
 * null on any failure so the caller can fall back to a direct fetch + Readability.
 */
const READER = 'https://r.jina.ai/'

export async function readerMarkdown(
  url: string,
  fetchImpl: typeof fetch = fetch,
): Promise<string | null> {
  const headers: Record<string, string> = {
    Accept: 'text/markdown',
    'X-Return-Format': 'markdown',
  }
  const key = process.env.JINA_API_KEY
  if (key) headers.Authorization = `Bearer ${key}`

  try {
    const res = await fetchImpl(`${READER}${url}`, {
      headers,
      signal: AbortSignal.timeout(30_000),
    })
    if (!res.ok) return null
    const md = (await res.text()).trim()
    return md.length > 0 ? md : null
  } catch {
    // Timeout / network / rate-limit → let the caller fall back.
    return null
  }
}
