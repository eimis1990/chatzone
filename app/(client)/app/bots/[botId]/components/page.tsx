import { notFound } from 'next/navigation'
import { requireRole } from '@/lib/auth/guards'
import { createServerClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { assignedComponentVariants } from '@/lib/widget-components/availability'
import { BotComponentsView } from '@/components/client/BotComponentsView'
import type { Bot } from '@/lib/types'

/**
 * Client-facing component picker: what the assistant renders in chat, with the
 * variants the owner made available for this bot's store platform.
 */
export default async function BotComponentsPage({
  params,
}: {
  params: Promise<{ botId: string }>
}) {
  await requireRole('client')
  const { botId } = await params

  const supabase = await createServerClient()
  const { data: bot } = await supabase
    .from('bots')
    .select('id, config')
    .eq('id', botId)
    .single<Pick<Bot, 'id' | 'config'>>()
  if (!bot) notFound()

  const allowed = await assignedComponentVariants(
    createServiceClient(),
    bot.config.commerce?.provider ?? null,
  )

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-lg font-semibold">Components</h1>
        <p className="text-sm text-muted-foreground">
          The visual building blocks your assistant can show in chat. Pick the style that fits your
          brand — changes apply to new conversations right away.
        </p>
      </div>
      <BotComponentsView
        botId={bot.id}
        available={Object.fromEntries([...allowed].map(([k, v]) => [k, [...v]]))}
        currentVariants={bot.config.components ?? {}}
      />
    </div>
  )
}
