import type { Metadata } from 'next'
import { BlogIndexPage } from '@/components/blog/BlogIndexPage'
import { getAllPosts, getBlogPage } from '@/lib/blog'

const DESCRIPTION =
  'Practical guides on AI chat & voice support for e-commerce — cutting support tickets, embedding a chatbot, and converting more shoppers.'

// Explicit OG/Twitter so this route never inherits the homepage's og:url/title.
// The brand card image is reused deliberately (no blog-specific asset yet).
export const metadata: Metadata = {
  title: 'Blog',
  description: DESCRIPTION,
  alternates: { canonical: '/blog' },
  openGraph: {
    title: 'Loqara Blog',
    description: DESCRIPTION,
    url: '/blog',
    type: 'website',
    images: [{ url: '/landing/og.jpg?v=4', width: 1200, height: 630, alt: 'Loqara Blog' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Loqara Blog',
    description: DESCRIPTION,
    images: ['/landing/og.jpg?v=4'],
  },
}

export default function BlogIndex() {
  const archive = getBlogPage(getAllPosts(), 1)

  if (!archive) return null
  return <BlogIndexPage archive={archive} />
}
