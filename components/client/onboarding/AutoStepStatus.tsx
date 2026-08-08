'use client'

import { useEffect, useState } from 'react'
import { createBrowserClient } from '@/lib/supabase/browser'
import type { KnowledgeSource } from '@/lib/types'

const POLL_MS = 2000

/** Live "X of Y pages ready" under the Teach scene. */
export function TeachStatus({ botId }: { botId: string }) {
  const [counts, setCounts] = useState<{ ready: number; total: number } | null>(null)

  useEffect(() => {
    const supabase = createBrowserClient()
    let cancelled = false
    const tick = async () => {
      const { data } = await supabase
        .from('knowledge_sources')
        .select('status')
        .eq('bot_id', botId)
        .returns<Pick<KnowledgeSource, 'status'>[]>()
      if (cancelled || !data) return
      setCounts({
        ready: data.filter((s) => s.status === 'ready').length,
        total: data.length,
      })
    }
    void tick()
    const id = setInterval(() => void tick(), POLL_MS)
    return () => {
      cancelled = true
      clearInterval(id)
    }
  }, [botId])

  if (!counts || counts.total === 0) return <>Finding your site&apos;s pages…</>
  return (
    <>
      {counts.ready} of {counts.total} pages ready
    </>
  )
}

const SYNC_PHASE_LABELS: Record<string, string> = {
  fetching: 'Fetching products from your store…',
  tagging: 'Understanding your products…',
  embedding: 'Indexing for search…',
  done: 'Catalog indexed',
  error: 'Sync ran into a problem',
}

/** Live catalog-sync phase under the Store scene. */
export function StoreStatus({ botId }: { botId: string }) {
  const [progress, setProgress] = useState<{ phase: string; processed: number; total: number } | null>(null)

  useEffect(() => {
    const supabase = createBrowserClient()
    let cancelled = false
    const tick = async () => {
      const { data } = await supabase
        .from('catalog_sync_status')
        .select('phase, processed, total')
        .eq('bot_id', botId)
        .maybeSingle<{ phase: string; processed: number; total: number }>()
      if (!cancelled && data) setProgress(data)
    }
    void tick()
    const id = setInterval(() => void tick(), 1500)
    return () => {
      cancelled = true
      clearInterval(id)
    }
  }, [botId])

  if (!progress) return <>Connecting to your store…</>
  const label = SYNC_PHASE_LABELS[progress.phase] ?? 'Syncing…'
  const detail = progress.total > 0 ? ` ${progress.processed}/${progress.total}` : ''
  return (
    <>
      {label}
      {detail}
    </>
  )
}
