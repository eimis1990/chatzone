/**
 * Embed Chat Page
 *
 * This page renders INSIDE an iframe on the customer's site. It must be fully
 * self-contained — no app navigation, no auth requirement.
 *
 * The page is a thin shell: it renders the <ChatWindow> client component which
 * fetches /api/widget-config at runtime (client-side) so the iframe can run on
 * a completely different origin from the host site.
 */
import type { Metadata } from 'next'
import { EmbedShell } from './EmbedShell'

export const metadata: Metadata = {
  robots: 'noindex, nofollow',
}

export default async function EmbedPage({
  params,
}: {
  params: Promise<{ publicKey: string }>
}) {
  const { publicKey } = await params
  return <EmbedShell publicKey={publicKey} />
}
