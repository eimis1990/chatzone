import { NextResponse } from 'next/server'
import { z } from 'zod'
import { generateObject } from 'ai'
import { openai } from '@ai-sdk/openai'
import { getSessionUser } from '@/lib/auth/guards'
import { createServiceClient } from '@/lib/supabase/service'
import { assertPublicUrl, SsrfError } from '@/lib/net/ssrf'
import { createRateLimiter } from '@/lib/ratelimit'

export const maxDuration = 30

// Outbound fetch + LLM call on the owner's behalf — keep it slow.
const limiter = createRateLimiter({ capacity: 5, refillPerSec: 0.2 })

const bodySchema = z.object({ url: z.string().min(1).max(2048) })

const MAX_HTML_BYTES = 600_000
const SITE_SAMPLE_CHARS = 3500
const USER_AGENT = 'Mozilla/5.0 (compatible; LoqaraThemeBot/1.0; +https://www.loqara.io)'

/** Visible-text sample of a page: title + meta description + body text. */
function pageTextSample(html: string): string {
  const title = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] ?? ''
  const metaDesc =
    html.match(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']*)["']/i)?.[1] ?? ''
  const body = html
    .replace(/<(script|style|noscript|svg)\b[\s\S]*?<\/\1>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&[a-z#0-9]+;/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim()
  return `TITLE: ${title.trim()}\nDESCRIPTION: ${metaDesc.trim()}\nPAGE TEXT: ${body}`.slice(
    0,
    SITE_SAMPLE_CHARS,
  )
}

/**
 * "Which library prompt fits this website?" for the configurator's system-
 * prompt picker: fetch the (SSRF-guarded) site, classify it against the
 * owner's prompt library with a small model, and return the best match with a
 * one-line reason. Owner-only — the prompt library itself is owner-only.
 */
export async function POST(req: Request) {
  const session = await getSessionUser()
  if (session?.profile.role !== 'owner') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  if (!limiter.check(session.id)) {
    return NextResponse.json({ error: 'Please wait a moment and try again.' }, { status: 429 })
  }

  const parsed = bodySchema.safeParse(await req.json().catch(() => null))
  if (!parsed.success) {
    return NextResponse.json({ error: 'Enter a website URL' }, { status: 400 })
  }

  // Accept bare domains ("gerimas.lt") the way people type them.
  const raw = parsed.data.url.trim()
  const withProtocol = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`
  let pageUrl: URL
  try {
    pageUrl = await assertPublicUrl(withProtocol)
  } catch (err) {
    const message = err instanceof SsrfError ? err.message : 'Invalid URL'
    return NextResponse.json({ error: message }, { status: 400 })
  }

  let html: string
  try {
    const res = await fetch(pageUrl, {
      headers: { 'user-agent': USER_AGENT, accept: 'text/html' },
      redirect: 'follow',
      signal: AbortSignal.timeout(10_000),
    })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    await assertPublicUrl(res.url || pageUrl.toString()) // re-check after redirects
    html = (await res.text()).slice(0, MAX_HTML_BYTES)
  } catch {
    return NextResponse.json(
      { error: 'Could not load that page — check the URL and try again' },
      { status: 422 },
    )
  }

  const svc = createServiceClient()
  const { data: prompts } = await svc
    .from('system_prompts')
    .select('id, name, content')
    .order('created_at', { ascending: false })
  if (!prompts?.length) {
    return NextResponse.json({ error: 'The prompt library is empty' }, { status: 422 })
  }

  const catalog = prompts
    .map((p) => `- id "${p.id}" — "${p.name}": ${p.content.slice(0, 220).replace(/\s+/g, ' ')}`)
    .join('\n')

  try {
    const { object } = await generateObject({
      model: openai('gpt-4o-mini'),
      schema: z.object({
        promptId: z.string().describe('The id of the single best-fitting prompt'),
        reason: z
          .string()
          .describe(
            'One short plain-English sentence, addressed to the person configuring the bot, saying why this prompt fits this business',
          ),
      }),
      prompt:
        'A chatbot is being configured for the website below. Pick the ONE system prompt from ' +
        'the library that best fits what this business does. Judge by business type (selling ' +
        'physical products online → e-commerce; a furniture/interior store → the furniture ' +
        'prompt; services, bookings, clinics, B2B → their prompts). If nothing fits well, pick ' +
        'the closest general option.\n\nPROMPT LIBRARY:\n' +
        catalog +
        '\n\nWEBSITE:\nURL: ' +
        pageUrl.toString() +
        '\n' +
        pageTextSample(html),
    })

    const match = prompts.find((p) => p.id === object.promptId)
    if (!match) {
      return NextResponse.json({ error: 'Could not pick a prompt for that site' }, { status: 422 })
    }
    return NextResponse.json({ promptId: match.id, name: match.name, reason: object.reason })
  } catch (err) {
    console.error('[prompt-recommendation] classification failed:', err)
    return NextResponse.json(
      { error: 'Could not analyse that site right now — pick a prompt manually' },
      { status: 502 },
    )
  }
}
