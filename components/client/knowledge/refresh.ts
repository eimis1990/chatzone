import type { RefreshOutcome, RefreshResolve } from '@/lib/ingestion/pipeline'

/**
 * Re-fetch one URL source from the live site (or settle a flagged manual edit
 * with `resolve`). A website sync calls this once per page, so a 429 from the
 * rate limiter just waits and retries instead of failing the sync.
 */
export async function refreshSource(sourceId: string, resolve?: RefreshResolve): Promise<RefreshOutcome> {
  for (let attempt = 0; attempt < 5; attempt++) {
    const res = await fetch('/api/ingest', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sourceId, refresh: true, resolve }),
    })
    if (res.status === 429) {
      await new Promise((r) => setTimeout(r, 2000 * (attempt + 1)))
      continue
    }
    if (!res.ok) return 'error'
    const data = (await res.json().catch(() => ({}))) as { outcome?: RefreshOutcome }
    return data.outcome ?? 'error'
  }
  return 'error'
}

/** Whether a URL source's manual edit is flagged because the live page changed. */
export function hasLiveConflict(metadata: Record<string, unknown> | null | undefined): boolean {
  return metadata?.liveConflict === true
}

/**
 * Rebuild the answer summaries after ONE source changed (a full website sync
 * does its own rebuild). Summaries are synthesized from the other sources and
 * outrank them in search, so a change that isn't folded in leaves the bot
 * quoting the old fact: HomeByNB added Sunday hours to /kontaktai and the
 * Contact summary kept saying Monday–Saturday (2026-11-12).
 * ponytail: fire-and-forget, and the route allows ~2 rebuilds a minute per
 * user — a third quick edit is skipped ("Rebuild summaries" still works).
 * Debounce/queue here if clients start editing in bursts.
 */
export function rebuildSummariesInBackground(botId: string): void {
  void fetch('/api/knowledge/summarize', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ botId }),
    keepalive: true, // survives closing the drawer / leaving the page
  }).catch(() => null)
}
