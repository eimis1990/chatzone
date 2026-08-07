'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useCallback, useEffect, useMemo, useState, useTransition } from 'react'
import {
  ArrowRightIcon,
  CircleIcon,
  FilePlus2Icon,
  LightbulbIcon,
  PenLineIcon,
  SearchIcon,
  Settings2Icon,
  ShieldCheckIcon,
  RadioTowerIcon,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { buttonVariants } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty'
import { Input } from '@/components/ui/input'
import { Spinner } from '@/components/ui/spinner'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ContentNextActions } from '@/components/owner/content/ContentNextActions'
import { ContentStudioHeader } from '@/components/owner/content/ContentStudioChrome'
import { CONTENT_STATUS_LABELS } from '@/lib/content-studio/lifecycle'
import type { ContentActiveRun, ContentGenerationOperation, ContentItem, ContentPublicationTarget, ContentStatus } from '@/lib/content-studio/types'
import { createBrowserClient } from '@/lib/supabase/browser'
import { cn } from '@/lib/utils'

const GROUPS: Array<{
  title: string
  statuses: ContentStatus[]
  description: string
  icon: typeof LightbulbIcon
}> = [
  { title: 'Ideas', statuses: ['idea'], description: 'Reader needs worth exploring', icon: LightbulbIcon },
  { title: 'Writing', statuses: ['researching', 'brief', 'drafting'], description: 'Research, draft, and refine', icon: PenLineIcon },
  { title: 'Review & publish', statuses: ['review', 'ready', 'pr_open', 'failed'], description: 'Human review before safe handoff', icon: ShieldCheckIcon },
]

function formatUpdated(value: string): string {
  return new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric' }).format(new Date(value))
}

const OPERATION_LABELS: Record<ContentGenerationOperation, string> = {
  research: 'Researching sources',
  brief: 'Building the brief',
  draft: 'Researching & writing',
  image: 'Creating the cover',
  publish: 'Preparing the draft PR',
}
const EMPTY_ACTIVE_RUNS: ContentActiveRun[] = []

function ItemCard({ item, activity }: { item: ContentItem; activity?: ContentActiveRun }) {
  return (
    <Card size="sm" className={cn(
      'group min-w-0 gap-0 py-0 transition-[box-shadow,transform,background-color] hover:-translate-y-0.5 hover:ring-primary/35',
      activity && 'bg-primary/[0.035] ring-1 ring-primary/25',
    )}>
      <Link href={`/owner/content/${item.id}`} className="grid gap-4 p-4 outline-none focus-visible:ring-3 focus-visible:ring-ring/50" aria-label={`Open ${item.title || 'untitled article'}`}>
        <CardHeader className="grid grid-cols-[1fr_auto] gap-3 p-0">
          <CardTitle className="line-clamp-2 text-[0.95rem] leading-snug">{item.title || 'Untitled article'}</CardTitle>
          <ArrowRightIcon className="mt-0.5 size-4 text-muted-foreground transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
        </CardHeader>
        <CardContent className="grid gap-3 p-0">
          {activity ? (
            <div className="flex items-center gap-2 text-xs font-medium text-primary" aria-live="polite">
              <Spinner className="size-3.5" />
              <span>{OPERATION_LABELS[activity.operation]}</span>
            </div>
          ) : <div className="flex items-center gap-2 text-xs">
            <CircleIcon className={cn(
              'size-2 fill-current text-muted-foreground',
              ['drafting', 'review', 'ready', 'pr_open'].includes(item.status) && 'text-primary',
              item.status === 'failed' && 'text-destructive',
            )} aria-hidden="true" />
            <span className={cn('text-muted-foreground', item.status === 'failed' && 'text-destructive')}>{CONTENT_STATUS_LABELS[item.status]}</span>
          </div>}
          <dl className="grid grid-cols-2 gap-3 border-t pt-3 text-xs">
            <div className="min-w-0">
              <dt className="text-muted-foreground">Target query</dt>
              <dd className="mt-1 truncate font-medium">{item.target_query || 'Not set'}</dd>
            </div>
            <div className="min-w-0">
              <dt className="text-muted-foreground">Topic</dt>
              <dd className="mt-1 truncate font-medium">{item.topic || 'Not set'}</dd>
            </div>
          </dl>
          <p className="text-right text-xs text-muted-foreground">Updated {formatUpdated(item.updated_at)}</p>
        </CardContent>
      </Link>
    </Card>
  )
}

