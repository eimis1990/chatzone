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
    // Strip page chrome, matching the Readability fallback (parse.ts). Without
    // this every page ingests its nav/language-switcher/footer link lists as
    // chunks, which crowd real content out of retrieval (seen: taujenudvaras.lt
    // "kontaktai" queries returning five nav-menu chunks).
    // Keep <header>/<footer> nested in <article>/<li>: list widgets (WordPress
    // The Events Calendar) put each item's title + date in its own <header>, so a
    // bare `header` selector deleted every event name from taujenudvaras.lt/events.
    // Cookie-consent widgets (CookieYes, CLI, OneTrust, Cookiebot, cookieconsent)
    // otherwise ingest as ~4 noise chunks per page.
    'X-Remove-Selector':
      'nav, aside, header:not(article header):not(li header), footer:not(article footer):not(li footer), ' +
      '.cky-consent-container, .cky-modal, #cookie-law-info-bar, #onetrust-consent-sdk, #CybotCookiebotDialog, .cc-window, ' +
      // The Events Calendar single-event prev/next links — read as "upcoming events" otherwise.
      '#tribe-events-footer',
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
