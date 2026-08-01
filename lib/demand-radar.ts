import type { ConversationChannel } from '@/lib/types'

export type DemandIssueType = 'product_gap' | 'knowledge_gap' | 'store_limitation'

export type DemandActionId =
  | 'fix_product_attributes'
  | 'add_faq'
  | 'improve_product_description'
  | 'create_collection'
  | 'add_missing_synonym'
  | 'notify_merchandising_team'
  | 'publish_correction'

export const DEMAND_ACTION_IDS = [
  'fix_product_attributes',
  'add_faq',
  'improve_product_description',
  'create_collection',
  'add_missing_synonym',
  'notify_merchandising_team',
  'publish_correction',
] as const satisfies readonly DemandActionId[]

export interface DemandRadarConversation {
  id: string
  visitor_id: string
  started_at: string
  channel?: ConversationChannel
  topics?: string[] | null
  had_fallback?: boolean
  success_score?: number | null
}

export interface DemandRadarMessage {
  conversation_id: string
  role: 'user' | 'assistant' | 'system'
  content: string
  created_at: string
  feedback?: 'up' | 'down' | null
  products?: unknown[] | null
}

export interface DemandEvidence {
  question: string
  date: string
  channel: ConversationChannel
}

export interface DemandAction {
  id: DemandActionId
  label: string
  description: string
  recommended: boolean
}

export interface DemandOpportunity {
  id: string
  title: string
  issueType: DemandIssueType
  shoppers: number
  conversations: number
  trendPercent: number
  evidence: DemandEvidence[]
  detectedIssue: string
  actions: DemandAction[]
}

export interface DemandRadarDay {
  date: string
  productGaps: number
  knowledgeGaps: number
  storeLimitations: number
}

export interface DemandRadarSnapshot {
  opportunities: DemandOpportunity[]
  daily: DemandRadarDay[]
  totalShoppers: number
  totalConversations: number
  totalSignals: number
  topIssueType: DemandIssueType | null
}

const STOP_WORDS = new Set([
  'a', 'about', 'an', 'and', 'any', 'are', 'can', 'could', 'do', 'does', 'for', 'from',
  'have', 'how', 'i', 'in', 'is', 'it', 'me', 'my', 'of', 'on', 'or', 'please', 'the',
  'this', 'to', 'under', 'want', 'what', 'where', 'which', 'with', 'you', 'your',
  'ar', 'apie', 'arba', 'gali', 'galite', 'iš', 'ir', 'kaip', 'kur', 'man', 'norėčiau',
  'su', 'už', 'yra',
])

const PRODUCT_WORDS = [
  'chair', 'sofa', 'table', 'product', 'item', 'model', 'variant', 'size', 'colour', 'color',
  'material', 'fabric', 'collection', 'budget', 'affordable', 'cm', 'kėd', 'sof', 'stal',
  'prek', 'model', 'dyd', 'spalv', 'medžiag', 'audin', 'kolekc', 'eur', '€',
]

const ATTRIBUTE_WORDS = [
  'size', 'colour', 'color', 'material', 'fabric', 'dimension', 'width', 'height', 'cm',
  'price', 'budget', '€', 'dyd', 'spalv', 'medžiag', 'audin', 'plot', 'aukšt', 'ilgi',
]

const STORE_LIMITATION_WORDS = [
  'deliver to', 'shipping to', 'delivery to', 'installment', 'instalment', 'assembly',
  'gift wrap', 'exchange', 'payment plan', 'pristatote į', 'pristatymas į', 'išsimokėtinai',
  'surinkimas', 'dovanų pakavimas', 'keitimas',
]

const KNOWLEDGE_WORDS = [
  'delivery', 'shipping', 'return', 'refund', 'warranty', 'payment', 'contact', 'care',
  'pristat', 'grąž', 'garant', 'mokėj', 'kontakt', 'priežiūr',
]

