import { describe, it, expect } from 'vitest'
import { chunkText, estimateTokens } from '@/lib/ingestion/chunk'

const sentences = (n: number) =>
  Array.from({ length: n }, (_, i) => `This is sentence number ${i} of the document.`).join(' ')

describe('chunkText', () => {
  it('returns no chunks for empty or whitespace input', () => {
    expect(chunkText('')).toEqual([])
    expect(chunkText('   \n  ')).toEqual([])
  })

  it('returns a single chunk for short text', () => {
    const out = chunkText('Hello world. This is short.', { maxTokens: 600 })
    expect(out).toHaveLength(1)
    expect(out[0].index).toBe(0)
    expect(out[0].content).toContain('Hello world')
  })

  it('splits long text into multiple sequentially-indexed chunks', () => {
    const out = chunkText(sentences(60), { maxTokens: 40, overlap: 0 })
    expect(out.length).toBeGreaterThan(1)
    out.forEach((c, i) => expect(c.index).toBe(i))
  })

  it('keeps each chunk within the token budget', () => {
    const out = chunkText(sentences(60), { maxTokens: 40, overlap: 0 })
    out.forEach((c) => expect(estimateTokens(c.content)).toBeLessThanOrEqual(45))
  })

  it('overlaps consecutive chunks when overlap > 0', () => {
    const out = chunkText(sentences(60), { maxTokens: 40, overlap: 12 })
    expect(out.length).toBeGreaterThan(1)
    const firstSentenceOfSecond = out[1].content.split('.')[0]
    expect(out[0].content).toContain(firstSentenceOfSecond)
  })

  it('does not overlap when overlap is 0', () => {
    const out = chunkText(sentences(60), { maxTokens: 40, overlap: 0 })
    const firstSentenceOfSecond = out[1].content.split('.')[0]
    expect(out[0].content).not.toContain(firstSentenceOfSecond)
  })
})

describe('estimateTokens', () => {
  it('approximates tokens from character length', () => {
    expect(estimateTokens('')).toBe(0)
    expect(estimateTokens('a'.repeat(40))).toBe(10)
  })
})
