import { describe, expect, it } from 'vitest'
import { getArticleQualityChecks } from '@/lib/content-studio/quality'

const quickAnswer = 'A useful AI shopping assistant should answer from current store data, show verifiable product details, and admit when information is missing. Start with one defined customer task, connect trustworthy catalogue and policy sources, test difficult questions, and require human review before treating generated recommendations as dependable operational guidance for a live shop.'

function strongMarkdown() {
  const sections = Array.from({ length: 5 }, (_, index) => `## How does step ${index + 1} work?\n\n${'Practical evidence and implementation guidance. '.repeat(45)}`).join('\n\n')
  return `Opening context.\n\n<blockquote class="quick-answer">${quickAnswer}</blockquote>\n\n${sections}\n\nSee [guide one](/blog/guide-one) and [guide two](/blog/guide-two). Sources: [OpenAI](https://openai.com/research/example), [Google](https://developers.google.com/example), and [W3C](https://www.w3.org/example).\n\n## Frequently asked questions\n\n${Array.from({ length: 6 }, (_, index) => `### Question ${index + 1}?\n\nA complete self-contained answer.`).join('\n\n')}`
}

describe('Content Studio article quality checks', () => {
  it('passes a complete sourced article package', () => {
    const checks = getArticleQualityChecks({
      title: 'How AI shopping assistants help online stores',
      description: 'Learn how AI shopping assistants use store data, where they help customers, and which safeguards an online retailer should put in place.',
      markdown: strongMarkdown(),
      relatedSlugs: ['guide-one', 'guide-two'],
      coverImageAlt: 'An online shop owner reviewing an AI-assisted product recommendation workflow',
      coverImagePrompt: 'Create a text-free editorial illustration of an online shop owner reviewing product recommendations.',
      researchSourceUrls: [
        'https://openai.com/research/example',
        'https://developers.google.com/example',
        'https://www.w3.org/example',
      ],
    })

    expect(checks.every((check) => check.passed)).toBe(true)
  })

  it('flags missing citations, placeholders, and an undersized quick answer', () => {
    const checks = getArticleQualityChecks({
      title: 'Short',
      description: 'Too short',
      markdown: '<blockquote class="quick-answer">Not enough.</blockquote>\n\n## Draft\n\nTODO add evidence.',
      relatedSlugs: [],
      coverImageAlt: '',
      coverImagePrompt: '',
      researchSourceUrls: [],
    })

    expect(checks.find((check) => check.id === 'citations')?.passed).toBe(false)
    expect(checks.find((check) => check.id === 'placeholders')?.passed).toBe(false)
    expect(checks.find((check) => check.id === 'quick-answer')?.passed).toBe(false)
  })

  it('rejects an external citation that is not in the saved research provenance', () => {
    const checks = getArticleQualityChecks({
      title: 'How AI shopping assistants help online stores',
      description: 'Learn how AI shopping assistants use store data, where they help customers, and which safeguards an online retailer should put in place.',
      markdown: strongMarkdown(),
      relatedSlugs: ['guide-one', 'guide-two'],
      coverImageAlt: 'An online shop owner reviewing an AI-assisted product recommendation workflow',
      coverImagePrompt: 'Create a text-free editorial illustration of an online shop owner reviewing product recommendations.',
      researchSourceUrls: [
        'https://openai.com/research/example',
        'https://developers.google.com/example',
        'https://example.com/not-the-cited-source',
      ],
    })

    expect(checks.find((check) => check.id === 'citations')).toMatchObject({
      passed: false,
      detail: expect.stringContaining('1 unverified'),
    })
  })
})
