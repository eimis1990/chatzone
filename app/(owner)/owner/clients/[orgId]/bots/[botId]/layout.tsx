import { notFound } from 'next/navigation'
import Link from 'next/link'
import { requireRole } from '@/lib/auth/guards'
import { createServiceClient } from '@/lib/supabase/service'

/**
 * Shell for the owner editing a client's bot (done-for-you). Shows the "editing
 * as owner" banner + Configure / Knowledge tabs; each tab renders below.
 */
export default async function OwnerBotEditorLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ orgId: string; botId: string }>
}) {
  await requireRole('owner')
  const { orgId, botId } = await params

  const svc = createServiceClient()
  const { data: bot } = await svc
    .from('bots')
    .select('id, name, org_id')
    .eq('id', botId)
    .single<{ id: string; name: string; org_id: string }>()
  if (!bot || bot.org_id !== orgId) notFound()

  const { data: org } = await svc
    .from('organizations')
    .select('name')
    .eq('id', orgId)
    .single<{ name: string }>()

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex shrink-0 flex-wrap items-center gap-x-2 gap-y-1 border-b border-amber-200 bg-amber-50 px-4 py-2 text-sm text-amber-900">
        <span>
          Editing <strong>{bot.name}</strong> for <strong>{org?.name ?? 'client'}</strong> as the
          platform owner — changes go live on save.
        </span>
        <Link href={`/owner/clients/${orgId}`} className="font-medium underline">
          ← Back to client
        </Link>
      </div>
      <div className="min-h-0 flex-1">{children}</div>
    </div>
  )
}
