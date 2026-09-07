import { describe, expect, it } from 'vitest'
import { cleanMarkdown } from '@/lib/ingestion/parse'

describe('cleanMarkdown', () => {
  it('folds the Jina preamble into a heading and drops anchor-only + share links', () => {
    const md = [
      'Title: Renginiai – Taujėnų dvaras',
      '',
      'URL Source: https://taujenudvaras.lt/events/',
      '',
      'Markdown Content:',
      '[Pereiti prie turinio](https://taujenudvaras.lt/events/#content)',
      '',
      '## rugsėjo 2026',
      '',
      `[Facebook](https://www.facebook.com/sharer.php?u=x&description=${'%C4%97'.repeat(80)})[X](https://x.com/intent/post?text=${'a'.repeat(250)})`,
      '',
      'Kaina: [100 EUR](https://taujenudvaras.lt/nuoma/)',
      '',
      '[Eiti į viršų](https://taujenudvaras.lt/events/#)',
    ].join('\n')
    const out = cleanMarkdown(md)
    expect(out.startsWith('# Renginiai – Taujėnų dvaras\n\n## rugsėjo 2026')).toBe(true)
    expect(out).not.toMatch(/Pereiti prie turinio|Eiti į viršų|%C4%97|Title:|URL Source/)
    expect(out).toContain('FacebookX')
    expect(out).toContain('[100 EUR](https://taujenudvaras.lt/nuoma/)')
  })
})
