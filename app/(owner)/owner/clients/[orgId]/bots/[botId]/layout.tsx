import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeftIcon } from 'lucide-react'
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
      <div className="flex shrink-0 flex-wrap items-center gap-x-3 gap-y-1 bg-primary px-4 py-2 text-sm text-primary-foreground">
        <Link
          href={`/owner/clients/${orgId}`}
          className="inline-flex items-center gap-1.5 rounded-md bg-white/15 px-2.5 py-1 font-medium transition-colors hover:bg-white/25"
        >
          <ArrowLeftIcon className="size-4" aria-hidden="true" />
          Back to client
        </Link>
        <span className="text-primary-foreground/90">
          Editing <strong className="text-primary-foreground">{bot.name}</strong> for{' '}
          <strong className="text-primary-foreground">{org?.name ?? 'client'}</strong> as the platform
          owner — changes go live on save.
        </span>
      </div>
      <div className="min-h-0 flex-1">{children}</div>
    </div>
  )
}
