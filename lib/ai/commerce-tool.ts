import { tool, type ModelMessage, type ToolSet, streamText, stepCountIs } from 'ai'
import { openai } from '@ai-sdk/openai'
import { z } from 'zod'
import type { BotConfig } from '@/lib/types'
import type { CommerceProduct } from '@/lib/commerce/types'
import { searchStore } from '@/lib/commerce'

/**
 * Builds the `search_products` tool for a commerce-enabled bot. Captures the
 * full product results (with images) into `sink` so the route can stream them
 * to the UI as product cards; returns a compact list to the model.
 */
export function makeProductSearchTool(config: BotConfig, sink: CommerceProduct[]): ToolSet {
  return {
    search_products: tool({
      description:
        'Search the store catalog for products matching the shopper request. Use whenever the ' +
        'user asks about products, prices, availability, gifts, or wants recommendations. ' +
        'Translate their request into a concise search query and optional price bounds.',
      inputSchema: z.object({
        query: z.string().describe('Concise product search terms, e.g. "hydrating face mask"'),
        minPrice: z.number().optional().describe('Minimum price in major units (e.g. euros)'),
        maxPrice: z.number().optional().describe('Maximum price in major units (e.g. euros)'),
      }),
      execute: async ({ query, minPrice, maxPrice }) => {
        const products = await searchStore(
          { enabled: true, provider: config.commerce.provider, storeUrl: config.commerce.storeUrl },
          { query, minPrice, maxPrice, limit: 6 },
        )
        sink.push(...products)
        // Compact form for the model to reason/talk about (no image payloads).
        return products.map((p) => ({ title: p.title, price: p.price, inStock: p.inStock }))
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
    ...(opts.tools ? { tools: opts.tools, stopWhen: stepCountIs(5) } : {}),
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
