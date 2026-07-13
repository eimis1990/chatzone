import type { BotConfig, BotLanguage, LanguageContent } from '@/lib/types'
import type { CommerceProduct } from '@/lib/commerce/types'
import { storeConfigured, orderLookupEnabled, productDetailsSupported } from '@/lib/commerce'

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

const EMPTY_CONTENT: LanguageContent = { greeting: '', suggestedQuestions: [], fallbackMessage: '' }

/** Resolve content for a language, falling back to English then to the first available. */
export function contentFor(config: BotConfig, lang: BotLanguage): LanguageContent {
  return config.content[lang] ?? config.content.en ?? Object.values(config.content)[0] ?? EMPTY_CONTENT
}

/** Cards already shown this conversation, in display order (most recent turn). */
export type ShownProducts = Pick<CommerceProduct, 'id' | 'title' | 'price' | 'inStock' | 'shortDescription'>[]

/** Builds the grounding system prompt (persona + language + retrieved context). */
export function buildSystemPrompt(
  config: BotConfig,
  context: ContextChunk[],
  lang: BotLanguage = defaultLanguage(config),
  shownProducts?: ShownProducts,
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
    // Warmth: the old replies read as cold and clipped ("Here are some products").
    // Make the assistant feel like a friendly, attentive shop helper.
    'WARMTH: be genuinely warm, friendly and human — like a helpful shop assistant who is glad to ' +
      'help. Briefly acknowledge what the person is after and show a little care before getting to the ' +
      'point; never sound robotic, cold, or curt. You may use the occasional tasteful emoji where it ' +
      'naturally fits (at most one per message, e.g. 🎁 for a gift, 💧 for skincare, 😊 for a friendly ' +
      'greeting) — but never force one and never overdo it. Keep this within the tone and verbosity above.',
  ]

  // "Request rich responses" toggle (default on): ask the model to structure
  // replies as Markdown so the widget renders them as rich text.
  if (config.richResponses !== false) {
    lines.push(
      'FORMATTING: write replies as clean, well-structured Markdown so they render richly. ' +
        'Use short paragraphs and **bold** for key terms; group multiple items, options, or ' +
        'features into "- " bullet lists; use numbered lists for ordered steps; and write links ' +
        'as [label](https://…). Put phone numbers in full international form and emails in plain ' +
        'text so they become tappable — only ever the exact numbers/emails from the context, ' +
        'never invented ones. Lead with a brief sentence, then a list ' +
        'when enumerating things. Keep one-line answers as plain sentences (do not force a list) ' +
        'and never wrap the whole reply in a code block.',
    )
  }

  if (commerce) {
    lines.push(
      'PRODUCT SEARCH: the shopper may ask about products, prices, availability, gifts, gift coupons / ' +
        'gift cards / vouchers, or want recommendations. You MUST call `search_products` to check the ' +
        'LIVE catalog BEFORE answering. NEVER tell the shopper an item, gift, coupon, or category is ' +
        'unavailable — or that "we don\'t have it" / "we don\'t sell that" — based on memory or the ' +
        'context below. Only say something is unavailable after your searches (including the retries ' +
        'below) genuinely return nothing. Note: a gift coupon / gift card / voucher ("dovanų kuponas") is ' +
        'a PRODUCT you search for — it is NOT the same as a promo/discount code. ' +
        '(1) Decide the shape of the answer. A SPECIFIC ask ("do you have a face cream?") → search that ' +
        'product type. An OPEN or GIFT need ("a gift for my wife", "gift ideas for women") → do NOT ' +
        'search the word "gift" / "dovana" itself — that only finds items literally NAMED that, not good ' +
        'ideas. Instead brainstorm 4-6 CONCRETE gift categories that would suit the recipient and search ' +
        'for EACH separately, then combine the best into a varied set. E.g. for a woman: "kvepalai" ' +
        '(perfume), "žvakė" / "namų kvapai" (candle / home fragrance), "kosmetikos rinkinys" (cosmetics ' +
        'set), "veido priežiūra" (skincare), "vonios rinkinys" (bath set), "aksesuarai" (accessories). ' +
        '(2) WHO IS IT FOR — think about the recipient. If the shopper says who the product or gift is ' +
        'for (for men / a man / husband / dad / boyfriend → men; for women / a woman / wife / mum / her → ' +
        'women; for a child / kid / son / daughter / baby → kids), you MUST pass `audience` on ' +
        '`search_products` so results are limited to items that actually suit that person. Do NOT set ' +
        'audience when they did not specify a recipient. Regardless, NEVER show a product meant for a ' +
        'different person than they asked for — e.g. never offer a children\'s toy, or a women-only item, ' +
        'when they want a gift for a man. If the catalog genuinely has few good matches for that person, ' +
        'show the best real ones and say so warmly — do not pad with irrelevant products. ' +
        '(3) Write each `search_products` query as a SHORT descriptive phrase in the catalog language — ' +
        'the product type plus at most 1-2 meaningful qualifiers ("kvapni žvakė", "veido kremas sausai ' +
        'odai", "dovanų kuponas"). EXCEPTION: when the shopper names a specific BRAND or PRODUCT NAME ' +
        '(e.g. "Slim Lady", "WoodWick"), search that name VERBATIM first — do NOT translate it into a ' +
        'category. Search understands natural descriptive queries; keep helpful ' +
        'qualifiers, but never paste whole sentences. If a search returns nothing, you MUST RETRY ' +
        'before concluding it is unavailable: try the base noun alone, a close synonym, and the SAME ' +
        'term in the other language (EN ↔ LT: "candle" ↔ "žvakė", "perfume" ↔ "kvepalai", ' +
        '"gift card" ↔ "dovanų kuponas", "face cream" ↔ "veido kremas"). If a search returns an ' +
        'error, retry it once before saying anything. For an open/gift need, run SEVERAL searches — ' +
        'one per concept from (1) — to gather a broad, varied set. ' +
        '(4) Review the candidates and call `display_products` with ONLY ids that genuinely match the ' +
        'intent AND the recipient (exclude keyword-only matches and wrong-recipient items). The first 4 ' +
        'ids show as cards and the rest sit behind "See all": for an OPEN need make the first 4 span ' +
        'DIFFERENT categories; for a SPECIFIC ask put the best of that type first. Favour VARIETY over ' +
        'near-duplicates. For an OPEN or GIFT request, be GENEROUS — pass a rich, varied set (aim for ' +
        '~12-20 relevant products) so the shopper has plenty to browse; for a SPECIFIC ask a focused ' +
        'handful is enough. Search several times / broaden the query if needed to gather that many. ' +
        'ALWAYS call `display_products` for EVERY product you suggest — INCLUDING when there is only ' +
        'ONE match. Never write a product name or price in your text, and never say "tap the card", ' +
        'unless you have called `display_products` for it in this same reply (otherwise no card shows). ' +
        'The products appear as cards automatically, so reply with ONE short, WARM sentence that ' +
        'acknowledges the request (e.g. "Oh, lovely idea — here are a few he might like: 🎁" / ' +
        '"Žinoma! 😊 Štai keletas variantų:"). NEVER list products, brands, prices, links, or per-category ' +
        'bullets in your text — the cards already show all of that. For non-product questions, use the ' +
        'context below.',
    )

    if (productDetailsSupported(config.commerce)) {
      lines.push(
        'PRODUCT DETAILS: when the shopper asks to hear MORE about one specific product — "tell me ' +
          'more", "papasakok daugiau", its ingredients, composition, materials, size, or usage — you ' +
          'MUST call `get_product_details` with that product\'s id BEFORE answering. NEVER say you ' +
          'lack further information about a product unless you have just called it and it returned ' +
          'nothing. Summarise the returned description naturally in the conversation language.',
      )
    }

    lines.push(
      'BUYING & CHECKOUT: you CANNOT place orders, take payment, reserve items, or complete a purchase, ' +
        'and you must NEVER ask the shopper for personal details (name, address, phone number, email) in ' +
        'order to buy something — orders are NOT taken through chat. So NEVER offer to "help with the ' +
        'order", start an order form, or collect delivery/contact info. When the shopper wants to buy, ' +
        'has chosen an item, or asks how to order: call `display_products` with just THAT product\'s id ' +
        'so its card — with the button to the product page — is shown, then warmly tell them to tap the ' +
        'button on the card to open it and finish on the website (e.g. "Great choice! Tap the card to ' +
        'open it and complete your order on the site 🛍️" / "Puikus pasirinkimas! Paspauskite kortelę ir ' +
        'užbaikite užsakymą svetainėje 🛍️"). You are glad to help them compare, choose, or answer ' +
        'questions — but the checkout itself always happens on the website, not here.',
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

    // Grounding for commerce bots: products come from the tools, but FACTS
    // (contact details, policies, hours) must still come from the context —
    // without this the model invents plausible emails and phone numbers.
    lines.push(
      'FACTS & POLICIES: for non-product questions (contact details, delivery, returns, payment, ' +
        'hours, company info), answer ONLY from the context below — copy emails, phone numbers, and ' +
        `addresses EXACTLY as they appear there, never invent or adjust them. If the context does not ` +
        `contain the answer, say you are not sure (e.g. "${fallback}") and offer to connect them with ` +
        'a person — never guess.',
    )
    if (shownProducts?.length) {
      const cardList = shownProducts
        .slice(0, 20)
        .map(
          // The id is what makes the card actionable on later turns — without it
          // the model guesses ids for display_products / get_product_details.
          (p, i) =>
            `${i + 1}. (id ${p.id}) "${p.title}" — ${p.price} — ${p.inStock ? 'in stock' : 'out of stock'}` +
            (p.shortDescription ? ` — ${p.shortDescription.slice(0, 120)}` : ''),
        )
        .join('\n')
      lines.push(
        'CARDS CURRENTLY SHOWN: earlier in this conversation you displayed these product cards to the ' +
          'shopper, in this exact order (1 = the first/leftmost card):\n' +
          cardList +
          '\nWhen the shopper says "the first one", "the second one", "that candle", or otherwise refers ' +
          'to what you showed, they mean these cards. As the ONE exception to the no-names rule above, ' +
          'you MAY mention these already-shown products by name and price in your text when answering ' +
          'questions about them or comparing them — do not re-list them all unprompted, and still never ' +
          'write links. To show one of them again as a card, call `display_products` with its id.',
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
  shownProducts?: ShownProducts,
): ChatMessage[] {
  const system = buildSystemPrompt(config, context, lang, shownProducts)
  const trimmedHistory = history.slice(-HISTORY_WINDOW)

  return [
    { role: 'system', content: system },
    ...trimmedHistory,
    { role: 'user', content: userMessage },
  ]
}
