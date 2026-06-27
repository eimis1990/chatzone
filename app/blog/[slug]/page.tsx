import { notFound } from 'next/navigation'
import Link from 'next/link'
import type { Metadata } from 'next'
import { LandingNav } from '@/components/landing/LandingNav'
import { Footer } from '@/components/landing/sections'
import { getAllPosts, getPostBySlug } from '@/lib/blog'
import { SITE_URL, SITE_NAME } from '@/lib/site'

export function generateStaticParams() {
  return getAllPosts().map((p) => ({ slug: p.slug }))
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>
}): Promise<Metadata> {
  const { slug } = await params
  const post = getPostBySlug(slug)
  if (!post) return {}
  return {
    title: post.title,
    description: post.description,
    alternates: { canonical: `/blog/${slug}` },
    openGraph: {
      title: post.title,
      description: post.description,
      type: 'article',
      url: `/blog/${slug}`,
      publishedTime: post.date,
      authors: [post.author],
      // og:image comes from the colocated opengraph-image.tsx (per-post card).
    },
    twitter: { card: 'summary_large_image', title: post.title, description: post.description },
  }
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
}

export default async function BlogPostPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const post = getPostBySlug(slug)
  if (!post) notFound()

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    headline: post.title,
    description: post.description,
    datePublished: post.date,
    dateModified: post.date,
    author: { '@type': 'Person', name: post.author },
    publisher: {
      '@type': 'Organization',
      name: SITE_NAME,
      logo: { '@type': 'ImageObject', url: `${SITE_URL}/loqara-icon.svg` },
    },
    mainEntityOfPage: `${SITE_URL}/blog/${slug}`,
    image: post.image ? `${SITE_URL}${post.image}` : `${SITE_URL}/landing/og.png`,
  }

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <LandingNav solid />
      <main className="mx-auto min-h-svh max-w-2xl px-5 pb-24 pt-28">
        <Link href="/blog" className="text-sm font-medium text-primary hover:underline">
          ← All posts
        </Link>
        <header className="mb-8 mt-6">
          <p className="text-xs uppercase tracking-wide text-gray-500">
            {formatDate(post.date)} · {post.author}
          </p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-gray-900 sm:text-4xl">
            {post.title}
          </h1>
        </header>

        {post.image && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={post.image}
            alt={post.title}
            width={1200}
            height={675}
            className="mb-10 aspect-video w-full rounded-2xl object-cover"
          />
        )}

        <div className="article" dangerouslySetInnerHTML={{ __html: post.html }} />

        <aside className="mt-12 rounded-2xl border bg-gray-50 p-6 text-center">
          <p className="text-lg font-semibold text-gray-900">See Loqara on your store</p>
          <p className="mt-1 text-sm text-gray-600">AI chat &amp; voice support, embedded in one line.</p>
          <Link
            href="/#get-started"
            className="mt-4 inline-flex h-11 items-center justify-center rounded-full bg-primary px-6 text-sm font-semibold text-white transition-colors hover:bg-primary-hover"
          >
            Get started
          </Link>
        </aside>
      </main>
      <Footer />
    </>
  )
}
