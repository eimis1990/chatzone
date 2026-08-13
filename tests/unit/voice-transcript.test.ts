import { describe, expect, it } from 'vitest'
import {
  normalizeVoiceSearchQuery,
  normalizeVoiceTranscript,
  stripAudioTags,
} from '@/lib/voice/transcript'

describe('stripAudioTags', () => {
  it('removes v3 audio tags but keeps the sentence intact', () => {
    expect(
      stripAudioTags('[Warmly] Tai padėtų man pasiūlyti dovanas. [Enthusiastically] Pažiūrėkite!'),
    ).toBe('Tai padėtų man pasiūlyti dovanas. Pažiūrėkite!')
    expect(stripAudioTags('Štai variantai [laughs] jums.')).toBe('Štai variantai jums.')
  })

  it('leaves markdown links and non-tag brackets alone', () => {
    expect(stripAudioTags('See [our store](https://x.lt) for more')).toBe(
      'See [our store](https://x.lt) for more',
    )
    expect(stripAudioTags('Kaina [2024-01] buvo kita')).toBe('Kaina [2024-01] buvo kita')
  })
})

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
