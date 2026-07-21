import type { Metadata } from 'next'
import { BlogIndexPage } from '@/components/blog/BlogIndexPage'
import { getAllPosts, getBlogPage } from '@/lib/blog'

export const metadata: Metadata = {
  title: 'Blog',
  description:
    'Practical guides on AI chat & voice support for e-commerce — cutting support tickets, embedding a chatbot, and converting more shoppers.',
  alternates: { canonical: '/blog' },
}

export default function BlogIndex() {
  const archive = getBlogPage(getAllPosts(), 1)

  if (!archive) return null
  return <BlogIndexPage archive={archive} />
}
