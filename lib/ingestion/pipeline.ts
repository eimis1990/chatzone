import { createHash } from 'node:crypto'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { KnowledgeSource, SourceStatus } from '@/lib/types'
import { chunkText } from '@/lib/ingestion/chunk'
import { parseFile, parseUrl } from '@/lib/ingestion/parse'
import { embed } from '@/lib/ai/embeddings'

const STORAGE_BUCKET = 'knowledge'

/** Storage-agnostic data access for ingestion, so the pipeline is unit-testable. */
export interface IngestRepo {
  loadSource(id: string): Promise<KnowledgeSource | null>
  setStatus(id: string, status: SourceStatus, patch?: Record<string, unknown>): Promise<void>
  downloadFile(path: string): Promise<Buffer>
  replaceChunks(
    botId: string,
    sourceId: string,
    rows: Array<{ content: string; embedding: number[]; chunk_index: number; token_count: number }>,
  ): Promise<void>
}

export interface IngestDeps {
  repo: IngestRepo
  parseFile: typeof parseFile
  parseUrl: typeof parseUrl
  embed: typeof embed
  chunk: typeof chunkText
}

/** Resolve the raw text for a source according to its type. */
async function sourceToText(source: KnowledgeSource, deps: IngestDeps): Promise<string> {
  const meta = source.metadata as Record<string, unknown>
  // A manual edit (from the source drawer) overrides the fetched/parsed content
  // for ANY type, and persists across re-ingests so "retry" won't clobber it.
  const override = meta.contentOverride
  if (typeof override === 'string' && override.trim()) return override
  switch (source.type) {
    case 'text':
      return String(meta.content ?? '')
    case 'qa': {
      const pairs = (meta.pairs as Array<{ question: string; answer: string }>) ?? []
      return pairs.map((p) => `Q: ${p.question}\nA: ${p.answer}`).join('\n\n')
    }
    case 'url':
      return deps.parseUrl(String(meta.url))
    case 'file': {
      const buffer = await deps.repo.downloadFile(String(meta.path))
      return deps.parseFile(buffer, String(meta.mime))
    }
    default:
      throw new Error(`Unknown source type: ${source.type}`)
  }
}

function withDefaults(deps: Partial<IngestDeps> & Pick<IngestDeps, 'repo'>): IngestDeps {
  return {
    repo: deps.repo,
    parseFile: deps.parseFile ?? parseFile,
    parseUrl: deps.parseUrl ?? parseUrl,
    embed: deps.embed ?? embed,
    chunk: deps.chunk ?? chunkText,
  }
}

const hashText = (text: string): string => createHash('sha256').update(text).digest('hex')

const hasOverride = (meta: Record<string, unknown>): boolean =>
  typeof meta.contentOverride === 'string' && meta.contentOverride.trim() !== ''

/** chunk → embed → store `text`, then mark ready (writing `metadata` too, when given). */
async function indexText(
  source: KnowledgeSource,
  text: string,
  full: IngestDeps,
  metadata?: Record<string, unknown>,
): Promise<void> {
  const chunks = full.chunk(text)
  const embeddings = chunks.length > 0 ? await full.embed(chunks.map((c) => c.content)) : []
  const rows = chunks.map((c, i) => ({
    content: c.content,
    embedding: embeddings[i],
    chunk_index: c.index,
    token_count: Math.ceil(c.content.length / 4),
  }))
  await full.repo.replaceChunks(source.bot_id, source.id, rows)
  await full.repo.setStatus(source.id, 'ready', { error_message: null, ...(metadata && { metadata }) })
}

/**
 * Ingests a single knowledge source: parse → chunk → embed → store, updating
 * status as it goes. Never throws — failures are recorded on the source row.
 */
