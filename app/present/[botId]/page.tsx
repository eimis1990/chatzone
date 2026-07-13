import { notFound } from 'next/navigation'
import { requireRole } from '@/lib/auth/guards'
import { createServiceClient } from '@/lib/supabase/service'
import { WidgetEmbed } from '@/components/landing/WidgetEmbed'

/**
 * Full-screen presentation stage for a demo bot: a clean dotted backdrop with
 * the real widget (launcher + chat) — what the owner screen-shares during a
 * pitch. Owner-only; lives outside the owner shell so there is no sidebar.
 */
export default async function PresentPage({ params }: { params: Promise<{ botId: string }> }) {
  await requireRole('owner')
  const { botId } = await params

  const svc = createServiceClient()
  const { data: bot } = await svc
    .from('bots')
    .select('id, name, public_key, org_id, organizations!inner(is_demo, is_platform)')
    .eq('id', botId)
    .single<{ id: string; name: string; public_key: string }>()
  if (!bot) notFound()

  return (
    <div className="bg-dots relative min-h-svh">
      <div className="pointer-events-none absolute inset-x-0 top-0 flex items-center justify-between p-6">
        <div>
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Loqara demo</p>
          <h1 className="text-xl font-semibold">{bot.name}</h1>
        </div>
        <p className="text-xs text-muted-foreground">Click the launcher to start ↘</p>
      </div>
      <WidgetEmbed botKey={bot.public_key} />
    </div>
  )
}
