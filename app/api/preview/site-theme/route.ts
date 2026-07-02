import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createServerClient } from '@/lib/supabase/server'
import { assertPublicUrl, SsrfError } from '@/lib/net/ssrf'
import { extractSiteTheme, paletteToTheme } from '@/lib/theme-extract'
import { createRateLimiter } from '@/lib/ratelimit'

export const maxDuration = 30

// This route makes outbound fetches on the user's behalf — keep it slow.
const limiter = createRateLimiter({ capacity: 5, refillPerSec: 0.2 })

// "Match my website" for the configurator's Appearance section: fetch the
// given page (SSRF-guarded) plus its first same-origin stylesheet, extract a
// brand palette, and return the partial widget theme to apply in the form.
// Authenticated like the other /api/preview routes — any signed-in user
// (owner or client) may use it; the target URL is validated, not trusted.

const bodySchema = z.object({ url: z.string().min(1).max(2048) })

const MAX_BYTES = 600_000
const USER_AGENT =
  'Mozilla/5.0 (compatible; LoqaraThemeBot/1.0; +https://www.loqara.io)'

/** Fetch a text resource with a timeout + size cap, re-checking the final URL
 *  after redirects (assertPublicUrl only validates the first hop). */
async function fetchText(
  url: string,
  timeoutMs: number,
): Promise<{ text: string; finalUrl: string } | null> {
  try {
    const res = await fetch(url, {
      headers: { 'user-agent': USER_AGENT, accept: 'text/html,text/css,*/*;q=0.8' },
      redirect: 'follow',
      signal: AbortSignal.timeout(timeoutMs),
    })
    if (!res.ok) return null
    const finalUrl = res.url || url
    await assertPublicUrl(finalUrl)
    const text = await res.text()
    return { text: text.slice(0, MAX_BYTES), finalUrl }
  } catch {
    return null
  }
}

/** First same-origin <link rel="stylesheet"> href, resolved absolute. */
function firstSameOriginStylesheet(html: string, pageUrl: string): string | null {
  const origin = new URL(pageUrl).origin
  for (const m of html.matchAll(/<link\b[^>]*>/gi)) {
    const tag = m[0]
    const rel = tag.match(/rel\s*=\s*["']([^"']*)["']/i)?.[1] ?? ''
    if (!/\bstylesheet\b/i.test(rel)) continue
    const href = tag.match(/href\s*=\s*["']([^"']+)["']/i)?.[1]
    if (!href) continue
    try {
      const resolved = new URL(href, pageUrl)
      if (resolved.origin === origin) return resolved.toString()
    } catch {
      // unparseable href — skip
    }
  }
  return null
}

export async function POST(req: Request) {
  const parsed = bodySchema.safeParse(await req.json().catch(() => null))
  if (!parsed.success) {
    return NextResponse.json({ error: 'Enter a website URL' }, { status: 400 })
  }

  const supabase = await createServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Not signed in' }, { status: 401 })
  if (!limiter.check(user.id)) {
    return NextResponse.json({ error: 'Please wait a moment and try again.' }, { status: 429 })
  }

  // Accept bare domains ("example.com") the way users type them.
  const raw = parsed.data.url.trim()
  const withProtocol = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`

  let pageUrl: URL
  try {
    pageUrl = await assertPublicUrl(withProtocol)
  } catch (err) {
    const message = err instanceof SsrfError ? err.message : 'Invalid URL'
    return NextResponse.json({ error: message }, { status: 400 })
  }

  const page = await fetchText(pageUrl.toString(), 10_000)
  if (!page) {
    return NextResponse.json(
      { error: 'Could not load that page — check the URL and try again' },
      { status: 422 },
    )
  }

  // First same-origin stylesheet — enough for most sites' brand tokens.
  let css = ''
  const cssUrl = firstSameOriginStylesheet(page.text, page.finalUrl)
  if (cssUrl) {
    try {
      await assertPublicUrl(cssUrl)
      css = (await fetchText(cssUrl, 8_000))?.text ?? ''
    } catch {
      // stylesheet blocked/unreachable — the HTML alone often suffices
    }
  }

  const palette = extractSiteTheme(page.text, css)
  const theme = paletteToTheme(palette)

  // Site logo → company logo suggestion. We don't fetch it (the visitor's
  // browser will, from the client's own site) — just resolve + sanity-check it.
  let logoUrl: string | null = null
  if (palette.logo) {
    try {
      const resolved = new URL(palette.logo, page.finalUrl)
      if (resolved.protocol === 'https:' || resolved.protocol === 'http:') {
        logoUrl = resolved.toString()
      }
    } catch {
      // unresolvable logo href — skip
    }
  }

  if (!theme.primaryColor && !theme.backgroundColor && !theme.fontFamily && !logoUrl) {
    return NextResponse.json(
      { error: "Couldn't find usable brand colors on that page" },
      { status: 422 },
    )
  }

  return NextResponse.json({
    theme,
    logoUrl,
    palette: {
      primary: palette.primary ?? null,
      background: palette.pageBackground ?? null,
      surface: palette.surface ?? null,
      colors: palette.colors.slice(0, 6),
      font: palette.font ?? null,
    },
  })
}
