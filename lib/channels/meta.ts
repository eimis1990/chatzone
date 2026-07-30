import crypto from 'node:crypto'

/**
 * Meta (Messenger/Instagram) webhook helpers — pure functions so the route
 * stays thin and the trust-boundary logic is unit-testable.
 * Docs: https://developers.facebook.com/docs/messenger-platform/webhooks
 */

const GRAPH_API_BASE = 'https://graph.facebook.com/v23.0'

/**
 * Meta's GET verification handshake. Returns the challenge string to echo
 * back, or null when the request is invalid or no verify token is configured
 * (fail closed).
 */
export function verifyHandshake(
  params: URLSearchParams,
  verifyToken: string | undefined,
): string | null {
  if (!verifyToken) return null
  const mode = params.get('hub.mode')
  const token = params.get('hub.verify_token')
  const challenge = params.get('hub.challenge')
  if (mode !== 'subscribe' || !challenge) return null
  const expected = Buffer.from(verifyToken)
  const actual = Buffer.from(token ?? '')
  if (expected.length !== actual.length) return null
  return crypto.timingSafeEqual(expected, actual) ? challenge : null
}

/**
 * Validates Meta's `X-Hub-Signature-256` header (sha256 HMAC of the raw body
 * keyed by the app secret) with a timing-safe comparison. Fails closed when
 * the secret is unconfigured or the header is missing/malformed.
 */
export function isValidSignature(
  rawBody: string,
  signatureHeader: string | null,
  appSecret: string | undefined,
): boolean {
  if (!appSecret || !signatureHeader?.startsWith('sha256=')) return false
  const theirs = signatureHeader.slice('sha256='.length)
  const ours = crypto.createHmac('sha256', appSecret).update(rawBody).digest('hex')
  if (theirs.length !== ours.length) return false
  return crypto.timingSafeEqual(Buffer.from(theirs, 'hex'), Buffer.from(ours, 'hex'))
}

/** The subset of a webhook messaging event the spike cares about. */
export type InboundTextMessage = {
  pageId: string
  senderId: string
  messageId: string
  text: string
  timestamp: number
}

/**
 * Extracts inbound visitor text messages from a parsed `page`-topic webhook
 * payload. Skips echoes (our own outbound messages redelivered), delivery and
 * read receipts, and non-text messages.
 */
export function extractTextMessages(payload: unknown): InboundTextMessage[] {
  const out: InboundTextMessage[] = []
  const body = payload as {
    object?: string
    entry?: Array<{
      id?: string
      messaging?: Array<{
        sender?: { id?: string }
        timestamp?: number
        message?: { mid?: string; text?: string; is_echo?: boolean }
      }>
    }>
  }
  if (body?.object !== 'page') return out
  for (const entry of body.entry ?? []) {
    for (const event of entry.messaging ?? []) {
      const msg = event.message
      if (!msg?.text || msg.is_echo || !msg.mid || !event.sender?.id || !entry.id) continue
      out.push({
        pageId: entry.id,
        senderId: event.sender.id,
        messageId: msg.mid,
        text: msg.text,
        timestamp: event.timestamp ?? 0,
      })
    }
  }
  return out
}

/** Sends a text reply via the Messenger Send API. Throws on Graph API errors. */
export async function sendTextMessage(
  recipientId: string,
  text: string,
  pageAccessToken: string,
): Promise<{ messageId: string }> {
  const res = await fetch(`${GRAPH_API_BASE}/me/messages?access_token=${pageAccessToken}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      recipient: { id: recipientId },
      messaging_type: 'RESPONSE',
      message: { text },
    }),
  })
  const data = (await res.json().catch(() => null)) as {
    message_id?: string
    error?: { message?: string; code?: number }
  } | null
  if (!res.ok || !data?.message_id) {
    throw new Error(`Messenger send failed (${res.status}): ${data?.error?.message ?? 'unknown'}`)
  }
  return { messageId: data.message_id }
}
