import Link from 'next/link'
import { notFound } from 'next/navigation'
import { requireRole } from '@/lib/auth/guards'
import { createServerClient } from '@/lib/supabase/server'
import { Badge } from '@/components/ui/badge'
import type { Bot } from '@/lib/types'

const NAV_TABS = [
  { label: 'Configure', href: 'configure' },
  { label: 'Knowledge', href: 'knowledge' },
  { label: 'Conversations', href: 'conversations' },
  { label: 'Leads', href: 'leads' },
  { label: 'Analytics', href: 'analytics' },
  { label: 'Embed', href: 'embed' },
] as const

export default async function BotLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ botId: string }>
}) {
  await requireRole('client')
  const { botId } = await params

  const supabase = await createServerClient()
  const { data } = await supabase
    .from('bots')
    .select('id, name, status, org_id')
    .eq('id', botId)
    .single<Pick<Bot, 'id' | 'name' | 'status' | 'org_id'>>()

  if (!data) notFound()

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Bot header */}
      <div className="flex items-center gap-3">
        <div>
          <h1 className="text-xl font-semibold">{data.name}</h1>
        </div>
        <Badge
          variant={data.status === 'active' ? 'default' : 'secondary'}
          className="capitalize"
        >
          {data.status}
        </Badge>
      </div>

      {/* Tab navigation */}
      <nav className="flex gap-1 border-b -mb-6 pb-0">
        {NAV_TABS.map((tab) => (
          <BotTab
            key={tab.href}
            label={tab.label}
            href={`/app/bots/${botId}/${tab.href}`}
          />
        ))}
      </nav>

      <div className="pt-2">{children}</div>
    </div>
  )
}

/**
 * Client component is not needed here — Next.js link handles active state via
 * pathname. We use a simple anchor and rely on the page-level active class
 * pattern via CSS (the active state is handled by the parent server component
 * reading the current pathname via headers, which is complex). Instead we keep
 * it simple: all tabs are rendered as plain links. The browser URL bar shows
 * the active segment visually.
 */
function BotTab({ label, href }: { label: string; href: string }) {
  return (
    <Link
      href={href}
      className="px-3 py-2 text-sm font-medium text-muted-foreground hover:text-foreground border-b-2 border-transparent hover:border-border transition-colors"
    >
      {label}
    </Link>
  )
}