const ACTIONS: Record<DemandActionId, Omit<DemandAction, 'recommended'>> = {
  fix_product_attributes: {
    id: 'fix_product_attributes',
    label: 'Fix product attributes',
    description: 'Complete the fields shoppers use to narrow their choice.',
  },
  add_faq: {
    id: 'add_faq',
    label: 'Add an FAQ',
    description: 'Turn the repeated question into a grounded store answer.',
  },
  improve_product_description: {
    id: 'improve_product_description',
    label: 'Improve product description',
    description: 'Add the missing buying detail to the relevant products.',
  },
  create_collection: {
    id: 'create_collection',
    label: 'Create a collection',
    description: 'Group matching products around this shopper intent.',
  },
  add_missing_synonym: {
    id: 'add_missing_synonym',
    label: 'Add a missing synonym',
    description: 'Teach search the wording shoppers actually use.',
  },
  notify_merchandising_team: {
    id: 'notify_merchandising_team',
    label: 'Notify merchandising team',
    description: 'Share the evidence with the person who owns the catalog.',
  },
  publish_correction: {
    id: 'publish_correction',
    label: 'Publish correction to store',
    description: 'Available after a supported write-back connection is approved.',
  },
}

interface Candidate {
  conversationId: string
  visitorId: string
  startedAt: string
  channel: ConversationChannel
  question: string
  tokens: Set<string>
  issueType: DemandIssueType
}

interface Cluster {
  id: string
  candidates: Candidate[]
  tokens: Set<string>
}

function normalizedTokens(value: string): Set<string> {
  const words = value
    .toLocaleLowerCase('lt-LT')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9€]+/g, ' ')
    .split(/\s+/)
    .filter((word) => word.length > 2 && !STOP_WORDS.has(word))
  return new Set(words)
}

function similarity(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 || b.size === 0) return 0
  let intersection = 0
  for (const token of a) if (b.has(token)) intersection++
  return intersection / Math.min(a.size, b.size)
}

function includesAny(value: string, phrases: string[]): boolean {
  const lower = value.toLocaleLowerCase('lt-LT')
  return phrases.some((phrase) => lower.includes(phrase))
}

function classifyIssue(question: string, hasProducts: boolean): DemandIssueType {
  if (includesAny(question, STORE_LIMITATION_WORDS)) return 'store_limitation'
  if (includesAny(question, PRODUCT_WORDS) && !hasProducts) return 'product_gap'
  if (includesAny(question, KNOWLEDGE_WORDS)) return 'knowledge_gap'
  return hasProducts ? 'knowledge_gap' : 'product_gap'
}

