import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { BlogIndexPage } from '@/components/blog/BlogIndexPage'
import {
  getAllPosts,
  getBlogPage,
  getBlogPageCount,
  getBlogPaginationParams,
  parseBlogPageParam,
} from '@/lib/blog'

type Props = { params: Promise<{ page: string }> }

export const dynamicParams = false

export function generateStaticParams() {
  return getBlogPaginationParams(getAllPosts().length)
}

function resolvePage(value: string): number {
  const page = parseBlogPageParam(value, getBlogPageCount(getAllPosts().length))
  if (page === null) notFound()
  return page
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const page = resolvePage((await params).page)
  const description = `Browse page ${page} of Loqara's practical guides on AI chat and voice support for e-commerce.`

  return {
    title: `Blog — Page ${page}`,
    description,
    alternates: { canonical: `/blog/page/${page}` },
    openGraph: {
      title: `Loqara Blog — Page ${page}`,
      description,
      url: `/blog/page/${page}`,
      type: 'website',
    },
  }
}

export default async function PaginatedBlogIndex({ params }: Props) {
  const posts = getAllPosts()
  const page = parseBlogPageParam((await params).page, getBlogPageCount(posts.length))
  if (page === null) notFound()

  const archive = getBlogPage(posts, page)
  if (!archive) notFound()

  return <BlogIndexPage archive={archive} />
}
