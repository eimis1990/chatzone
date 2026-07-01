import type { BotConfig, BotLanguage, LanguageContent } from '@/lib/types'
import { storeConfigured, orderLookupEnabled } from '@/lib/commerce'

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

export interface ContextChunk {
  content: string
  source_id: string
}

/** Number of prior turns kept in the prompt. */
export const HISTORY_WINDOW = 10

/** The bot's default (first enabled) language. */
export function defaultLanguage(config: BotConfig): BotLanguage {
  return config.languages?.[0] ?? 'en'
}

/** Resolve content for a language, falling back to English then to the first available. */
export function contentFor(config: BotConfig, lang: BotLanguage): LanguageContent {
  return config.content[lang] ?? config.content.en
}

/** Builds the grounding system prompt (persona + language + retrieved context). */
export function buildSystemPrompt(
  config: BotConfig,
  context: ContextChunk[],
  lang: BotLanguage = defaultLanguage(config),
): string {
  const contextBlock = context.length
    ? context.map((c) => `[source: ${c.source_id}]\n${c.content}`).join('\n\n')
    : '(no relevant context was found)'
  const languageName = lang === 'lt' ? 'Lithuanian' : 'English'
  const fallback = contentFor(config, lang).fallbackMessage
  const commerce = storeConfigured(config.commerce)

  const lines = [
    config.systemPrompt,
    `Tone: ${config.persona.tone}. Verbosity: ${config.persona.verbosity}.`,
    `Always respond in ${languageName}, regardless of the language the user writes in.`,
  ]

  // "Request rich responses" toggle (default on): ask the model to structure
  // replies as Markdown so the widget renders them as rich text.
  if (config.richResponses !== false) {
    lines.push(
      'FORMATTING: write replies as clean, well-structured Markdown so they render richly. ' +
        'Use short paragraphs and **bold** for key terms; group multiple items, options, or ' +
        'features into "- " bullet lists; use numbered lists for ordered steps; and write links ' +
        'as [label](https://…). Put phone numbers in full international form (e.g. +370 600 12345) ' +
        'and emails in plain text so they become tappable. Lead with a brief sentence, then a list ' +
        'when enumerating things. Keep one-line answers as plain sentences (do not force a list) ' +
        'and never wrap the whole reply in a code block.',
    )
  }

  if (commerce) {
    lines.push(
      'PRODUCT SEARCH: when the user asks about products, prices, availability, gifts, or wants ' +
        'recommendations, do this: ' +
        '(1) Decide the shape of the answer from the request. A SPECIFIC product ask ("do you have a ' +
        'face cream?") → show several options of THAT type (different brands / price points). An OPEN ' +
        'NEED or problem ("something for dry skin", "a gift for mum") → assemble a small ROUTINE / mix ' +
        'across complementary categories (e.g. for skincare: serum, cream, toner, mist, maybe a set), ' +
        'not several of the same thing. ' +
        '(2) Call `search_products` with the core product NOUN — keep it SHORT (1-2 words) and drop ' +
        'adjectives like dry/hydrating ("sausai", "drėkinamasis"), they usually return nothing. Search ' +
        'in the language the shopper is using. IMPORTANT: a catalog only matches its own language, so if ' +
        'a search returns nothing you MUST retry the SAME noun translated to the other language ' +
        '(English ↔ Lithuanian: "pants" ↔ "kelnės", "face cream" ↔ "veido kremas", "dress" ↔ "suknelė") ' +
        'before concluding an item is unavailable. For an open need, run SEVERAL searches, one per ' +
        'complementary category, to gather a varied set. ' +
        '(3) Review the candidates and call `display_products` with ONLY ids that genuinely match the ' +
        'intent (exclude keyword-only matches — never a bath product for a face request). The first 4 ids ' +
        'show as cards and the rest sit behind "See all", so order carefully: for an OPEN NEED make the ' +
        'first 4 span DIFFERENT categories (e.g. a cream, a serum, a toner, a mist) so the visible cards ' +
        'show the whole routine at a glance, then add extra options after; for a SPECIFIC ask put the best ' +
        'of that type first. Favour VARIETY over near-duplicates. ' +
        'The products appear as cards automatically, so reply with ONE short sentence only ' +
        '(e.g. "Here are a few options:" / "Štai keletas variantų:"). NEVER list products, brands, prices, ' +
        'links, or per-category bullets in your text — the cards already show all of that. ' +
        'For non-product questions, use the context below.',
    )

    const orderEnabled = orderLookupEnabled(config.commerce)
    if (orderEnabled) {
      lines.push(
        'ORDER STATUS: when the shopper asks about an existing order (where is it, tracking, status), ' +
          'collect BOTH the order number AND the email used on the order, then call `order_status`. ' +
          'Ask for whatever is missing; never guess or accept just one. If it returns found:false, do not ' +
          'reveal any details — say you could not find an order matching that number and email, and offer ' +
          'to connect them with a person. When found, the order details (status, items, total, tracking) ' +
          'appear as a card automatically, so reply with ONE short sentence (e.g. "Here\'s your order:" / ' +
          '"Štai jūsų užsakymas:") — do NOT repeat the items, total, or tracking in your text.',
      )
    }

    const discount = config.commerce?.discount
    if (discount?.enabled && discount.code) {
      lines.push(
        'DISCOUNTS: if the shopper asks for a discount, coupon, promo, or deal, call `discount_code` and ' +
          'share the code it returns (with its description). Do not invent or guess codes.',
      )
    }
  } else {
    lines.push(
      'Answer using ONLY the context below. Do not mention, print, or reference the source ids ' +
        'in your reply — they are for your reference only.',
    )
    lines.push(
      `If the answer is not contained in the context, do not invent one — reply with: "${fallback}"`,
    )
  }

  // Models reflexively refuse "email address" etc. as personal data. The
  // business's OWN published contact details are public — share them.
  lines.push(
    "The business's own contact details in the context — its email, phone number, website, and " +
      'address — are PUBLIC information. Share them plainly whenever asked. Never refuse or hedge by ' +
      "calling the company's own contact details \"personal\", \"private\", or something you \"can't provide\".",
  )

  lines.push('\n--- CONTEXT ---\n' + contextBlock)
  return lines.join('\n\n')
}

export function buildMessages(
  config: BotConfig,
  context: ContextChunk[],
  history: ChatMessage[],
  userMessage: string,
  lang: BotLanguage = defaultLanguage(config),
): ChatMessage[] {
  const system = buildSystemPrompt(config, context, lang)
  const trimmedHistory = history.slice(-HISTORY_WINDOW)

  return [
    { role: 'system', content: system },
    ...trimmedHistory,
    { role: 'user', content: userMessage },
  ]
}
