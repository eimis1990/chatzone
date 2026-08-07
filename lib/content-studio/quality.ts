import type { ContentQualityCheck } from '@/lib/content-studio/types'

export interface ArticleQualityInput {
  title: string
  description: string
  markdown: string
  relatedSlugs: string[]
  coverImageAlt: string
  coverImagePrompt: string
  researchSourceUrls: string[]
}

function words(value: string): string[] {
  return value.trim().match(/[\p{L}\p{N}]+(?:['’-][\p{L}\p{N}]+)*/gu) ?? []
}

function quickAnswer(markdown: string): string {
  const raw = markdown.match(/<blockquote\b[^>]*class=["'][^"']*\bquick-answer\b[^"']*["'][^>]*>([\s\S]*?)<\/blockquote>/i)?.[1] ?? ''
  return raw.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
}

function distinctLinks(markdown: string, pattern: RegExp): number {
  return new Set([...markdown.matchAll(pattern)].map((match) => match[1])).size
}

function canonicalUrl(value: string): string {
  try {
    const url = new URL(value)
    url.hash = ''
    return url.toString().replace(/\/$/, '')
  } catch {
    return value.trim().replace(/\/$/, '')
  }
}

export function getArticleQualityChecks(input: ArticleQualityInput): ContentQualityCheck[] {
  const wordCount = words(input.markdown).length
  const quickAnswerWords = words(quickAnswer(input.markdown)).length
  const h2Count = [...input.markdown.matchAll(/^##\s+[^#].+$/gm)].length
  const faq = input.markdown.match(/^##\s+Frequently asked questions\s*$([\s\S]*)/im)?.[1] ?? ''
  const faqCount = [...faq.matchAll(/^###\s+.+$/gm)].length
  const internalLinks = distinctLinks(input.markdown, /\]\(\/blog\/([a-z0-9-]+)(?:#[^)]+)?\)/g)
  const externalUrls = new Set(
    [...input.markdown.matchAll(/\]\((https?:\/\/[^)\s]+)\)/g)]
      .map((match) => match[1])
      .filter((url) => !/^https?:\/\/(?:www\.)?loqara\.com(?:\/|$)/i.test(url)),
  )
  const knownSourceUrls = new Set(input.researchSourceUrls.map(canonicalUrl))
  const unverifiedCitations = [...externalUrls].filter((url) => !knownSourceUrls.has(canonicalUrl(url)))
  const hasPlaceholders = /\b(?:TODO|TBD|TK)\b|\[(?:insert|add|source|citation)[^\]]*\]/i.test(input.markdown)

  return [
    {
      id: 'title',
      label: 'Complete article title',
      detail: `${input.title.trim().length} characters`,
      passed: input.title.trim().length >= 20 && input.title.trim().length <= 180,
      severity: 'required',
    },
    {
      id: 'description',
      label: 'Search description',
      detail: `${input.description.trim().length} characters; target 80–170`,
      passed: input.description.trim().length >= 80 && input.description.trim().length <= 170,
      severity: 'required',
    },
    {
      id: 'quick-answer',
      label: '40–60 word Quick Answer',
      detail: `${quickAnswerWords} words`,
      passed: quickAnswerWords >= 40 && quickAnswerWords <= 60,
      severity: 'required',
    },
    {
      id: 'structure',
      label: 'Useful article structure',
      detail: `${wordCount.toLocaleString()} words · ${h2Count} H2 sections`,
      passed: wordCount >= 900 && h2Count >= 5,
      severity: 'recommended',
    },
    {
      id: 'citations',
      label: 'Current external evidence',
      detail: `${externalUrls.size} cited links · ${knownSourceUrls.size} research sources${unverifiedCitations.length ? ` · ${unverifiedCitations.length} unverified` : ''}`,
      passed: externalUrls.size >= 3 && knownSourceUrls.size >= 3 && unverifiedCitations.length === 0,
      severity: 'required',
    },
    {
      id: 'internal-links',
      label: 'Internal Loqara links',
      detail: `${internalLinks} contextual blog links`,
      passed: internalLinks >= 2,
      severity: 'required',
    },
    {
      id: 'faq',
      label: 'FAQ coverage',
      detail: `${faqCount} visible questions`,
      passed: faqCount >= 6,
      severity: 'recommended',
    },
    {
      id: 'related',
      label: 'Related article recommendations',
      detail: `${input.relatedSlugs.length} related articles`,
      passed: input.relatedSlugs.length >= 2,
      severity: 'recommended',
    },
    {
      id: 'cover',
      label: 'Cover image brief and alt text',
      detail: input.coverImageAlt.trim() && input.coverImagePrompt.trim() ? 'Ready' : 'Missing',
      passed: input.coverImageAlt.trim().length >= 20 && input.coverImagePrompt.trim().length >= 40,
      severity: 'recommended',
    },
    {
      id: 'placeholders',
      label: 'No unfinished placeholders',
      detail: hasPlaceholders ? 'Placeholder text found' : 'Clean',
      passed: !hasPlaceholders,
      severity: 'required',
    },
  ]
}
