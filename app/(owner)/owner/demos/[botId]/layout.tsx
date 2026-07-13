import { notFound } from 'next/navigation'
import Link from 'next/link'
import { requireRole } from '@/lib/auth/guards'
import { createServiceClient } from '@/lib/supabase/service'
import { getOrCreateDemoOrg } from '@/lib/demo-org'

/**
 * Shell for editing a demo bot — same editor as the done-for-you client flow,
 * but scoped under /owner/demos so the owner never appears to leave the Demos
 * section (editing a demo used to route through /owner/clients, which read as
 * editing a client's bot).
 */
export default async function DemoBotEditorLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ botId: string }>
}) {
  await requireRole('owner')
  const { botId } = await params

  const org = await getOrCreateDemoOrg()
  const svc = createServiceClient()
  const { data: bot } = await svc
    .from('bots')
    .select('id, name, org_id')
    .eq('id', botId)
    .single<{ id: string; name: string; org_id: string }>()
  if (!bot || bot.org_id !== org.id) notFound()

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex shrink-0 flex-wrap items-center gap-x-2 gap-y-1 border-b border-violet-200 bg-violet-50 px-4 py-2 text-sm text-violet-900">
        <span>
          Editing demo <strong>{bot.name}</strong> — a showcase bot, not a client&rsquo;s.
        </span>
        <Link href="/owner/demos" className="font-medium underline">
          ← Back to demos
        </Link>
      </div>
      <div className="min-h-0 flex-1">{children}</div>
    </div>
  )
}
