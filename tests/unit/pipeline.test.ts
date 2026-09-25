import { describe, it, expect, vi } from 'vitest'
import { ingestSource, refreshUrlSource, type IngestRepo } from '@/lib/ingestion/pipeline'
import type { KnowledgeSource } from '@/lib/types'

function makeRepo(source: KnowledgeSource): {
  repo: IngestRepo
  statuses: Array<{ status: string; patch?: Record<string, unknown> }>
  inserted: number[]
} {
  const statuses: Array<{ status: string; patch?: Record<string, unknown> }> = []
  const inserted: number[] = []
  const repo: IngestRepo = {
    loadSource: vi.fn(async () => source),
    setStatus: vi.fn(async (_id, status, patch) => {
      statuses.push({ status, patch })
    }),
    downloadFile: vi.fn(async () => Buffer.from('file bytes')),
    replaceChunks: vi.fn(async (_bot, _src, rows) => {
      inserted.push(rows.length)
    }),
  }
  return { repo, statuses, inserted }
}

const base: KnowledgeSource = {
  id: 's1',
  bot_id: 'b1',
  type: 'text',
  name: 'doc',
  status: 'pending',
  error_message: null,
  metadata: { content: 'Hello world. This is a small document about cats.' },
  created_at: '',
  updated_at: '',
}

const deps = {
  embed: async (texts: string[]) => texts.map(() => new Array(1536).fill(0)),
}

describe('ingestSource', () => {
  it('moves pending → processing → ready and inserts chunks for a text source', async () => {
    const { repo, statuses, inserted } = makeRepo(base)
    await ingestSource('s1', { repo, ...deps })
    expect(statuses.map((s) => s.status)).toEqual(['processing', 'ready'])
    expect(inserted[0]).toBeGreaterThan(0)
    expect(statuses[1].patch).toMatchObject({ error_message: null })
  })

  it('formats Q&A pairs into text', async () => {
    const qa: KnowledgeSource = {
      ...base,
      type: 'qa',
      metadata: { pairs: [{ question: 'Are you open?', answer: 'Yes, 9 to 5.' }] },
    }
    const { repo, statuses } = makeRepo(qa)
    const embedSpy = vi.fn(async (texts: string[]) => texts.map(() => new Array(1536).fill(0)))
    await ingestSource('s1', { repo, embed: embedSpy })
    expect(statuses.map((s) => s.status)).toEqual(['processing', 'ready'])
    const embedded = embedSpy.mock.calls[0][0].join(' ')
    expect(embedded).toContain('Are you open?')
    expect(embedded).toContain('Yes, 9 to 5.')
  })

  it('sets status error with a message when parsing fails', async () => {
    const bad: KnowledgeSource = { ...base, type: 'url', metadata: { url: 'https://x.test' } }
    const { repo, statuses } = makeRepo(bad)
    const failingParseUrl = async () => {
      throw new Error('boom')
    }
    await ingestSource('s1', { repo, ...deps, parseUrl: failingParseUrl })
    expect(statuses[0].status).toBe('processing')
    expect(statuses[1].status).toBe('error')
    expect(statuses[1].patch?.error_message).toContain('boom')
  })
})

describe('refreshUrlSource', () => {
  const page = 'Kainos. Plieno čerpių stogas nuo 28 €/m². Šiferis nuo 35 €/m².'
  const url = (metadata: Record<string, unknown>, status: KnowledgeSource['status'] = 'ready'): KnowledgeSource => ({
    ...base,
    type: 'url',
    status,
    metadata: { url: 'https://acme.com/kainos', ...metadata },
  })
  const parse = (text: string) => ({ parseUrl: vi.fn(async () => text) })
  const lastMeta = (statuses: Array<{ patch?: Record<string, unknown> }>) =>
    statuses.at(-1)?.patch?.metadata as Record<string, unknown> | undefined

  it('indexes a changed page and records its hash; the next run is a no-op', async () => {
    const first = makeRepo(url({ liveHash: 'old' }))
    expect(await refreshUrlSource('s1', { repo: first.repo, ...deps, ...parse(page) })).toBe('updated')
    expect(first.inserted[0]).toBeGreaterThan(0)
    const liveHash = lastMeta(first.statuses)?.liveHash
    expect(liveHash).toMatch(/^[0-9a-f]{64}$/)

    const second = makeRepo(url({ liveHash }))
    expect(await refreshUrlSource('s1', { repo: second.repo, ...deps, ...parse(page) })).toBe('unchanged')
    expect(second.inserted).toEqual([]) // nothing re-embedded
  })

  it('flags a manually-edited page whose live content changed, without touching its chunks', async () => {
    const { repo, statuses, inserted } = makeRepo(url({ liveHash: 'old', contentOverride: 'my edit' }))
    expect(await refreshUrlSource('s1', { repo, ...deps, ...parse(page) })).toBe('conflict')
    expect(inserted).toEqual([])
    expect(lastMeta(statuses)).toMatchObject({ contentOverride: 'my edit', liveConflict: true, liveHash: 'old' })
  })

  it("'keep' keeps the edit and stops flagging; 'live' drops the edit and indexes the page", async () => {
    const kept = makeRepo(url({ contentOverride: 'my edit', liveConflict: true }))
    expect(await refreshUrlSource('s1', { repo: kept.repo, ...deps, ...parse(page) }, 'keep')).toBe('unchanged')
    expect(kept.inserted).toEqual([])
    expect(lastMeta(kept.statuses)).toMatchObject({ contentOverride: 'my edit' })
    expect(lastMeta(kept.statuses)?.liveConflict).toBeUndefined()

    const live = makeRepo(url({ contentOverride: 'my edit', liveConflict: true }))
    expect(await refreshUrlSource('s1', { repo: live.repo, ...deps, ...parse(page) }, 'live')).toBe('updated')
    expect(live.inserted[0]).toBeGreaterThan(0)
    expect(lastMeta(live.statuses)?.contentOverride).toBeUndefined()
    expect(lastMeta(live.statuses)?.liveConflict).toBeUndefined()
  })

  it('a failed fetch marks the source error but keeps its chunks', async () => {
    const { repo, statuses, inserted } = makeRepo(url({ liveHash: 'old' }))
    const parseUrl = vi.fn(async () => {
      throw new Error('HTTP 404')
    })
    expect(await refreshUrlSource('s1', { repo, ...deps, parseUrl })).toBe('error')
    expect(inserted).toEqual([])
    expect(statuses.at(-1)).toMatchObject({ status: 'error', patch: { error_message: 'HTTP 404' } })
  })
})
