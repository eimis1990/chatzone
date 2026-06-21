import { tool, type ModelMessage, type ToolSet, streamText, stepCountIs } from 'ai'
import { openai } from '@ai-sdk/openai'
import { z } from 'zod'
import type { BotConfig } from '@/lib/types'
import type { CommerceProduct } from '@/lib/commerce/types'
import { searchStore } from '@/lib/commerce'

/**
 * Builds the product tools for a commerce-enabled bot:
 *  - `search_products`: fetches CANDIDATES and returns them (id/title/price/desc)
 *    to the model to review — it does NOT show anything to the user.
 *  - `display_products`: the model passes the ids it judges relevant; those (and
 *    only those) are pushed to `sink` and rendered as cards.
 * This lets the model filter out false keyword matches (e.g. a bath bomb that
 * merely contains a substring) before anything reaches the shopper.
 */
export function makeProductTools(config: BotConfig, sink: CommerceProduct[]): ToolSet {
  const candidates = new Map<string, CommerceProduct>()
  return {
    search_products: tool({
      description:
        'Search the store catalog and get CANDIDATE products to review (not shown to the user yet). ' +
        'Use the product type/noun in the catalog language (this store is often Lithuanian), e.g. ' +
        '"veido kremas" for a face cream — avoid vague single adjectives. You may search multiple times.',
      inputSchema: z.object({
        query: z.string().describe('Product type/keywords in the catalog language'),
        minPrice: z.number().optional().describe('Minimum price in major units (e.g. euros)'),
        maxPrice: z.number().optional().describe('Maximum price in major units (e.g. euros)'),
      }),
      execute: async ({ query, minPrice, maxPrice }) => {
        const products = await searchStore(
          { enabled: true, provider: config.commerce.provider, storeUrl: config.commerce.storeUrl },
          { query, minPrice, maxPrice, limit: 10 },
        )
        products.forEach((p) => candidates.set(p.id, p))
        return products.map((p) => ({
          id: p.id,
          title: p.title,
          price: p.price,
          inStock: p.inStock,
          description: p.shortDescription?.slice(0, 140),
        }))
      },
    }),
    display_products: tool({
      description:
        'Show selected products to the shopper. Pass ONLY ids of candidates that genuinely match ' +
        'the request (right category/type) — never items that merely share a keyword. Order them ' +
        'BEST FIRST: the first 4 appear as feature cards, the rest behind a "See all" list, so put ' +
        'your strongest / most representative picks first. Prefer VARIETY over near-duplicates ' +
        '(avoid showing 4 almost-identical items — vary the brand, type, or price). Pass up to 10 ids.',
      inputSchema: z.object({
        productIds: z.array(z.string()).describe('Candidate product ids to show, best first'),
      }),
      execute: async ({ productIds }) => {
        const chosen = productIds
          .map((id) => candidates.get(id))
          .filter((p): p is CommerceProduct => Boolean(p))
          .slice(0, 10)
        sink.length = 0
        sink.push(...chosen)
        return { shown: chosen.length }
      },
    }),
  }
}

/** True when the bot has live product search configured. */
export function commerceEnabled(config: BotConfig): boolean {
  return Boolean(config.commerce?.enabled && config.commerce?.storeUrl)
}

/** A one-shot NDJSON response containing a single text message (no LLM call). */
export function ndjsonText(text: string, headers: Record<string, string>): Response {
  const body = JSON.stringify({ t: 'text', v: text }) + '\n'
  return new Response(body, {
    headers: { ...headers, 'Content-Type': 'application/x-ndjson; charset=utf-8' },
  })
}

interface NdjsonOptions {
  headers: Record<string, string>
  /** Called once with the full assistant text when generation finishes (persistence). */
  onText?: (text: string) => Promise<void> | void
}

/**
 * Runs streamText (with optional tools) and returns an NDJSON streaming Response:
 * one JSON object per line — {"t":"text","v":...} chunks, then a final
 * {"t":"products","v":[...]} when product cards were produced.
 */
export function ndjsonChatResponse(
  model: ReturnType<typeof openai>,
  messages: ModelMessage[],
  opts: {
    temperature: number
    tools?: ToolSet
    productSink?: CommerceProduct[]
  } & NdjsonOptions,
): Response {
  const result = streamText({
    model,
    messages,
    temperature: opts.temperature,
    // Allow several search steps (one per category for an open need) + a display
    // step + the final text reply.
    ...(opts.tools ? { tools: opts.tools, stopWhen: stepCountIs(8) } : {}),
  })

  const encoder = new TextEncoder()
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const line = (obj: unknown) => controller.enqueue(encoder.encode(JSON.stringify(obj) + '\n'))
      let fullText = ''
      try {
        for await (const part of result.fullStream) {
          if (part.type === 'text-delta') {
            const delta = (part as { text?: string; textDelta?: string }).text ??
              (part as { textDelta?: string }).textDelta ?? ''
            if (delta) {
              fullText += delta
              line({ t: 'text', v: delta })
            }
          }
        }
        const products = opts.productSink ?? []
        if (products.length) line({ t: 'products', v: products })
      } catch {
        line({ t: 'text', v: '' })
      } finally {
        controller.close()
        if (opts.onText) await opts.onText(fullText)
      }
    },
  })

  return new Response(stream, {
    headers: { ...opts.headers, 'Content-Type': 'application/x-ndjson; charset=utf-8' },
  })
}
