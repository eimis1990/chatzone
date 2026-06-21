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
        '(1) call `search_products` with the core product NOUN in the catalog language (this store is ' +
        'often Lithuanian), e.g. "veido kremas" for a face cream. The catalog search matches the whole ' +
        'phrase, so keep the query SHORT (1-2 words) and leave out adjectives like dry/hydrating/sensitive ' +
        '("sausai", "drėkinamasis") — those usually return nothing. ' +
        '(2) If a search returns zero or very few results, DO NOT give up — search again with a broader ' +
        'or alternative noun (drop adjectives, try a synonym or category, translate the term). Try a few ' +
        'angles before concluding the store has nothing. ' +
        '(3) Review the candidate titles/descriptions and call `display_products` with ONLY the ids that ' +
        'genuinely match the user\'s intent and category — exclude items that merely share a keyword ' +
        '(e.g. never show a bath product for a face-skin request). ' +
        'The chosen products appear to the user as cards automatically, so reply with ONE short sentence ' +
        '(e.g. "Here are a few options:") and do NOT list products, prices, or links in your text. ' +
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
