import { tool, type ModelMessage, type ToolSet, streamText, stepCountIs } from 'ai'
import { openai } from '@ai-sdk/openai'
import { z } from 'zod'
import type { BotConfig } from '@/lib/types'
import type { CommerceProduct, OrderStatus } from '@/lib/commerce/types'
import {
  providerCandidateDetailsLimit,
  providerCompleteDisplaySelection,
  providerDisplayGuidance,
  providerProductDetailsReference,
  providerSearchQueryGuidance,
} from '@/lib/products/provider-profiles'
import {
  searchStore,
  getProductDetails,
  getShippingOptions,
  productDetailsSupported,
  shippingInfoSupported,
  getOrderStatus,
  getDiscount,
  orderLookupEnabled,
  storeConfigured,
} from '@/lib/commerce'
import { searchTravellineRooms } from '@/lib/commerce/travelline'

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
    sort?: 'price_asc' | 'price_desc'
  }) => Promise<CommerceProduct[]>,
  /** Shared candidate store — lets the response layer auto-render a lone found
   *  product if the model forgets to call display_products. */
  candidates: Map<string, CommerceProduct> = new Map<string, CommerceProduct>(),
  /** Cards already shown on a previous turn — display_products can re-show these
   *  by id without a fresh search. Kept OUT of `candidates` so the response
   *  layer's safety net never re-renders stale cards on non-product turns. */
  shown?: Map<string, CommerceProduct>,
  /** Component-library availability for this bot's provider (provider_components
   *  folders). Omitted = everything allowed. Can only NARROW code capabilities. */
  allowedComponents?: Set<string>,
): ToolSet {
  const queryGuidance = providerSearchQueryGuidance(config.commerce)
  const displayGuidance = providerDisplayGuidance(config.commerce)
  const candidateDetailsLimit = providerCandidateDetailsLimit(config.commerce)
  let latestSearchQuery = ''
  let latestSearchProducts: CommerceProduct[] = []
  const tools: ToolSet = {
    search_products: tool({
      description:
        'Search the store catalog and get CANDIDATE products to review (not shown to the user yet). ' +
        'Use a short descriptive phrase in the catalog language — ' +
        'the product type plus at most 1-2 qualifiers, e.g. "kvapni žvakė" or "veido kremas sausai ' +
        'odai". ' +
        (queryGuidance ? `${queryGuidance} ` : '') +
        'Keep any stated hard attribute (color, material, size) in the query, expressed in the ' +
        'catalog language in canonical form ("balta sofa", not an inflected sentence). ' +
        'When the shopper names a ' +
        'specific BRAND or PRODUCT NAME, pass that name VERBATIM ' +
        'as the query instead of a category. If it returns an { error }, retry the same search once ' +
        'before telling the shopper anything. When the shopper names a recipient (a gift/product "for men", "for women", ' +
        '"for kids/a child"), ALSO set `audience` so results are limited to items that suit that ' +
        "person — this is how you avoid showing, say, a child's toy for a men's-gift request. " +
        'You may search multiple times. Top results include `details` (categories, attributes, ' +
        'longer description) — use them to judge fit, answer product questions, and compare ' +
        'options before choosing what to display.',
      inputSchema: z.object({
        query: z.string().describe('Product type/keywords in the catalog language'),
        minPrice: z.number().optional().describe('Minimum price in major units (e.g. euros)'),
        maxPrice: z.number().optional().describe('Maximum price in major units (e.g. euros)'),
        audience: z
          .enum(['women', 'men', 'kids', 'unisex'])
          .optional()
          .describe('Set ONLY when the shopper specifies who the product/gift is for.'),
        sort: z
          .enum(['price_asc', 'price_desc'])
          .optional()
          .describe(
            'Sort by live price — set for superlative price asks ("cheapest / most expensive ' +
              'product"). With sort set, query may be an empty string to rank the whole catalog.',
          ),
      }),
      execute: async ({ query, minPrice, maxPrice, audience, sort }) => {
        try {
          const products = searchImpl
            ? await searchImpl({ query, minPrice, maxPrice, limit: 24, audience, sort })
            : await searchStore(config.commerce, { query, minPrice, maxPrice, limit: 24, sort })
          latestSearchQuery = query
          latestSearchProducts = products
          products.forEach((p) => candidates.set(p.id, p))
          if (!products.length) {
            return {
              noMatches: true,
              nextAction:
                'Do not answer that the store lacks this product yet. Immediately retry with the ' +
                'base product noun/category, then a synonym. Store search often does not index ' +
                'attributes such as color, dimensions, or material.',
            }
          }
          return products.map((p, i) => ({
            id: p.id,
            title: p.title,
            price: p.price,
            inStock: p.inStock,
            description: p.shortDescription?.slice(0, 140),
            // Provider profiles control this token/recall trade-off. Structured
            // catalogs can expose more verified candidates without imposing the
            // same model-input cost on every provider.
            details: i < candidateDetailsLimit ? p.details : undefined,
          }))
        } catch (err) {
          // An infrastructure failure is NOT "the catalog lacks this item" — tell
          // the model the truth so it never claims a product is unavailable.
          console.error('[agent] search_products failed:', err)
          return {
            error:
              'Product search failed temporarily (store API error). Retry the same search once. ' +
              'If it fails again, tell the shopper you could not check the catalog right now — ' +
              'do NOT claim the item is unavailable.',
          }
        }
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
        'NAMED product or tightly constrained comparison, a focused handful is enough. When the ' +
        'shopper constrained an attribute (e.g. color), pass ONLY ids whose attributes verify it — ' +
        'an attribute listing the requested value among several options counts (the shopper can ' +
        'order that option); when exact matches are fewer than the set you want to show, fill the ' +
        'rest with the closest neighbouring shades (searched separately with simple color words), ' +
        'exact matches FIRST, and say in your reply which are exact and which are close ' +
        'alternatives. Pass up to ' +
        '20 ids. ' +
        (displayGuidance ? displayGuidance : ''),
      inputSchema: z.object({
        productIds: z.array(z.string()).describe('Candidate product ids to show, best first'),
      }),
      execute: async ({ productIds }) => {
        // De-duplicate: the model sometimes repeats an id.
        const seen = new Set<string>()
        // Once this turn has performed a fresh search, its display set must come
        // from that fresh result pool. Prior-turn cards remain addressable only
        // on follow-ups that do not run a new search ("show the first one again").
        const allowPreviouslyShown = candidates.size === 0
        let chosen = productIds
          .filter((id) => !seen.has(id) && (seen.add(id), true))
          .map((id) => candidates.get(id) ?? (allowPreviouslyShown ? shown?.get(id) : undefined))
          .filter((p): p is CommerceProduct => Boolean(p))
          .slice(0, 20)
        if (!allowPreviouslyShown && latestSearchProducts.length) {
          chosen = providerCompleteDisplaySelection(config.commerce, {
            query: latestSearchQuery,
            selected: chosen,
            rankedCandidates: latestSearchProducts,
            limit: 20,
          })
        }
        sink.length = 0
        sink.push(...chosen)
        return { shown: chosen.length }
      },
    }),
  }

  // Hotel availability (TravelLine only): dated room-stay offers with real
  // prices and a prefilled booking-engine link. Results register as candidates
  // so display_products renders them as cards, same as search results.
  if (config.commerce?.provider === 'travelline' && storeConfigured(config.commerce)) {
    tools.check_availability = tool({
      description:
        'Check live room availability and prices for a stay. You MUST have the check-in date, ' +
        'check-out date, and number of adults before calling — ask the guest for whatever is ' +
        'missing (and ages of any children). Dates are ISO YYYY-MM-DD; resolve relative dates ' +
        '("next weekend", "kitą savaitgalį") to concrete dates first, asking if ambiguous. ' +
        'Returns bookable offers with the TOTAL price for the whole stay and a booking link — ' +
        'these are the ONLY prices you may quote. After reviewing, call display_products with ' +
        'the ids the guest should see; the card button takes them to the booking form with ' +
        'everything prefilled.',
      inputSchema: z.object({
        checkIn: z.string().describe('Check-in date, YYYY-MM-DD'),
        checkOut: z.string().describe('Check-out date, YYYY-MM-DD'),
        adults: z.number().int().min(1).max(20).describe('Number of adults'),
        childAges: z
          .array(z.number().int().min(0).max(17))
          .optional()
          .describe('Ages of children joining the stay, one entry per child'),
      }),
      execute: async ({ checkIn, checkOut, adults, childAges }) => {
        if (!/^\d{4}-\d{2}-\d{2}$/.test(checkIn) || !/^\d{4}-\d{2}-\d{2}$/.test(checkOut)) {
          return { error: 'Dates must be ISO YYYY-MM-DD. Ask the guest to clarify the dates.' }
        }
        if (checkOut <= checkIn) {
          return { error: 'Check-out must be after check-in. Ask the guest to clarify the dates.' }
        }
        try {
          const offers = await searchTravellineRooms(config.commerce!, {
            arrivalDate: checkIn,
            departureDate: checkOut,
            adults,
            childAges,
          })
          latestSearchQuery = `${checkIn}..${checkOut}`
          latestSearchProducts = offers
          offers.forEach((p) => candidates.set(p.id, p))
          if (!offers.length) {
            return {
              noAvailability: true,
              nextAction:
                'No rooms are available for those exact dates/party. Offer to check nearby dates ' +
                'or a different party size — do not invent alternatives or prices.',
            }
          }
          return offers.map((p) => ({
            id: p.id,
            title: p.title,
            totalPriceForStay: p.price,
            available: p.inStock,
            summary: p.shortDescription,
            details: p.details,
          }))
        } catch (err) {
          console.error('[agent] check_availability failed:', err)
          return {
            error:
              'Availability lookup failed temporarily. Retry once; if it fails again, tell the ' +
              'guest you could not check availability right now — do NOT guess prices or ' +
              'availability.',
          }
        }
      },
    })
  }

  // Live shipping options straight from the store's checkout (WooCommerce
  // only). Kills two failure modes seen with real clients: vague "calculated at
  // checkout" answers when the KB lacks concrete prices, and hallucinated
  // carriers the store never offered (LP Express).
  if (shippingInfoSupported(config.commerce)) {
    tools.shipping_info = tool({
      description:
        'Fetch the store\'s LIVE delivery/shipping options with their current prices, exactly as ' +
        'the checkout shows them (couriers, parcel lockers, pickup). Call this WHENEVER the ' +
        'shopper asks about delivery cost, delivery/shipping methods, couriers, parcel lockers ' +
        '(paštomatai), or pickup. Present ONLY the options it returns — never name a carrier or ' +
        'service it does not list. Mention that the final price for a specific order is confirmed ' +
        'at checkout (rates can vary with cart size/weight).',
      inputSchema: z.object({}),
      execute: async () => {
        try {
          const options = await getShippingOptions(config.commerce!)
          if (!options.length) {
            return {
              unavailable: true,
              nextAction:
                'Live rates could not be fetched. Answer from the context if it covers delivery; ' +
                'otherwise say the exact options and prices are shown at checkout — do NOT guess ' +
                'or list carriers from memory.',
            }
          }
          return {
            options,
            note: 'Quoted for a typical small order — the checkout confirms the final price.',
          }
        } catch (err) {
          console.error('[agent] shipping_info failed:', err)
          return {
            unavailable: true,
            nextAction:
              'Live rates could not be fetched. Answer from the context if it covers delivery; ' +
              'otherwise say the exact options and prices are shown at checkout — do NOT guess.',
          }
        }
      },
    })
  }

  // Full live details — only where the provider has a live details path
  // (WooCommerce Store API, Shopify Storefront, Verskis product HTML). Not registered otherwise, so
  // the model never sees a tool it can't use.
  if (productDetailsSupported(config.commerce)) {
    tools.get_product_details = tool({
      description:
        'Fetch the FULL live description and attribute list (materials, dimensions, scent, ' +
        'ingredients, care…) for up to 3 products by id — ids come from search results or the ' +
        'cards currently shown. Call this WHENEVER the shopper asks to hear more about a specific ' +
        'product ("tell me more", "papasakok daugiau", ingredients, composition, how to use) or ' +
        'wants a thorough comparison. For furniture and other specification-heavy products, also ' +
        'call this BEFORE ' +
        'recommending candidates against a hard constraint (dimensions, color, material, orientation, ' +
        'weight limit, included features) whenever search results do not already show that fact. ' +
        'A missing attribute is unverified, not a match. NEVER tell the shopper you lack further ' +
        'information about a ' +
        'product without having called this first. Answer ONLY from what it returns — never ' +
        'invent specs.',
      inputSchema: z.object({
        productIds: z.array(z.string()).max(3).describe('Up to 3 product ids to look up'),
      }),
      execute: async ({ productIds }) => {
        try {
          const resolvedIds = productIds.slice(0, 3).map((id) => ({
            modelId: id,
            // Provider reference quirks stay in the selected provider profile.
            // The model still sees its original id, not an internal URL/ref.
            providerId: config.commerce
              ? providerProductDetailsReference(
                  config.commerce,
                  id,
                  candidates.get(id) ?? shown?.get(id),
                )
              : id,
          }))
          const details = await getProductDetails(
            config.commerce!,
            resolvedIds.map((item) => item.providerId),
          )
          const modelIds = new Map(
            resolvedIds.map((item) => [item.providerId, item.modelId]),
          )
          const safeDetails = details.map((detail) => ({
            ...detail,
            id: modelIds.get(detail.id) ?? detail.id,
          }))
          return safeDetails.length ? safeDetails : { error: 'No details found for those product ids.' }
        } catch (err) {
          console.error('[agent] get_product_details failed:', err)
          return {
            error:
              'Could not fetch product details right now (store API error). Answer from the ' +
              'information you already have — do not invent specifics.',
          }
        }
      },
    })
  }

  // Order status — only when REST credentials are configured AND the provider's
  // component folder includes the order-status card.
  if (orderLookupEnabled(config.commerce) && (allowedComponents?.has('order-status') ?? true)) {
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

/** Case/diacritic-folded (žąčę → zace) for fuzzy title-in-text matching. */
function fold(s: string): string {
  return s.toLowerCase().normalize('NFD').replace(/\p{M}/gu, '')
}

/**
 * Does the reply text actually reference this product? True when at least two
 * significant title tokens (or all of them for one-token titles) appear in the
 * text — one shared word ("tiesintuvas" in a refusal) must not count.
 */
export function textMentionsTitle(text: string, title: string): boolean {
  const t = fold(text)
  const tokens = fold(title).match(/[a-z0-9]{4,}/g) ?? []
  if (!tokens.length) return false
  const hit = tokens.filter((tok) => t.includes(tok)).length
  return hit >= Math.min(2, tokens.length)
}

interface NdjsonOptions {
  headers: Record<string, string>
  /** Called once with the full assistant text when generation finishes (persistence). */
  onText?: (text: string) => Promise<void> | void
  /** Shown (and persisted) if the stream dies mid-generation — a blank reply
   *  reads as the bot silently ignoring the visitor. */
  errorText?: string
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
    /** Component-library gating: provider folder lacks product-cards → the reply
     *  stays text-only (tools still run; the model can answer in prose). */
    suppressProducts?: boolean
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
      let emittedProductKey = ''
      const emitProductsIfChanged = () => {
        if (opts.suppressProducts) return
        const products = opts.productSink ?? []
        if (!products.length) return
        const key = products.map((product) => product.id).join('\u0000')
        if (key === emittedProductKey) return
        emittedProductKey = key
        line({ t: 'products', v: products })
      }
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
          // display_products mutates productSink while the tool result streams.
          // Send cards immediately instead of waiting for the final prose.
          emitProductsIfChanged()
        }
        const products = opts.productSink ?? []
        // Safety net: the model sometimes lists found products in text (even
        // "tap the card") without calling display_products, so no cards render.
        // But dumping ALL candidates re-created the worst client-reported bug:
        // a "no discount found" reply rendered 12 unrelated conditioner cards,
        // and a pans answer got padded with hair straighteners (raw vector
        // noise). So render only candidates the model actually NAMED in its
        // text — if it deliberately showed nothing, show nothing.
        if (products.length === 0 && opts.candidates && opts.candidates.size >= 1) {
          const named = Array.from(opts.candidates.values()).filter((p) =>
            textMentionsTitle(fullText, p.title),
          )
          products.push(...named.slice(0, 12))
        }
        emitProductsIfChanged()
        const order = opts.orderSink ?? []
        if (order.length) line({ t: 'order', v: order[0] })
      } catch (err) {
        console.error('[agent] chat stream failed:', err)
        if (!fullText && opts.errorText) {
          fullText = opts.errorText
          line({ t: 'text', v: opts.errorText })
        } else {
          line({ t: 'text', v: '' })
        }
      } finally {
        // Persist the assistant turn BEFORE closing the stream. If we close
        // first, the platform can suspend the function before this DB write
        // lands, which intermittently drops assistant messages (and their
        // product suggestions) from the transcript.
        if (opts.onText) {
          try {
            await opts.onText(fullText)
          } catch (err) {
            // A failed persist must not break the (already-streamed) reply — but
            // it silently drops the turn from the transcript, so log it.
            console.error('[agent] failed to persist assistant message:', err)
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
