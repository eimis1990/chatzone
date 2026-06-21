import type { BotConfig, BotLanguage, LanguageContent } from '@/lib/types'

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
  const commerce = Boolean(config.commerce?.enabled && config.commerce?.storeUrl)

  const lines = [
    config.systemPrompt,
    `Tone: ${config.persona.tone}. Verbosity: ${config.persona.verbosity}.`,
    `Always respond in ${languageName}, regardless of the language the user writes in.`,
  ]

  if (commerce) {
    lines.push(
      'PRODUCT SEARCH: when the user asks about products, prices, availability, gifts, or wants ' +
        'recommendations, do this: ' +
        '(1) Decide the shape of the answer from the request. A SPECIFIC product ask ("do you have a ' +
        'face cream?") → show several options of THAT type (different brands / price points). An OPEN ' +
        'NEED or problem ("something for dry skin", "a gift for mum") → assemble a small ROUTINE / mix ' +
        'across complementary categories (e.g. for skincare: serum, cream, toner, mist, maybe a set), ' +
        'not several of the same thing. ' +
        '(2) Call `search_products` with the core product NOUN in the catalog language (this store is ' +
        'often Lithuanian), e.g. "veido kremas" for a face cream. The catalog matches the whole phrase, ' +
        'so keep queries SHORT (1-2 words) and drop adjectives like dry/hydrating ("sausai", ' +
        '"drėkinamasis") — they usually return nothing. For an open need, run SEVERAL searches, one per ' +
        'complementary category, to gather a varied set. If a search is empty, retry with a broader or ' +
        'translated noun before giving up. ' +
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
  } else {
    lines.push('Answer using ONLY the context below. Cite the sources you used by their id.')
    lines.push(
      `If the answer is not contained in the context, do not invent one — reply with: "${fallback}"`,
    )
  }

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
