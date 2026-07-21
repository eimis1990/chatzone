/**
 * Controlled blog topic taxonomy (design §3.5: hubs organize stable reader
 * intent — never free-form tags or per-keyword archives). Every post declares
 * exactly one of these in `topic:` frontmatter; tests enforce the vocabulary.
 *
 * Each hub owns a unique editorial introduction and one pillar post that
 * anchors the cluster. Add a topic only for a durable audience intent with
 * enough distinct articles to be worth a hub.
 */
export interface BlogTopic {
  /** URL segment under /blog/topics/. */
  slug: string
  /** Short label used in navigation chips and article bylines. */
  name: string
  /** Hub <title> / og:title. */
  title: string
  /** Hub meta description. */
  description: string
  /** Unique editorial introduction rendered at the top of the hub (2–3 sentences). */
  intro: string
  /** Slug of the pillar post listed first on the hub. */
  pillar: string
}

export const BLOG_TOPICS: BlogTopic[] = [
  {
    slug: 'ai-customer-support',
    name: 'AI customer support',
    title: 'AI customer support for e-commerce',
    description:
      'Guides on running e-commerce support with an AI agent: cutting tickets, human handoff, hallucination control, GDPR, and testing before launch.',
    intro:
      'Most store support is the same handful of questions on repeat — and that is exactly what an AI agent handles well, if you set it up honestly. These guides cover the operational side: reducing ticket volume, building the knowledge base, handing off to humans at the right moment, keeping answers grounded, and staying on the right side of GDPR.',
    pillar: 'reduce-support-tickets-with-ai',
  },
  {
    slug: 'ecommerce-ai',
    name: 'AI for e-commerce',
    title: 'AI for e-commerce stores',
    description:
      'Practical AI use cases beyond support: personalization, product recommendations, inventory forecasting, fraud detection, cart recovery, and conversational commerce.',
    intro:
      'AI earns its keep in a store when it changes a number you already track — conversion, average order value, stockouts, fraud losses. This cluster walks through the use cases that do that in practice, from recommendations and personalization to forecasting and abandoned-cart recovery, with honest notes on what each one takes to run.',
    pillar: 'ai-for-ecommerce',
  },
  {
    slug: 'platform-integrations',
    name: 'Platform integrations',
    title: 'AI chatbots for Shopify, WooCommerce & Magento',
    description:
      'Step-by-step setup guides for adding an AI agent to WooCommerce, Shopify, Magento/Adobe Commerce, or any storefront with a one-line embed.',
    intro:
      'Adding an AI agent to a store should not be a replatforming project. These are the concrete setup guides per platform — WooCommerce, Shopify, Magento — plus the generic one-line embed that works anywhere you can paste a script tag.',
    pillar: 'ai-chatbot-for-online-store',
  },
  {
    slug: 'voice-ai',
    name: 'Voice AI',
    title: 'Voice AI for online stores',
    description:
      'What AI voice agents are, when talking beats typing for store visitors, and how to add real-time voice support to an e-commerce site.',
    intro:
      'Some customers would rather just say what they need than type it. Voice agents make that work on a website — these guides explain how the technology fits e-commerce, when it is genuinely worth the add-on cost, and how to switch it on.',
    pillar: 'ai-voice-agents-explained',
  },
  {
    slug: 'ai-search-visibility',
    name: 'AI search visibility',
    title: 'AI search visibility & GEO for e-commerce',
    description:
      'How stores get found and cited by AI search: generative engine optimization, Google AI Mode, ChatGPT shopping, agentic commerce, and measurement.',
    intro:
      'A growing share of product discovery happens inside AI answers rather than blue links. This cluster covers what a store can actually do about it — structured data, crawlability, GEO practices, Google AI Mode and ChatGPT shopping specifics — and how to measure whether any of it is working, without chasing tricks.',
    pillar: 'generative-engine-optimization-ecommerce',
  },
  {
    slug: 'vendor-comparisons',
    name: 'Vendor comparisons',
    title: 'AI chatbot comparisons & buying guides',
    description:
      'Honest comparisons of e-commerce chat platforms — Tidio, Zendesk, Gorgias, Intercom and others — plus pricing breakdowns and how to choose.',
    intro:
      'Chat platforms differ more in pricing model and support scope than in marketing copy, so these comparisons focus on what each tool actually includes at each tier and who it fits. Loqara competes in this market — every comparison states that relationship and the evaluation method up front.',
    pillar: 'best-ai-chatbot-for-ecommerce',
  },
]

export const TOPIC_SLUGS = BLOG_TOPICS.map((t) => t.slug)

export function getTopic(slug: string): BlogTopic | null {
  return BLOG_TOPICS.find((t) => t.slug === slug) ?? null
}
