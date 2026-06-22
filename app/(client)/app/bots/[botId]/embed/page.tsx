import { notFound } from 'next/navigation'
import { requireRole } from '@/lib/auth/guards'
import { createServerClient } from '@/lib/supabase/server'
import type { Bot } from '@/lib/types'
import { SnippetCopy } from './SnippetCopy'

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
  const snippet = `<script
  src="${appUrl}/widget.js"
  data-bot-key="${data.public_key}"
  async
></script>`

  return (
    <div className="p-6 max-w-2xl space-y-8">
      <div>
        <h2 className="text-xl font-semibold mb-1">Embed Widget</h2>
        <p className="text-sm text-muted-foreground">
          Paste this snippet before the closing{' '}
          <code className="text-xs bg-muted px-1 py-0.5 rounded">&lt;/body&gt;</code> tag of
          any page where you want the chat widget to appear.
        </p>
      </div>

      <SnippetCopy snippet={snippet} />

      <div className="space-y-4">
        <h3 className="font-medium text-sm">Installation instructions</h3>
        <ol className="list-decimal list-inside space-y-2 text-sm text-muted-foreground">
          <li>Copy the snippet above.</li>
          <li>
            Open your website&apos;s HTML source and locate the closing{' '}
            <code className="text-xs bg-muted px-1 py-0.5 rounded">&lt;/body&gt;</code> tag.
          </li>
          <li>Paste the snippet immediately before that tag.</li>
          <li>Save and deploy your changes.</li>
          <li>
            Reload your site — a chat bubble will appear in the bottom-right corner
            (default) or the position you configured.
          </li>
        </ol>
      </div>

      <div className="space-y-3">
        <h3 className="font-medium text-sm">Optional attributes</h3>
        <div className="rounded-lg border bg-muted/40 text-sm divide-y">
          <div className="grid grid-cols-[1fr_2fr] gap-4 px-4 py-3">
            <code className="text-xs font-mono">data-position</code>
            <span className="text-muted-foreground">
              <code className="text-xs bg-muted px-1 py-0.5 rounded">bottom-right</code> (default) or{' '}
              <code className="text-xs bg-muted px-1 py-0.5 rounded">bottom-left</code>
            </span>
          </div>
          <div className="grid grid-cols-[1fr_2fr] gap-4 px-4 py-3">
            <code className="text-xs font-mono">async</code>
            <span className="text-muted-foreground">Non-blocking load — recommended.</span>
          </div>
        </div>
      </div>

      <div className="rounded-lg border border-amber-200 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-800 p-4 text-sm">
        <p className="font-medium text-amber-800 dark:text-amber-200 mb-1">Domain allow-list</p>
        <p className="text-amber-700 dark:text-amber-300">
          Only origins listed in your bot&apos;s{' '}
          <strong>Allowed Domains</strong> setting (Configure tab) can load the widget.
          An empty list allows any domain — useful during development.
        </p>
      </div>
    </div>
  )
}
