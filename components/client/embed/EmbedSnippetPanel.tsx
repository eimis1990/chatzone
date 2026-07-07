import { Code2Icon, ListChecksIcon, SlidersHorizontalIcon, ShieldAlertIcon } from 'lucide-react'
import { SectionCard } from '@/components/client/SectionCard'
import { SnippetCopy } from '@/components/client/embed/SnippetCopy'

const STEPS = [
  'Copy the snippet above.',
  "Open your website's HTML source and locate the closing </body> tag.",
  'Paste the snippet immediately before that tag.',
  'Save and deploy your changes.',
  'Reload your site — a chat bubble appears in the corner you configured.',
]

/**
 * The embed-widget screen body: copyable snippet, install steps, optional
 * attributes, and the domain allow-list note. Shared by the client's Embed page
 * and the owner's done-for-you Embed tab. Callers build the snippet and wrap
 * this in their own layout.
 */
export function EmbedSnippetPanel({ snippet, botId }: { snippet: string; botId: string }) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold">Embed Widget</h2>
        <p className="text-sm text-muted-foreground">
          Paste this snippet before the closing{' '}
          <code className="rounded bg-muted px-1 py-0.5 text-xs">&lt;/body&gt;</code> tag of any page
          where you want the chat widget to appear.
        </p>
      </div>

      <SectionCard icon={Code2Icon} title="Embed code" description="Add this to every page that should show the widget.">
        <SnippetCopy snippet={snippet} botId={botId} />
      </SectionCard>

      <SectionCard icon={ListChecksIcon} title="Installation" description="Five quick steps.">
        <ol className="space-y-3">
          {STEPS.map((step, i) => (
            <li key={i} className="flex gap-3">
              <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground">
                {i + 1}
              </span>
              <span className="pt-0.5 text-sm text-foreground/80">{step}</span>
            </li>
          ))}
        </ol>
      </SectionCard>

      <SectionCard icon={SlidersHorizontalIcon} title="Optional attributes" contentClassName="p-0">
        <div className="divide-y text-sm">
          <div className="grid grid-cols-[150px_1fr] gap-4 px-5 py-3">
            <code className="font-mono text-xs text-foreground">data-position</code>
            <span className="text-muted-foreground">
              <code className="rounded bg-muted px-1 py-0.5 text-xs">bottom-right</code> (default) or{' '}
              <code className="rounded bg-muted px-1 py-0.5 text-xs">bottom-left</code>
            </span>
          </div>
          <div className="grid grid-cols-[150px_1fr] gap-4 px-5 py-3">
            <code className="font-mono text-xs text-foreground">async</code>
            <span className="text-muted-foreground">Non-blocking load — recommended.</span>
          </div>
        </div>
      </SectionCard>

      <div className="flex gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm dark:border-amber-800 dark:bg-amber-950/20">
        <ShieldAlertIcon className="mt-0.5 size-5 shrink-0 text-amber-600" aria-hidden="true" />
        <div>
          <p className="mb-1 font-medium text-amber-800 dark:text-amber-200">Domain allow-list</p>
          <p className="text-amber-700 dark:text-amber-300">
            Only origins listed in the bot&apos;s <strong>Allowed Domains</strong> setting (Configure
            tab) can load the widget. An empty list allows any domain — useful during development.
          </p>
        </div>
      </div>
    </div>
  )
}
