import Image from 'next/image'
import Link from 'next/link'
import { BlogPagination } from '@/components/blog/BlogPagination'
import { LandingNav } from '@/components/landing/LandingNav'
import { Footer } from '@/components/landing/Footer'
import type { BlogPage, BlogPost } from '@/lib/blog'

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

function PostCard({ post, preloadImage }: { post: BlogPost; preloadImage: boolean }) {
  const href = `/blog/${post.slug}`
  return (
    <article className="group grid grid-cols-[7rem_minmax(0,1fr)] items-start rounded-3xl border border-black/[0.07] bg-white p-3 shadow-[0_1px_3px_rgba(0,0,0,0.04)] transition duration-200 hover:-translate-y-0.5 hover:shadow-[0_12px_32px_-12px_rgba(0,0,0,0.18)] sm:block">
      <Link
        href={href}
        prefetch={false}
        className="relative block aspect-[4/3] overflow-hidden rounded-2xl"
      >
        {post.image && (
          <Image
            src={post.image}
            alt={post.title}
            fill
            loading={preloadImage ? 'eager' : 'lazy'}
            fetchPriority={preloadImage ? 'high' : 'auto'}
            sizes="(min-width: 1024px) 352px, (min-width: 640px) calc((100vw - 68px) / 2), 112px"
            className="object-cover transition duration-300 group-hover:scale-[1.03]"
          />
        )}
      </Link>
      <div className="min-w-0 px-3 pb-2 sm:px-2 sm:pt-4">
        <p className="text-xs text-gray-500">
          {formatDate(post.date)}
          <span className="px-1.5">•</span>
          {post.readingMinutes} min read
        </p>
        <h3 className="mt-2 text-xl font-semibold tracking-tight text-gray-900">
          <Link href={href} prefetch={false} className="transition-colors group-hover:text-primary">
            {post.title}
          </Link>
        </h3>
        <p className="mt-2 hidden text-sm leading-relaxed text-gray-600 sm:line-clamp-3">{post.description}</p>
        <p className="mt-5 text-sm leading-tight">
          <span className="font-semibold text-gray-900">{post.author}</span>
          <span className="text-gray-500"> • {post.authorRole}</span>
        </p>
      </div>
    </article>
  )
}

export function BlogIndexPage({ archive }: { archive: BlogPage }) {
  const { posts, page, totalPages } = archive

  return (
    <>
      <LandingNav solid />

      <section className="relative isolate overflow-hidden bg-[#edece6]">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 -z-10 opacity-70"
          style={{
            backgroundImage: 'radial-gradient(circle, rgba(111,111,111,0.32) 1.25px, transparent 1.5px)',
            backgroundSize: '10px 10px',
          }}
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 bottom-0 -z-10 h-24 bg-gradient-to-b from-transparent to-white"
        />
        <div className="mx-auto max-w-3xl px-5 pb-20 pt-28 text-center sm:pt-32">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gray-600">Loqara Blog</p>
          <h1 className="mt-3 text-5xl font-semibold tracking-tight text-gray-900 sm:text-6xl">
            AI support guides for e-commerce
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-lg text-gray-600">
            Practical guides on AI chat &amp; voice support for modern stores.
          </p>
        </div>
      </section>

      <main className="bg-white">
        <div className="mx-auto max-w-6xl px-5 pb-24 pt-4">
          <h2 className="mb-8 text-3xl font-semibold tracking-tight text-gray-900">
            Latest Posts{page > 1 ? ` — Page ${page}` : ''}
          </h2>
          {posts.length === 0 ? (
            <p className="text-gray-600">No posts yet — check back soon.</p>
          ) : (
            <div className="grid gap-7 sm:grid-cols-2 lg:grid-cols-3" data-testid="blog-post-grid">
              {posts.map((post, index) => (
                <PostCard key={post.slug} post={post} preloadImage={index === 0} />
              ))}
            </div>
          )}
          <BlogPagination page={page} totalPages={totalPages} />
        </div>
      </main>

      <Footer />
    </>
  )
}
