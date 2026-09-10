import { describe, expect, it } from 'vitest'
import { voiceKnowledgeAnswer } from '@/lib/ai/voice-knowledge'

describe('voice knowledge evidence', () => {
  it('preserves delivery evidence after a long unrelated first match and in later matches', () => {
    const delivery = 'VILNIUS ketvirtadieniais. Pristatymo kaina: 5 €. Minimalus krepšelis: 30 €.'
    const coverage = 'Produktus pristatome visoje Lietuvoje, išskyrus Kuršių Neriją.'
    const chunks = [
      { source_id: 'privacy', content: 'Privatumo politika. '.repeat(250) },
      { source_id: 'delivery', content: delivery },
      { source_id: 'terms', content: 'Pirkimo sąlygos.' },
      { source_id: 'coverage', content: coverage },
      { source_id: 'pickup', content: 'Atsiėmimas Utenoje.' },
    ]
    const answer = voiceKnowledgeAnswer(chunks)
    expect(answer).toContain(delivery)
    expect(answer).toContain(coverage)
    expect(answer).toContain('Atsiėmimas Utenoje.')
  })

  it('returns no evidence when retrieval found nothing', () => {
    expect(voiceKnowledgeAnswer([])).toBe('')
  })
})
