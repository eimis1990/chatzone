import { notFound } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import type { Metadata } from 'next'
import { LandingNav } from '@/components/landing/LandingNav'
import { Footer } from '@/components/landing/Footer'
import { ArticleAside } from '@/components/blog/ArticleAside'
import { RelatedGuides } from '@/components/blog/RelatedGuides'
import { LinkedinIcon } from '@/components/blog/social-icons'
import { getAllPosts, getPostBySlug, getRelatedPosts } from '@/lib/blog'
import { getTopic } from '@/lib/blog-topics'
import { SITE_URL, SITE_NAME, AUTHOR } from '@/lib/site'

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
      ...(post.updated ? { modifiedTime: post.updated } : {}),
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
    '@graph': [
      {
        '@type': 'BlogPosting',
        headline: post.title,
        description: post.description,
        datePublished: post.date,
        dateModified: post.updated ?? post.date,
        // Canonical author identity — resolves to the public author page.
        author:
          post.author === AUTHOR.name
            ? {
                '@type': 'Person',
                '@id': `${SITE_URL}/authors/${AUTHOR.slug}#person`,
                name: AUTHOR.name,
                url: `${SITE_URL}/authors/${AUTHOR.slug}`,
                jobTitle: AUTHOR.jobTitle,
                sameAs: [AUTHOR.linkedin],
                worksFor: { '@type': 'Organization', '@id': `${SITE_URL}/#organization`, name: SITE_NAME },
              }
            : { '@type': 'Person', name: post.author },
        publisher: {
          '@type': 'Organization',
          name: SITE_NAME,
          logo: { '@type': 'ImageObject', url: `${SITE_URL}/loqara-logo-colorful.png` },
        },
        mainEntityOfPage: `${SITE_URL}/blog/${slug}`,
        image: post.image ? `${SITE_URL}${post.image}` : `${SITE_URL}/landing/og.jpg`,
      },
      {
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'Home', item: SITE_URL },
          { '@type': 'ListItem', position: 2, name: 'Blog', item: `${SITE_URL}/blog` },
          { '@type': 'ListItem', position: 3, name: post.title, item: `${SITE_URL}/blog/${slug}` },
        ],
      },
      // Only when the post has a "Frequently asked questions" section, so the
      // schema mirrors visible content. Note: Google restricts FAQ rich results
      // to well-known government/health sites, so no rich result is expected —
      // the markup is kept for accurate machine-readable structure only.
      ...(post.faq.length
        ? [
            {
              '@type': 'FAQPage',
              mainEntity: post.faq.map((f) => ({
                '@type': 'Question',
                name: f.question,
                acceptedAnswer: { '@type': 'Answer', text: f.answer },
              })),
            },
          ]
        : []),
    ],
  }

  const related = getRelatedPosts(slug)
  const topic = getTopic(post.topic)
  const postUrl = `${SITE_URL}/blog/${slug}`

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <LandingNav solid />
      <main className="mx-auto w-full min-h-svh max-w-[60rem] px-5 pb-24 pt-28">
        <Link href="/blog" className="text-sm font-medium text-primary hover:underline">
          ← All posts
        </Link>

        <div className="mt-6 lg:grid lg:grid-cols-[minmax(0,1fr)_15rem] lg:gap-12">
          <article className="min-w-0">
            <header className="mb-8">
              <p className="text-xs uppercase tracking-wide text-gray-500">
                {topic && (
                  <>
                    <Link
                      href={`/blog/topics/${topic.slug}`}
                      className="font-semibold text-primary hover:underline"
                    >
                      {topic.name}
                    </Link>
                    {' · '}
                  </>
                )}
                {formatDate(post.date)} · {post.readingMinutes} min read
              </p>
              <h1 className="mt-2 text-3xl font-semibold tracking-tight text-gray-900 sm:text-4xl">
                {post.title}
              </h1>
              <div className="mt-5 flex items-center gap-3">
                {post.authorImage ? (
                  <Image
                    src={post.authorImage}
                    alt={post.author}
                    width={40}
                    height={40}
                    sizes="40px"
                    className="size-10 rounded-full object-cover ring-1 ring-black/[0.06]"
                  />
                ) : null}
                <span className="text-sm leading-tight">
                  {post.author === AUTHOR.name ? (
                    <Link
                      href={`/authors/${AUTHOR.slug}`}
                      className="font-semibold text-gray-900 underline-offset-2 hover:underline"
                    >
                      {post.author}
                    </Link>
                  ) : (
                    <span className="font-semibold text-gray-900">{post.author}</span>
                  )}
                  <span className="text-gray-500"> • {post.authorRole}</span>
                </span>
                {post.authorLinkedin && (
                  <a
                    href={post.authorLinkedin}
                    target="_blank"
                    rel="noreferrer"
                    aria-label={`${post.author} on LinkedIn`}
                    title={`${post.author} on LinkedIn`}
                    className="text-gray-400 transition-colors hover:text-[#0A66C2]"
                  >
                    <LinkedinIcon className="size-4" />
                  </a>
                )}
              </div>
            </header>

            {post.image && (
              <div className="relative mb-10 aspect-video w-full overflow-hidden rounded-2xl">
                <Image
                  src={post.image}
                  alt={post.title}
                  fill
                  preload
                  sizes="(min-width: 1024px) 624px, calc(100vw - 40px)"
                  className="object-cover"
                />
              </div>
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
          </article>

          <ArticleAside title={post.title} headings={post.headings} url={postUrl} />
        </div>

        <RelatedGuides posts={related} />
      </main>
      <Footer />
    </>
  )
}
