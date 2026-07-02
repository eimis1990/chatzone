'use client'

import { useEffect, useState } from 'react'
import { GlobeIcon, ArrowRightIcon, RefreshCwIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { createBrowserClient } from '@/lib/supabase/browser'
import { StatusBadge } from '@/components/client/knowledge/SourceList'
import type { KnowledgeSource } from '@/lib/types'
import type { CrawlState } from './OnboardingWizard'

const POLL_MS = 2000

interface StepTeachProps {
  botId: string
  crawlState: CrawlState
  onRetryCrawl: () => void
  onContinue: () => void
}

/**
 * Step 2 — live ingestion progress. The crawl request (kicked off by the
 * wizard) discovers + ingests pages server-side; here we just poll the bot's
 * knowledge_sources every couple of seconds and let the user continue as soon
 * as at least one page is ready (the rest keeps ingesting in the background).
 */
export function StepTeach({ botId, crawlState, onRetryCrawl, onContinue }: StepTeachProps) {
  const [sources, setSources] = useState<KnowledgeSource[]>([])

  useEffect(() => {
    const supabase = createBrowserClient()
    let cancelled = false

    const tick = async () => {
      const { data } = await supabase
        .from('knowledge_sources')
        .select('*')
        .eq('bot_id', botId)
        .order('created_at', { ascending: false })
        .returns<KnowledgeSource[]>()
      if (!cancelled && data) setSources(data)
    }

    void tick()
    const id = setInterval(() => void tick(), POLL_MS)
    return () => {
      cancelled = true
      clearInterval(id)
    }
  }, [botId])

  const readyCount = sources.filter((s) => s.status === 'ready').length
  const canContinue = readyCount >= 1
  const crawlFailed = crawlState.status === 'error'
  const discovering = crawlState.status === 'running' && sources.length === 0

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-lg font-semibold">Teaching your bot</h1>
        <p className="text-sm text-muted-foreground">
          We&apos;re reading your website&apos;s key pages — policies, delivery, contact, FAQ — and
          adding them to your bot&apos;s knowledge.
        </p>
      </div>

      <div className="rounded-xl border">
        <div className="flex items-center justify-between gap-3 border-b px-4 py-3">
          <div className="flex items-center gap-2 text-sm font-medium">
            <GlobeIcon className="size-4 text-muted-foreground" />
            Pages from your site
            {sources.length > 0 && (
              <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
                {readyCount}/{sources.length} ready
              </span>
            )}
          </div>
          {crawlState.status === 'running' && (
            <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <span className="size-1.5 animate-pulse rounded-full bg-primary" />
              Crawling…
            </span>
          )}
        </div>

        {discovering && (
          <div className="space-y-2 p-4">
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-9 animate-pulse rounded-lg bg-muted/60" />
            ))}
            <p className="pt-1 text-xs text-muted-foreground">
              Finding your site&apos;s pages — this takes a few seconds…
            </p>
          </div>
        )}

        {!discovering && sources.length === 0 && !crawlFailed && (
          <p className="p-4 text-sm text-muted-foreground">No pages found yet.</p>
        )}

        {sources.length > 0 && (
          <ul className="max-h-72 divide-y overflow-y-auto">
            {sources.map((s) => (
              <li key={s.id} className="flex items-center justify-between gap-3 px-4 py-2.5">
                <span className="min-w-0 truncate text-sm" title={s.name}>
                  {s.name}
                </span>
                <StatusBadge status={s.status} errorMessage={s.error_message} />
              </li>
            ))}
          </ul>
        )}

        {crawlFailed && (
          <div className="flex flex-wrap items-center justify-between gap-3 border-t bg-destructive/5 px-4 py-3">
            <p className="text-sm text-destructive">{crawlState.message}</p>
            <Button type="button" variant="outline" size="sm" onClick={onRetryCrawl}>
              <RefreshCwIcon data-icon="inline-start" />
              Retry crawl
            </Button>
          </div>
        )}
      </div>

      {crawlState.status === 'done' && (crawlState.remaining ?? 0) > 0 && (
        <p className="text-xs text-muted-foreground">
          {crawlState.remaining} more pages were found — you can crawl again later from the
          Knowledge tab.
        </p>
      )}

      <div className="flex items-center justify-end gap-3">
        {crawlFailed && sources.length === 0 && (
          <Button type="button" variant="ghost" onClick={onContinue}>
            Skip for now
          </Button>
        )}
        <Button onClick={onContinue} disabled={!canContinue} className="h-10 px-6">
          {canContinue ? 'Continue' : 'Waiting for the first page…'}
          {canContinue && <ArrowRightIcon data-icon="inline-end" />}
        </Button>
      </div>
      {canContinue && sources.some((s) => s.status !== 'ready' && s.status !== 'error') && (
        <p className="text-right text-xs text-muted-foreground">
          The remaining pages keep training in the background — no need to wait.
        </p>
      )}
    </div>
  )
}
