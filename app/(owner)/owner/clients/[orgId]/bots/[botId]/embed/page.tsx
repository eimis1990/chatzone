import { notFound } from 'next/navigation'
import { requireRole } from '@/lib/auth/guards'
import { createServiceClient } from '@/lib/supabase/service'
import { OwnerBotTabs } from '@/components/owner/OwnerBotTabs'
import { EmbedSnippetPanel } from '@/components/client/embed/EmbedSnippetPanel'
import { buildEmbedSnippet } from '@/lib/embed-snippet'
import type { Bot } from '@/lib/types'

/**
 * Owner-side Embed for a client's bot (done-for-you): the same install snippet
 * the client sees, so the owner can grab it and add it to the client's site.
 * Reuses the shared EmbedSnippetPanel; the owner's service access loads any bot.
 */
export default async function OwnerBotEmbedPage({
  params,
}: {
  params: Promise<{ orgId: string; botId: string }>
}) {
  await requireRole('owner')
  const { orgId, botId } = await params

  const svc = createServiceClient()
  const { data: bot } = await svc
    .from('bots')
    .select('id, public_key, org_id')
    .eq('id', botId)
    .single<Pick<Bot, 'id' | 'public_key' | 'org_id'>>()
  if (!bot || bot.org_id !== orgId) notFound()

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? ''
  const snippet = buildEmbedSnippet(appUrl, bot.public_key)

  return (
    <div className="flex h-full min-h-0 flex-col">
      <OwnerBotTabs orgId={orgId} botId={botId} />
      <div className="min-h-0 flex-1 overflow-auto">
        <div className="max-w-3xl p-6">
          <EmbedSnippetPanel snippet={snippet} botId={bot.id} />
        </div>
      </div>
    </div>
  )
}
