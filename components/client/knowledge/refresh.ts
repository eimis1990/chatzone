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