function redactEvidence(value: string): string {
  return value
    .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, '[email removed]')
    .replace(/\b(?:order|užsakym(?:as|o|ą)?)[\s#:.-]*[A-Z0-9-]{4,}\b/gi, 'order [number removed]')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 180)
}

function opportunityTitle(value: string): string {
  const cleaned = redactEvidence(value).replace(/[?.!]+$/g, '')
  if (!cleaned) return 'Unresolved shopper request'
  const title = cleaned.length > 72 ? `${cleaned.slice(0, 69).trimEnd()}…` : cleaned
  return title.charAt(0).toLocaleUpperCase('lt-LT') + title.slice(1)
}

function issueDescription(issueType: DemandIssueType, hasAttributeIntent: boolean): string {
  if (issueType === 'store_limitation') {
    return 'Shoppers are asking for a service or policy the store may not currently offer. Confirm the limitation and publish a clear answer.'
  }
  if (issueType === 'knowledge_gap') {
    return 'The same question is ending in a fallback, low-confidence answer, or negative rating. The knowledge base needs a clearer source.'
  }
  if (hasAttributeIntent) {
    return 'No matching product cards were shown. Relevant product attributes appear incomplete or use different wording than shoppers.'
  }
  return 'No matching product cards were shown. The catalog may need a focused collection, richer product data, or shopper-language synonyms.'
}

function actionsFor(issueType: DemandIssueType, hasAttributeIntent: boolean): DemandAction[] {
  const recommended: DemandActionId[] = issueType === 'product_gap'
    ? [
        ...(hasAttributeIntent ? (['fix_product_attributes'] as DemandActionId[]) : []),
        'create_collection',
        'add_missing_synonym',
        'notify_merchandising_team',
      ]
    : issueType === 'knowledge_gap'
      ? ['add_faq', 'improve_product_description', 'add_missing_synonym', 'notify_merchandising_team']
      : ['add_faq', 'notify_merchandising_team']

  const secondary: DemandActionId[] = issueType === 'product_gap'
    ? ['add_faq', 'improve_product_description']
    : issueType === 'store_limitation'
      ? ['add_missing_synonym']
      : ['fix_product_attributes']

  const allActions: DemandActionId[] = [...recommended, ...secondary, 'publish_correction']
  return allActions.map((id) => ({
    ...ACTIONS[id],
    recommended: recommended.includes(id),
  }))
}

function isoDate(date: Date): string {
  return date.toISOString().slice(0, 10)
}

function daysAgo(now: Date, days: number): Date {
  const date = new Date(now)
  date.setUTCHours(0, 0, 0, 0)
  date.setUTCDate(date.getUTCDate() - days)
  return date
}

function createDailyRange(rangeDays: number, now: Date): DemandRadarDay[] {
  const start = daysAgo(now, rangeDays - 1)
  return Array.from({ length: rangeDays }, (_, index) => {
    const date = new Date(start)
    date.setUTCDate(start.getUTCDate() + index)
    return { date: isoDate(date), productGaps: 0, knowledgeGaps: 0, storeLimitations: 0 }
  })
}

function buildCandidates(
  conversations: DemandRadarConversation[],
  messages: DemandRadarMessage[],
): Candidate[] {
  const byConversation = new Map<string, DemandRadarMessage[]>()
  for (const message of messages) {
    const existing = byConversation.get(message.conversation_id) ?? []
    existing.push(message)
    byConversation.set(message.conversation_id, existing)
  }

  const candidates: Candidate[] = []
  for (const conversation of conversations) {
    const transcript = byConversation.get(conversation.id) ?? []
    const assistantMessages = transcript.filter((message) => message.role === 'assistant')
    const hasProducts = assistantMessages.some((message) => (message.products?.length ?? 0) > 0)
    const hasNegativeFeedback = assistantMessages.some((message) => message.feedback === 'down')
    const unresolved = Boolean(
      conversation.had_fallback ||
      hasNegativeFeedback ||
      (conversation.success_score != null && conversation.success_score > 0 && conversation.success_score <= 3),
    )
    const topicText = (conversation.topics ?? []).join(' ')

    for (const message of transcript) {
      if (message.role !== 'user') continue
      const question = redactEvidence(message.content)
      if (question.length < 8) continue
      const missedProductRequest = includesAny(question, PRODUCT_WORDS) && !hasProducts
      if (!unresolved && !missedProductRequest) continue

      const tokens = normalizedTokens(`${question} ${topicText}`)
      if (tokens.size === 0) continue
      candidates.push({
        conversationId: conversation.id,
        visitorId: conversation.visitor_id,
        startedAt: conversation.started_at,
        channel: conversation.channel ?? 'chat',
        question,
        tokens,
        issueType: classifyIssue(question, hasProducts),
      })
    }
  }
  return candidates
}

function clusterCandidates(candidates: Candidate[]): Cluster[] {
  const clusters: Cluster[] = []
  for (const candidate of candidates) {
    const match = clusters.find((cluster) => similarity(candidate.tokens, cluster.tokens) >= 0.5)
    if (match) {
      match.candidates.push(candidate)
      for (const token of candidate.tokens) match.tokens.add(token)
    } else {
      clusters.push({
        id: `demand-${clusters.length + 1}`,
        candidates: [candidate],
        tokens: new Set(candidate.tokens),
      })
    }
  }
  return clusters
}

export function buildDemandRadarSnapshot({
  conversations,
  messages,
  rangeDays,
  now = new Date(),
}: {
  conversations: DemandRadarConversation[]
  messages: DemandRadarMessage[]
  rangeDays: number
  now?: Date
}): DemandRadarSnapshot {
  const candidates = buildCandidates(conversations, messages)
  const clusters = clusterCandidates(candidates)
  const recentStart = daysAgo(now, 6).getTime()
  const previousStart = daysAgo(now, 13).getTime()

  const opportunities = clusters.map((cluster): DemandOpportunity => {
    const issueCounts: Record<DemandIssueType, number> = {
      product_gap: 0,
      knowledge_gap: 0,
      store_limitation: 0,
    }
    for (const candidate of cluster.candidates) issueCounts[candidate.issueType]++
    const issueType = (Object.entries(issueCounts) as [DemandIssueType, number][])
      .sort((a, b) => b[1] - a[1])[0][0]
    const uniqueConversations = new Set(cluster.candidates.map((candidate) => candidate.conversationId))
    const uniqueShoppers = new Set(cluster.candidates.map((candidate) => candidate.visitorId))
    const recent = new Set(
      cluster.candidates
        .filter((candidate) => new Date(candidate.startedAt).getTime() >= recentStart)
        .map((candidate) => candidate.conversationId),
    ).size
    const previous = new Set(
      cluster.candidates
        .filter((candidate) => {
          const time = new Date(candidate.startedAt).getTime()
          return time >= previousStart && time < recentStart
        })
        .map((candidate) => candidate.conversationId),
    ).size
    const trendPercent = previous === 0 ? (recent > 0 ? 100 : 0) : Math.round(((recent - previous) / previous) * 100)
    const representative = [...cluster.candidates].sort((a, b) => a.question.length - b.question.length)[0]
    const hasAttributeIntent = cluster.candidates.some((candidate) => includesAny(candidate.question, ATTRIBUTE_WORDS))
    const evidenceSeen = new Set<string>()
    const evidence = [...cluster.candidates]
      .sort((a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime())
      .filter((candidate) => {
        const key = candidate.question.toLocaleLowerCase('lt-LT')
        if (evidenceSeen.has(key)) return false
        evidenceSeen.add(key)
        return true
      })
      .slice(0, 3)
      .map((candidate) => ({
        question: candidate.question,
        date: candidate.startedAt,
        channel: candidate.channel,
      }))

    return {
      id: cluster.id,
      title: opportunityTitle(representative.question),
      issueType,
      shoppers: uniqueShoppers.size,
      conversations: uniqueConversations.size,
      trendPercent,
      evidence,
      detectedIssue: issueDescription(issueType, hasAttributeIntent),
      actions: actionsFor(issueType, hasAttributeIntent),
    }
  }).sort((a, b) => b.shoppers - a.shoppers || b.trendPercent - a.trendPercent)

  const daily = createDailyRange(rangeDays, now)
  const dailyByDate = new Map(daily.map((day) => [day.date, day]))
  const countedDaily = new Set<string>()
  for (const candidate of candidates) {
    const date = candidate.startedAt.slice(0, 10)
    const day = dailyByDate.get(date)
    const uniqueKey = `${date}:${candidate.issueType}:${candidate.conversationId}`
    if (!day || countedDaily.has(uniqueKey)) continue
    countedDaily.add(uniqueKey)
    if (candidate.issueType === 'product_gap') day.productGaps++
    if (candidate.issueType === 'knowledge_gap') day.knowledgeGaps++
    if (candidate.issueType === 'store_limitation') day.storeLimitations++
  }

  const totalByIssue: Record<DemandIssueType, number> = {
    product_gap: 0,
    knowledge_gap: 0,
    store_limitation: 0,
  }
  for (const opportunity of opportunities) totalByIssue[opportunity.issueType] += opportunity.conversations
  const topIssueType = opportunities.length > 0
    ? (Object.entries(totalByIssue) as [DemandIssueType, number][]).sort((a, b) => b[1] - a[1])[0][0]
    : null

  return {
    opportunities,
    daily,
    totalShoppers: new Set(candidates.map((candidate) => candidate.visitorId)).size,
    totalConversations: new Set(candidates.map((candidate) => candidate.conversationId)).size,
    totalSignals: candidates.length,
    topIssueType,
  }
}

export const DEMAND_ISSUE_LABELS: Record<DemandIssueType, string> = {
  product_gap: 'Product gaps',
  knowledge_gap: 'Knowledge gaps',
  store_limitation: 'Store limitations',
}
