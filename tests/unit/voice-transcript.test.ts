import { describe, expect, it } from 'vitest'
import { normalizeVoiceSearchQuery, normalizeVoiceTranscript } from '@/lib/voice/transcript'

describe('voice transcript number normalization', () => {
  it('renders spoken Lithuanian furniture dimensions as digits', () => {
    expect(
      normalizeVoiceTranscript(
        'Ieškau šviesios lovos, du metrai ant metro aštuoniasdešimt.',
        'lt',
      ),
    ).toBe('Ieškau šviesios lovos, 2 m × 1,8 m.')
  })

  it('canonicalizes both Lithuanian dimensions to centimetres for catalog search', () => {
    expect(
      normalizeVoiceSearchQuery('lova du metrai ant metro aštuoniasdešimt', 'lt'),
    ).toBe('lova 200 cm × 180 cm')
  })

  it('normalizes English decimal dimensions', () => {
    expect(normalizeVoiceTranscript('a bed two meters by one point eight meters', 'en')).toBe(
      'a bed 2 m × 1.8 m',
    )
    expect(normalizeVoiceSearchQuery('bed two meters by one point eight meters', 'en')).toBe(
      'bed 200 cm × 180 cm',
    )
  })

  it('does not rewrite non-numeric conversational text', () => {
    expect(normalizeVoiceTranscript('Ieškau šviesios lovos', 'lt')).toBe('Ieškau šviesios lovos')
  })
})
