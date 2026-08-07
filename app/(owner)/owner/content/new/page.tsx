import { requireRole } from '@/lib/auth/guards'
import { getAllPosts } from '@/lib/blog'
import { BLOG_TOPICS } from '@/lib/blog-topics'
import { ArticleIntake } from '@/components/owner/content/ArticleIntake'

export const metadata = { title: 'New article — Content Studio | Loqara' }

export default async function NewContentItemPage() {
  await requireRole('owner')

  const articles = getAllPosts().map((post) => ({ slug: post.slug, title: post.title }))
  const topics = BLOG_TOPICS.map((topic) => ({ slug: topic.slug, name: topic.name }))

  return (
    <div className="min-h-full p-4 sm:p-6">
      <ArticleIntake articles={articles} topics={topics} />
    </div>
  )
}
