import { tool, type ModelMessage, type ToolSet, streamText, stepCountIs } from 'ai'
import { openai } from '@ai-sdk/openai'
import { z } from 'zod'
import type { BotConfig } from '@/lib/types'
import type { CommerceProduct, OrderStatus } from '@/lib/commerce/types'
import { searchStore, getOrderStatus, getDiscount, orderLookupEnabled, storeConfigured } from '@/lib/commerce'

/**
 * Builds the product tools for a commerce-enabled bot:
 *  - `search_products`: fetches CANDIDATES and returns them (id/title/price/desc)
 *    to the model to review — it does NOT show anything to the user.
 *  - `display_products`: the model passes the ids it judges relevant; those (and
 *    only those) are pushed to `sink` and rendered as cards.
 * This lets the model filter out false keyword matches (e.g. a bath bomb that
 * merely contains a substring) before anything reaches the shopper.
 */
export function makeProductTools(
  config: BotConfig,
  sink: CommerceProduct[],
  orderSink?: OrderStatus[],
  /** Optional search impl (semantic + live hydration). Defaults to keyword searchStore. */
  searchImpl?: (params: {
    query: string
    minPrice?: number
    maxPrice?: number
    limit?: number
    audience?: 'women' | 'men' | 'kids' | 'unisex'
  }) => Promise<CommerceProduct[]>,
  /** Shared candidate store — lets the response layer auto-render a lone found
   *  product if the model forgets to call display_products. */
  candidates: Map<string, CommerceProduct> = new Map<string, CommerceProduct>(),
): ToolSet {
  const tools: ToolSet = {
    search_products: tool({
      description:
        'Search the store catalog and get CANDIDATE products to review (not shown to the user yet). ' +
        'Use the product type/noun in the catalog language (this store is often Lithuanian), e.g. ' +
        '"veido kremas" for a face cream — avoid vague single adjectives. When the shopper names a ' +
        'recipient (a gift/product "for men", "for women", "for kids/a child"), ALSO set `audience` so ' +
        'results are limited to items that suit that person — this is how you avoid showing, say, a ' +
        "child's toy for a men's-gift request. You may search multiple times.",
      inputSchema: z.object({
        query: z.string().describe('Product type/keywords in the catalog language'),
        minPrice: z.number().optional().describe('Minimum price in major units (e.g. euros)'),
        maxPrice: z.number().optional().describe('Maximum price in major units (e.g. euros)'),
        audience: z
          .enum(['women', 'men', 'kids', 'unisex'])
          .optional()
          .describe('Set ONLY when the shopper specifies who the product/gift is for.'),
      }),
      execute: async ({ query, minPrice, maxPrice, audience }) => {
        const products = searchImpl
          ? await searchImpl({ query, minPrice, maxPrice, limit: 24, audience })
          : await searchStore(config.commerce, { query, minPrice, maxPrice, limit: 24 })
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
        '(avoid showing near-identical items — vary the brand, type, or price). For an OPEN or GIFT ' +
        'request ("gift ideas for her", "something for the home") be GENEROUS — show a rich, varied ' +
        'selection (aim for ~12-20 relevant products) so the shopper has plenty to browse. For a ' +
        'SPECIFIC product ask, a focused handful is enough. Pass up to 20 ids.',
      inputSchema: z.object({
        productIds: z.array(z.string()).describe('Candidate product ids to show, best first'),
      }),
      execute: async ({ productIds }) => {
        // De-duplicate: the model sometimes repeats an id.
        const seen = new Set<string>()
        const chosen = productIds
          .filter((id) => !seen.has(id) && (seen.add(id), true))
          .map((id) => candidates.get(id))
          .filter((p): p is CommerceProduct => Boolean(p))
          .slice(0, 20)
        sink.length = 0
        sink.push(...chosen)
        return { shown: chosen.length }
      },
    }),
  }

  // Order status — only when REST credentials are configured.
  if (orderLookupEnabled(config.commerce)) {
    tools.order_status = tool({
      description:
        'Look up the status of an existing order. You MUST have BOTH the order number AND the email ' +
        'used on the order before calling this — ask the shopper for whatever is missing; never guess. ' +
        'If it returns found:false, do NOT reveal any order details.',
      inputSchema: z.object({
        orderId: z.string().describe('Order number from the receipt/confirmation'),
        email: z.string().describe('Email address used to place the order'),
      }),
      execute: async ({ orderId, email }) => {
        const r = await getOrderStatus(config.commerce, { orderId, email })
        if (!r.found) return { found: false, reason: r.reason ?? 'not_found' }
        // Push the order so it renders as a card (like product search).
        if (orderSink) {
          orderSink.length = 0
          orderSink.push(r)
        }
        return {
          found: true,
          orderNumber: r.orderNumber,
          status: r.status,
          total: r.total,
          currency: r.currency,
          items: r.items,
          tracking: r.tracking,
          dateCreated: r.dateCreated,
        }
      },
    })
  }

  // Discount code — only when a discount is configured.
  if (getDiscount(config.commerce).enabled) {
    tools.discount_code = tool({
      description:
        'Provide the store discount/promo code when the shopper asks for a discount, coupon, or deal. ' +
        'Only share the code this returns — never invent one.',
      inputSchema: z.object({}),
      execute: async () => {
        const d = getDiscount(config.commerce)
        return d.enabled ? { available: true, code: d.code, description: d.description } : { available: false }
      },
    })
  }

  return tools
}

/** True when the bot has live product search configured (any provider). */
export function commerceEnabled(config: BotConfig): boolean {
  return storeConfigured(config.commerce)
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
    orderSink?: OrderStatus[]
    /** Candidates gathered via search_products (for the single-result net). */
    candidates?: Map<string, CommerceProduct>
  } & NdjsonOptions,
): Response {
  const result = streamText({
    model,
    messages,
    temperature: opts.temperature,
    // Open/gift needs decompose into ~6 concept searches (one per gift category),
    // plus retries + a display step + the final text reply — so allow generous
    // headroom or the reply can get cut off mid-tool-loop.
    ...(opts.tools ? { tools: opts.tools, stopWhen: stepCountIs(14) } : {}),
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
        // Safety net: the model frequently lists found products in text (even
        // "tap the card") without calling display_products, so no cards render.
        // If it searched up candidates but displayed nothing, show them as cards
        // (best-first order preserved, capped) rather than leaving text-only.
        if (products.length === 0 && opts.candidates && opts.candidates.size >= 1) {
          products.push(...Array.from(opts.candidates.values()).slice(0, 12))
        }
        if (products.length) line({ t: 'products', v: products })
        const order = opts.orderSink ?? []
        if (order.length) line({ t: 'order', v: order[0] })
      } catch {
        line({ t: 'text', v: '' })
      } finally {
        // Persist the assistant turn BEFORE closing the stream. If we close
        // first, the platform can suspend the function before this DB write
        // lands, which intermittently drops assistant messages (and their
        // product suggestions) from the transcript.
        if (opts.onText) {
          try {
            await opts.onText(fullText)
          } catch {
            // Swallow — a failed persist must not break the (already-streamed) reply.
          }
        }
        controller.close()
      }
    },
  })

  return new Response(stream, {
    headers: { ...opts.headers, 'Content-Type': 'application/x-ndjson; charset=utf-8' },
  })
}
