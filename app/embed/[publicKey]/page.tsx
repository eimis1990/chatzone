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
  searchParams,
}: {
  params: Promise<{ publicKey: string }>
  searchParams: Promise<{ c?: string | string[]; bg?: string | string[] }>
}) {
  const { publicKey } = await params
  const query = await searchParams
  const accent = normalizeHexColor(query.c)
  const background = normalizeHexColor(query.bg)

  return (
    <EmbedShell
      publicKey={publicKey}
      initialLoaderColor={accent}
      initialBackgroundColor={background}
    />
  )
}

function normalizeHexColor(value: string | string[] | undefined) {
  const candidate = Array.isArray(value) ? value[0] : value
  if (
    !candidate ||
    !/^#?(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{4}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/.test(
      candidate,
    )
  ) {
    return undefined
  }
  return candidate.startsWith('#') ? candidate : `#${candidate}`
}