export async function ingestSource(
  sourceId: string,
  deps: Partial<IngestDeps> & Pick<IngestDeps, 'repo'>,
): Promise<void> {
  const full = withDefaults(deps)
  const source = await full.repo.loadSource(sourceId)
  if (!source) return

  await full.repo.setStatus(sourceId, 'processing')
  try {
    const text = await sourceToText(source, full)
    const meta = source.metadata as Record<string, unknown>
    // A live page fetch records its hash, so a later sync can skip unchanged pages.
    const fetchedLive = source.type === 'url' && !hasOverride(meta)
    await indexText(source, text, full, fetchedLive ? { ...meta, liveHash: hashText(text) } : undefined)
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    await full.repo.setStatus(sourceId, 'error', { error_message: message })
  }
}

export type RefreshOutcome = 'updated' | 'unchanged' | 'conflict' | 'error'
export type RefreshResolve = 'keep' | 'live'

/**
 * Re-fetches a URL source from the live site (knowledge "Sync website" and the
 * per-source "Refresh from website").
 * - Page unchanged since the last fetch → nothing is re-embedded.
 * - A manual edit (`contentOverride`) is never silently discarded or silently
 *   kept: when the live page changed, the source is flagged `liveConflict` and
 *   left as is until the owner re-runs with `resolve` — `'keep'` (keep the edit,
 *   stop flagging this page version) or `'live'` (drop the edit, index the page).
 *   An edit with no recorded `liveHash` (edited before hashes existed) counts as
 *   changed, since we can't tell.
 * Never throws; a failed fetch keeps the old chunks and marks the source error.
 */
export async function refreshUrlSource(
  sourceId: string,
  deps: Partial<IngestDeps> & Pick<IngestDeps, 'repo'>,
  resolve?: RefreshResolve,
): Promise<RefreshOutcome> {
  const full = withDefaults(deps)
  const source = await full.repo.loadSource(sourceId)
  if (!source || source.type !== 'url') return 'error'
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { contentOverride, liveConflict, ...meta } = source.metadata as Record<string, unknown>
  const edited = hasOverride(source.metadata as Record<string, unknown>)

  await full.repo.setStatus(sourceId, 'processing')
  try {
    const text = await full.parseUrl(String(meta.url))
    const liveHash = hashText(text)

    if (edited && resolve !== 'live') {
      const changed = resolve !== 'keep' && liveHash !== meta.liveHash
      await full.repo.setStatus(sourceId, 'ready', {
        error_message: null,
        metadata: changed
          ? { ...meta, contentOverride, liveConflict: true }
          : { ...meta, contentOverride, liveHash },
      })
      return changed ? 'conflict' : 'unchanged'
    }

    if (!edited && source.status === 'ready' && liveHash === meta.liveHash) {
      await full.repo.setStatus(sourceId, 'ready', { error_message: null })
      return 'unchanged'
    }

    await indexText(source, text, full, { ...meta, liveHash })
    return 'updated'
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    await full.repo.setStatus(sourceId, 'error', { error_message: message })
    return 'error'
  }
}

/** Build a repo backed by a service-role Supabase client. */
export function makeServiceRepo(db: SupabaseClient): IngestRepo {
  return {
    async loadSource(id) {
      const { data } = await db.from('knowledge_sources').select('*').eq('id', id).single()
      return (data as KnowledgeSource) ?? null
    },
    async setStatus(id, status, patch = {}) {
      const { error } = await db.from('knowledge_sources').update({ status, ...patch }).eq('id', id)
      if (error) throw new Error(`setStatus failed: ${error.message}`)
    },
    async downloadFile(path) {
      const { data, error } = await db.storage.from(STORAGE_BUCKET).download(path)
      if (error || !data) throw new Error(`Storage download failed: ${error?.message}`)
      return Buffer.from(await data.arrayBuffer())
    },
    async replaceChunks(botId, sourceId, rows) {
      await db.from('document_chunks').delete().eq('source_id', sourceId)
      if (rows.length === 0) return
      const { error } = await db
        .from('document_chunks')
        .insert(rows.map((r) => ({ bot_id: botId, source_id: sourceId, ...r })))
      if (error) throw new Error(`chunk insert failed: ${error.message}`)
    },
  }
}
