import { notFound } from 'next/navigation'
import { requireRole } from '@/lib/auth/guards'
import { createServerClient } from '@/lib/supabase/server'
import { EmbedSnippetPanel } from '@/components/client/embed/EmbedSnippetPanel'
import { buildEmbedSnippet } from '@/lib/embed-snippet'
import type { Bot } from '@/lib/types'

export default async function EmbedSnippetPage({
  params,
}: {
  params: Promise<{ botId: string }>
}) {
  await requireRole('client')
  const { botId } = await params

  const supabase = await createServerClient()
  const { data } = await supabase
    .from('bots')
    .select('id, name, public_key, status')
    .eq('id', botId)
    .single<Pick<Bot, 'id' | 'name' | 'public_key' | 'status'>>()

  if (!data) notFound()

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? ''
  const snippet = buildEmbedSnippet(appUrl, data.public_key)

  return (
    <div className="max-w-3xl p-6">
      <EmbedSnippetPanel snippet={snippet} botId={data.id} />
    </div>
  )
}
