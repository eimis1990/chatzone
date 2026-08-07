import type { ContentItem, ContentSource } from '@/lib/content-studio/types'
import { getArticleQualityChecks } from '@/lib/content-studio/quality'

export function assertContentPublicationReady(
  item: ContentItem,
  sources: ContentSource[],
  knownBlogSlugs: Set<string>,
  knownTopics: Set<string>,
) {
  if (item.status !== 'ready') throw new Error('Only an article marked Ready can create a publishing pull request')
  if (!knownTopics.has(item.topic)) throw new Error('Choose a valid public blog topic before publishing')
  if (!item.cover_image_path || item.cover_image_alt.trim().length < 20) {
    throw new Error('Approve a meaningful cover image and alt text before publishing')
  }

  const checks = getArticleQualityChecks({
    title: item.title,
    description: item.description,
    markdown: item.markdown,
    relatedSlugs: item.related_slugs,
    coverImageAlt: item.cover_image_alt,
    coverImagePrompt: item.cover_image_prompt,
    researchSourceUrls: sources.map((source) => source.url),
  })
  const failedRequired = checks.filter((check) => check.severity === 'required' && !check.passed)
  if (failedRequired.length) {
    throw new Error(`Required quality checks failed: ${failedRequired.map((check) => check.label).join(', ')}`)
  }

  const internalLinks = [...item.markdown.matchAll(/\]\(\/blog\/([a-z0-9-]+)(?:#[^)]*)?\)/g)].map((match) => match[1])
  const invalidLinks = [...new Set([...internalLinks, ...item.related_slugs])]
    .filter((slug) => slug === item.slug || !knownBlogSlugs.has(slug))
  if (invalidLinks.length) throw new Error(`Fix invalid internal article links: ${invalidLinks.join(', ')}`)

  return checks
}
