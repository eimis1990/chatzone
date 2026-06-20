import { describe, it, expect, vi } from 'vitest'
import { ingestSource, type IngestRepo } from '@/lib/ingestion/pipeline'
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
