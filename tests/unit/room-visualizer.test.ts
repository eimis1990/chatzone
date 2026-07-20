import { describe, it, expect } from 'vitest'
import {
  sanitizeInstruction,
  parseImageDataUrl,
  buildVisualizePrompt,
} from '@/lib/room-visualizer'

describe('sanitizeInstruction', () => {
  it('collapses whitespace and caps length', () => {
    expect(sanitizeInstruction('  near\nthe   window  ')).toBe('near the window')
    expect(sanitizeInstruction('x'.repeat(500))).toHaveLength(200)
    expect(sanitizeInstruction(undefined)).toBe('')
  })
})

describe('parseImageDataUrl', () => {
  const px = // 1x1 transparent PNG
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg=='

  it('parses a valid png data URL', () => {
    const img = parseImageDataUrl(`data:image/png;base64,${px}`)
    expect(img).toEqual({ mimeType: 'image/png', data: px })
  })

  it('rejects non-image mimes, malformed strings and oversize payloads', () => {
    expect(parseImageDataUrl(`data:text/html;base64,${px}`)).toBeNull()
    expect(parseImageDataUrl('not-a-data-url')).toBeNull()
    const big = 'A'.repeat(11.5 * 1024 * 1024) // ~8.6MB decoded > 8MB cap
    expect(parseImageDataUrl(`data:image/jpeg;base64,${big}`)).toBeNull()
  })
})

describe('buildVisualizePrompt', () => {
  it('names every product and keeps fidelity wording', () => {
    const p = buildVisualizePrompt(['Oak Sofa', 'Linen Chair'], 'by the window')
    expect(p).toContain('Oak Sofa')
    expect(p).toContain('Linen Chair')
    expect(p).toMatch(/preserve/i)
    expect(p).toContain('by the window')
  })
})

describe('closestAspectRatio', () => {
  it('maps common photo shapes to supported ratios', async () => {
    const { closestAspectRatio } = await import('@/lib/room-visualizer')
    expect(closestAspectRatio(1536, 1152)).toBe('4:3')
    expect(closestAspectRatio(1152, 1536)).toBe('3:4')
    expect(closestAspectRatio(1920, 1080)).toBe('16:9')
    expect(closestAspectRatio(1080, 1920)).toBe('9:16')
    expect(closestAspectRatio(1000, 1000)).toBe('1:1')
    expect(closestAspectRatio(0, 100)).toBe('4:3') // degenerate input → safe default
  })
})
