/**
 * Chat transport — the network boundary for the chat UI (`ChatWindow`).
 *
 * The same `ChatWindow` renders in two places:
 *   - the live embed widget (public endpoints, scoped by `publicKey`), and
 *   - the configurator preview (authenticated `/api/preview/*`, in-memory config).
 *
 * Injecting the transport keeps a single UI component for both, so the preview
 * can never visually drift from what visitors actually see.
 */
import type { BotLanguage, HandoffStatus } from '@/lib/types'
import type { CommerceProduct, OrderStatus } from '@/lib/commerce/types'

export interface SendChatParams {
  message: string
  conversationId?: string
  language: BotLanguage
  visitorId: string
  /** Prior turns (used by the stateless preview endpoint; ignored by the widget). */
  history: { role: 'user' | 'assistant'; content: string }[]
}

export interface PollResult {
  status: HandoffStatus
  agentName: string | null
  serverTime?: string
  messages?: { id: string; content: string }[]
}

export interface ChatTransport {
  /** Send a turn; returns the streaming NDJSON Response (with x-* headers). */
  sendChat(params: SendChatParams): Promise<Response>
  /** Product search for the voice `search_products` client tool. */
  search(query: string): Promise<{ products?: CommerceProduct[]; summary?: string }>
  /** Short-lived ElevenLabs token for a live voice call. */
  getVoiceToken(language: BotLanguage): Promise<{ token: string; voiceId?: string }>
  /** Real persisted message ids (so feedback can target them). */
  fetchMessages(conversationId: string): Promise<{ id: string; role: string; content: string }[]>
  /** Visitor thumbs feedback on a bot reply. */
  sendFeedback(messageId: string, value: 'up' | 'down'): Promise<void>
  /** Escalate to a human. Returns null when unsupported (caller falls back). */
  requestHandoff(conversationId?: string): Promise<{ status: HandoffStatus } | null>
  /** Poll for the handoff status + new human-agent replies. */
  poll(conversationId: string, afterTs?: string): Promise<PollResult>
  /** Submit a captured lead. */
  submitLead(conversationId: string | undefined, fields: Record<string, string>): Promise<void>
  /** Voice `order_status` tool: look up an order (identity-gated server-side). */
  lookupOrder(orderId: string, email: string): Promise<{ found: boolean; order?: OrderStatus; summary: string }>
  /** Voice `discount_code` tool: fetch the configured discount. */
  getDiscountInfo(): Promise<{ available: boolean; code?: string; description?: string; summary: string }>
}

const JSON_HEADERS = { 'Content-Type': 'application/json' }

/** Live embed-widget transport: the public endpoints, scoped by `publicKey`. */
export function createWidgetTransport(publicKey: string): ChatTransport {
  return {
    async sendChat({ message, conversationId, language, visitorId }) {
      return fetch('/api/chat', {
        method: 'POST',
        headers: JSON_HEADERS,
        body: JSON.stringify({ publicKey, visitorId, conversationId, message, language }),
      })
    },

    async search(query) {
      const res = await fetch('/api/widget/search', {
        method: 'POST',
        headers: JSON_HEADERS,
        body: JSON.stringify({ publicKey, query }),
      })
      return (await res.json()) as { products?: CommerceProduct[]; summary?: string }
    },

    async getVoiceToken(language) {
      const res = await fetch('/api/widget/voice-token', {
        method: 'POST',
        headers: JSON_HEADERS,
        body: JSON.stringify({ publicKey, language }),
      })
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string }
        throw new Error(
          res.status === 503 ? 'Voice calling unavailable' : (data.error ?? 'Token request failed'),
        )
      }
      const data = (await res.json()) as { token: string; voiceId?: string }
      return { token: data.token, voiceId: data.voiceId }
    },

    async fetchMessages(conversationId) {
      const res = await fetch(
        `/api/messages?publicKey=${encodeURIComponent(publicKey)}&conversationId=${encodeURIComponent(conversationId)}`,
      )
      if (!res.ok) return []
      const data = (await res.json()) as { messages?: { id: string; role: string; content: string }[] }
      return data.messages ?? []
    },

    async sendFeedback(messageId, value) {
      await fetch('/api/feedback', {
        method: 'POST',
        headers: JSON_HEADERS,
        body: JSON.stringify({ publicKey, messageId, value }),
      })
    },

    async requestHandoff(conversationId) {
      if (!conversationId) return null
      const res = await fetch('/api/widget/request-handoff', {
        method: 'POST',
        headers: JSON_HEADERS,
        body: JSON.stringify({ publicKey, conversationId }),
      })
      if (!res.ok) return null
      return (await res.json()) as { status: HandoffStatus }
    },

    async poll(conversationId, afterTs) {
      const res = await fetch('/api/widget/poll', {
        method: 'POST',
        headers: JSON_HEADERS,
        body: JSON.stringify({ publicKey, conversationId, afterTs }),
      })
      if (!res.ok) throw new Error('poll failed')
      return (await res.json()) as PollResult
    },

    async submitLead(conversationId, fields) {
      const res = await fetch('/api/lead', {
        method: 'POST',
        headers: JSON_HEADERS,
        body: JSON.stringify({ publicKey, conversationId, fields }),
      })
      if (!res.ok) throw new Error('Lead submission failed')
    },

    async lookupOrder(orderId, email) {
      const res = await fetch('/api/widget/order', {
        method: 'POST',
        headers: JSON_HEADERS,
        body: JSON.stringify({ publicKey, orderId, email }),
      })
      if (!res.ok) return { found: false, summary: 'The order lookup is temporarily unavailable.' }
      return (await res.json()) as { found: boolean; order?: OrderStatus; summary: string }
    },

    async getDiscountInfo() {
      const res = await fetch('/api/widget/discount', {
        method: 'POST',
        headers: JSON_HEADERS,
        body: JSON.stringify({ publicKey }),
      })
      if (!res.ok) return { available: false, summary: 'No discount is available right now.' }
      return (await res.json()) as { available: boolean; code?: string; description?: string; summary: string }
    },
  }
}
