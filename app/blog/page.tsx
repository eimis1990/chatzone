import Link from 'next/link'
import type { Metadata } from 'next'
import { LandingNav } from '@/components/landing/LandingNav'
import { Footer } from '@/components/landing/sections'
import { FlickeringGrid } from '@/components/magicui/flickering-grid'
import { getAllPosts, type BlogPost } from '@/lib/blog'

export const metadata: Metadata = {
  title: 'Blog',
  description:
    'Practical guides on AI chat & voice support for e-commerce — cutting support tickets, embedding a chatbot, and converting more shoppers.',
  alternates: { canonical: '/blog' },
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
}

function initials(name: string): string {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? '')
    .join('')
}

function PostCard({ post }: { post: BlogPost }) {
  const href = `/blog/${post.slug}`
  return (
    <article className="group rounded-3xl border border-black/[0.07] bg-white p-3 shadow-[0_1px_3px_rgba(0,0,0,0.04)] transition duration-200 hover:-translate-y-0.5 hover:shadow-[0_12px_32px_-12px_rgba(0,0,0,0.18)]">
      <Link href={href} className="block overflow-hidden rounded-2xl">
        {post.image && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={post.image}
            alt={post.title}
            width={640}
            height={480}
            className="aspect-[4/3] w-full object-cover transition duration-300 group-hover:scale-[1.03]"
          />
        )}
      </Link>
      <div className="px-2 pb-2 pt-4">
        <p className="text-xs text-gray-500">
          {formatDate(post.date)}
          <span className="px-1.5">•</span>
          {post.readingMinutes} min read
        </p>
        <h3 className="mt-2 text-xl font-semibold tracking-tight text-gray-900">
          <Link href={href} className="transition-colors group-hover:text-primary">
            {post.title}
          </Link>
        </h3>
        <p className="mt-2 line-clamp-3 text-sm leading-relaxed text-gray-600">{post.description}</p>
        <div className="mt-5 flex items-center gap-3">
          <span className="flex size-9 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary ring-1 ring-black/[0.04]">
            {initials(post.author)}
          </span>
          <span className="text-sm leading-tight">
            <span className="font-semibold text-gray-900">{post.author}</span>
            <span className="text-gray-500"> • {post.authorRole}</span>
          </span>
        </div>
      </div>
    </article>
  )
}

export default function BlogIndex() {
  const posts = getAllPosts()

  return (
    <>
      <LandingNav solid />

      {/* Header band — very light grey with the same flickering grid as the stats strip */}
      <section className="relative isolate overflow-hidden" style={{ backgroundColor: '#edece6' }}>
        <FlickeringGrid
          className="absolute inset-0 -z-10 size-full"
          squareSize={4}
          gridGap={6}
          color="#6f6f6f"
          maxOpacity={0.32}
          flickerChance={0.09}
        />
        {/* fade the band into the white posts area below */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 bottom-0 -z-10 h-24 bg-gradient-to-b from-transparent to-white"
        />
        <div className="mx-auto max-w-3xl px-5 pb-20 pt-28 text-center sm:pt-32">
          <h1 className="text-5xl font-semibold tracking-tight text-gray-900 sm:text-6xl">Blog</h1>
          <p className="mx-auto mt-4 max-w-xl text-lg text-gray-600">
            Practical guides on AI chat &amp; voice support for modern stores.
          </p>
        </div>
      </section>

      {/* Posts */}
      <main className="bg-white">
        <div className="mx-auto max-w-6xl px-5 pb-24 pt-4">
          <h2 className="mb-8 text-3xl font-semibold tracking-tight text-gray-900">Latest Posts</h2>
          {posts.length === 0 ? (
            <p className="text-gray-600">No posts yet — check back soon.</p>
          ) : (
            <div className="grid gap-7 sm:grid-cols-2 lg:grid-cols-3">
              {posts.map((p) => (
                <PostCard key={p.slug} post={p} />
              ))}
            </div>
          )}
        </div>
      </main>

      <Footer />
    </>
  )
}
