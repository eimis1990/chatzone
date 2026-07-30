import { NextResponse, type NextRequest } from 'next/server'
import { getEnv } from '@/lib/env'
import {
  verifyHandshake,
  isValidSignature,
  extractTextMessages,
  sendTextMessage,
} from '@/lib/channels/meta'

// Signature verification needs the raw body + Node crypto.
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/** Meta's one-time webhook verification handshake. */
export function GET(req: NextRequest) {
  const challenge = verifyHandshake(
    req.nextUrl.searchParams,
    getEnv().META_WEBHOOK_VERIFY_TOKEN,
  )
  if (!challenge) return NextResponse.json({ error: 'Verification failed' }, { status: 403 })
  return new NextResponse(challenge, { status: 200 })
}

export async function POST(req: NextRequest) {
  const env = getEnv()
  const rawBody = await req.text()
  if (!isValidSignature(rawBody, req.headers.get('x-hub-signature-256'), env.META_APP_SECRET)) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
  }

  let payload: unknown
  try {
    payload = JSON.parse(rawBody)
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  // ponytail: spike — fixed reply from a single env-configured Page token.
  // Replaced by channel_connections lookup + the shared message processor
  // (docs/CHANNELS_IMPLEMENTATION.md) in the next delivery step.
  const messages = extractTextMessages(payload)
  const token = env.META_PAGE_ACCESS_TOKEN
  if (token) {
    for (const msg of messages) {
      try {
        await sendTextMessage(
          msg.senderId,
          'Thanks for your message! Loqara Messenger integration is under construction.',
          token,
        )
      } catch (err) {
        // Ack Meta regardless — a send failure must not trigger redelivery
        // of the inbound event (that path gets retries + idempotency later).
        console.error('[meta-webhook] send failed:', err instanceof Error ? err.message : err)
      }
    }
  }

  return NextResponse.json({ received: true })
}
