import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { LandingNav } from '@/components/landing/LandingNav'
import { Footer } from '@/components/landing/Footer'
import { PostCard } from '@/components/blog/BlogIndexPage'
import { getPostsByTopic } from '@/lib/blog'
import { getTopic, TOPIC_SLUGS } from '@/lib/blog-topics'

type Props = { params: Promise<{ topic: string }> }

export const dynamicParams = false

export function generateStaticParams() {
  return TOPIC_SLUGS.map((topic) => ({ topic }))
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const topic = getTopic((await params).topic)
  if (!topic) return {}
  const url = `/blog/topics/${topic.slug}`
  return {
    title: topic.title,
    description: topic.description,
    alternates: { canonical: url },
    openGraph: {
      title: topic.title,
      description: topic.description,
      url,
      type: 'website',
      images: [{ url: '/landing/og.jpg?v=4', width: 1200, height: 630, alt: 'Loqara Blog' }],
    },
    twitter: {
      card: 'summary_large_image',
      title: topic.title,
      description: topic.description,
      images: ['/landing/og.jpg?v=4'],
    },
  }
}

export default async function TopicHubPage({ params }: Props) {
  const topic = getTopic((await params).topic)
  if (!topic) notFound()

  const posts = getPostsByTopic(topic.slug)
  const pillar = posts.find((p) => p.slug === topic.pillar)
  const supporting = posts.filter((p) => p.slug !== topic.pillar)

  return (
    <>
      <LandingNav solid />
      <main className="bg-white">
        <div className="mx-auto max-w-6xl px-5 pb-24 pt-28">
          <Link href="/blog" className="text-sm font-medium text-primary hover:underline">
            ← All posts
          </Link>
          <header className="mt-6 max-w-3xl">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gray-600">Topic</p>
            <h1 className="mt-3 text-4xl font-semibold tracking-tight text-gray-900 sm:text-5xl">
              {topic.title}
            </h1>
            <p className="mt-4 text-lg leading-relaxed text-gray-600">{topic.intro}</p>
          </header>

          {pillar && (
            <section className="mt-12">
              <h2 className="mb-6 text-2xl font-semibold tracking-tight text-gray-900">Start here</h2>
              <div className="grid gap-7 sm:grid-cols-2 lg:grid-cols-3">
                <PostCard post={pillar} preloadImage />
              </div>
            </section>
          )}

          {supporting.length > 0 && (
            <section className="mt-12">
              <h2 className="mb-6 text-2xl font-semibold tracking-tight text-gray-900">
                Guides in this topic
              </h2>
              <div className="grid gap-7 sm:grid-cols-2 lg:grid-cols-3" data-testid="topic-post-grid">
                {supporting.map((post) => (
                  <PostCard key={post.slug} post={post} preloadImage={false} />
                ))}
              </div>
            </section>
          )}
        </div>
      </main>
      <Footer />
    </>
  )
}