function EmptyState({ filtered, published = false }: { filtered: boolean; published?: boolean }) {
  return (
    <Empty className="min-h-64 border bg-card/45">
      <EmptyHeader>
        <EmptyMedia variant="icon"><FilePlus2Icon /></EmptyMedia>
        <EmptyTitle>{filtered ? 'No articles match this search' : published ? 'No published Studio articles yet' : 'Start your first article'}</EmptyTitle>
        <EmptyDescription>
          {filtered ? 'Try a different title, query, or topic.' : published ? 'Merged and live Content Studio articles will appear here.' : 'Capture the reader need first, then develop the article in one workspace.'}
        </EmptyDescription>
      </EmptyHeader>
    </Empty>
  )
}

export function ContentPipeline({
  initialItems,
  initialActiveRuns = EMPTY_ACTIVE_RUNS,
  proactiveSuggestions,
  targets,
}: {
  initialItems: ContentItem[]
  initialActiveRuns?: ContentActiveRun[]
  proactiveSuggestions: boolean
  targets: ContentPublicationTarget[]
}) {
  const router = useRouter()
  const [items, setItems] = useState(initialItems)
  const [activeRuns, setActiveRuns] = useState(initialActiveRuns)
  const [liveStatus, setLiveStatus] = useState<'connecting' | 'live' | 'fallback'>('connecting')
  const [refreshPending, startRefresh] = useTransition()
  const [query, setQuery] = useState('')

  const refresh = useCallback(() => {
    startRefresh(() => router.refresh())
  }, [router])

  useEffect(() => {
    const supabase = createBrowserClient()
    const channel = supabase
      .channel('owner-content-studio-pipeline')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'content_items' }, (payload) => {
        if (payload.eventType === 'DELETE') {
          const removed = payload.old as Pick<ContentItem, 'id'>
          setItems((current) => current.filter((item) => item.id !== removed.id))
          return
        }
        const changed = payload.new as ContentItem
        setItems((current) => [changed, ...current.filter((item) => item.id !== changed.id)]
          .sort((a, b) => Date.parse(b.updated_at) - Date.parse(a.updated_at)))
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'content_generation_runs' }, (payload) => {
        if (payload.eventType === 'DELETE') {
          const removed = payload.old as Pick<ContentActiveRun, 'id'>
          setActiveRuns((current) => current.filter((run) => run.id !== removed.id))
          return
        }
        const changed = payload.new as ContentActiveRun & { status: string }
        if (changed.status === 'queued' || changed.status === 'in_progress') {
          setActiveRuns((current) => [changed as ContentActiveRun, ...current.filter((run) => run.id !== changed.id)])
        } else {
          setActiveRuns((current) => current.filter((run) => run.id !== changed.id))
          refresh()
        }
      })
      .subscribe((status) => setLiveStatus(status === 'SUBSCRIBED' ? 'live' : status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' ? 'fallback' : 'connecting'))

    const poll = window.setInterval(refresh, 8_000)
    const handleFocus = () => refresh()
    window.addEventListener('focus', handleFocus)
    return () => {
      window.clearInterval(poll)
      window.removeEventListener('focus', handleFocus)
      void supabase.removeChannel(channel)
    }
  }, [refresh])

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase()
    if (!needle) return items
    return items.filter((item) =>
      [item.title, item.target_query, item.topic, item.slug].some((value) => value.toLowerCase().includes(needle)),
    )
  }, [items, query])
  const activityByItem = useMemo(() => new Map(activeRuns.map((run) => [run.content_item_id, run])), [activeRuns])
  const active = visible.filter((item) => !['published', 'archived'].includes(item.status))
  const published = visible.filter((item) => item.status === 'published')

  return (
    <div className="mx-auto flex h-full max-w-[96rem] flex-col gap-5">
      <ContentStudioHeader
        title="Content Studio"
        badge="Loqara blog"
        description="Plan, create, review, and publish useful content through one safe editorial workflow."
        actions={(
          <>
            <Link href="/owner/content/settings" className={cn(buttonVariants({ variant: 'outline', size: 'lg' }), 'min-h-11')}>
              <Settings2Icon data-icon="inline-start" /> Settings
            </Link>
            <Link href="/owner/content/new" className={cn(buttonVariants({ size: 'lg' }), 'min-h-11')}>
              <FilePlus2Icon data-icon="inline-start" /> New article
            </Link>
          </>
        )}
      />

      {proactiveSuggestions && <ContentNextActions items={items} targets={targets} />}

      <Tabs defaultValue="pipeline" className="flex min-h-0 flex-1 flex-col gap-4">
        <div className="flex flex-col justify-between gap-3 border-b pb-3 sm:flex-row sm:items-center">
          <TabsList variant="line">
            <TabsTrigger value="pipeline">Pipeline <Badge variant="secondary">{active.length}</Badge></TabsTrigger>
            <TabsTrigger value="published">Published <Badge variant="secondary">{published.length}</Badge></TabsTrigger>
          </TabsList>
          <div className="flex w-full flex-col gap-2 sm:max-w-xl sm:flex-row sm:items-center sm:justify-end">
            <Badge variant="outline" className="h-8 w-fit gap-1.5" aria-live="polite">
              {refreshPending || liveStatus === 'connecting' ? <Spinner className="size-3" /> : <RadioTowerIcon className="size-3" aria-hidden="true" />}
              {refreshPending ? 'Updating' : liveStatus === 'live' ? 'Live updates' : liveStatus === 'fallback' ? 'Auto-refreshing' : 'Connecting'}
            </Badge>
          <label className="relative block w-full sm:max-w-sm">
            <span className="sr-only">Search articles</span>
            <SearchIcon className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
            <Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search articles…" className="min-h-10 pl-9" />
          </label>
          </div>
        </div>

        <TabsContent value="pipeline" className="min-h-0 flex-1">
          {active.length === 0 ? <EmptyState filtered={Boolean(query)} /> : (
            <div className="grid gap-6 xl:grid-cols-3 xl:gap-0">
              {GROUPS.map((group, index) => {
                const items = active.filter((item) => group.statuses.includes(item.status))
                const Icon = group.icon
                return (
                  <section key={group.title} className={cn('min-w-0 xl:px-5', index === 0 && 'xl:pl-0', index > 0 && 'xl:border-l')} aria-labelledby={`content-group-${index}`}>
                    <header className="mb-4 flex items-start justify-between gap-3">
                      <div className="flex min-w-0 items-start gap-3">
                        <Icon className="mt-0.5 size-5 shrink-0 text-primary" aria-hidden="true" />
                        <div className="grid gap-0.5">
                          <h2 id={`content-group-${index}`} className="font-semibold">{group.title}</h2>
                          <p className="text-xs text-muted-foreground">{group.description}</p>
                        </div>
                      </div>
                      <Badge variant="secondary">{items.length}</Badge>
                    </header>
                    <div className="grid gap-3">
                      {items.length ? items.map((item) => <ItemCard key={item.id} item={item} activity={activityByItem.get(item.id)} />) : (
                        <Empty className="min-h-36 border bg-card/30 p-4">
                          <EmptyHeader><EmptyDescription>Nothing here yet</EmptyDescription></EmptyHeader>
                        </Empty>
                      )}
                    </div>
                  </section>
                )
              })}
            </div>
          )}
          <div className="mt-8 flex flex-col justify-between gap-2 rounded-lg border px-4 py-3 text-xs text-muted-foreground sm:flex-row sm:items-center">
            <p className="flex items-center gap-2"><ShieldCheckIcon className="size-4 text-foreground" aria-hidden="true" /><strong className="font-medium text-foreground">Safe by default.</strong> Content stays private until review and approval.</p>
            <p>Final website publishing happens through a GitHub draft PR.</p>
          </div>
        </TabsContent>

        <TabsContent value="published" className="min-h-0 flex-1">
          {published.length === 0 ? <EmptyState filtered={Boolean(query)} published /> : (
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {published.map((item) => <ItemCard key={item.id} item={item} activity={activityByItem.get(item.id)} />)}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
