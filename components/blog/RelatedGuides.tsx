import Image from 'next/image'
import Link from 'next/link'
import type { BlogPost } from '@/lib/blog'

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
}

/** "Related guides" card row shown under a post — mirrors the blog listing cards. */
export function RelatedGuides({ posts }: { posts: BlogPost[] }) {
  if (posts.length === 0) return null
  return (
    <section className="mt-20 border-t border-black/[0.06] pt-12">
      <h2 className="mb-8 text-2xl font-semibold tracking-tight text-gray-900">Related guides</h2>
      <div className="grid gap-7 sm:grid-cols-2 lg:grid-cols-3">
        {posts.map((post) => {
          const href = `/blog/${post.slug}`
          return (
            <article
              key={post.slug}
              className="group rounded-3xl border border-black/[0.07] bg-white p-3 shadow-[0_1px_3px_rgba(0,0,0,0.04)] transition duration-200 hover:-translate-y-0.5 hover:shadow-[0_12px_32px_-12px_rgba(0,0,0,0.18)]"
            >
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
                    sizes="(min-width: 1024px) 277px, (min-width: 640px) calc((100vw - 68px) / 2), calc(100vw - 64px)"
                    className="object-cover transition duration-300 group-hover:scale-[1.03]"
                  />
                )}
              </Link>
              <div className="px-2 pb-2 pt-4">
                <p className="text-xs text-gray-500">{formatDate(post.date)}</p>
                <h3 className="mt-2 text-lg font-semibold tracking-tight text-gray-900">
                  <Link href={href} prefetch={false} className="transition-colors group-hover:text-primary">
                    {post.title}
                  </Link>
                </h3>
              </div>
            </article>
          )
        })}
      </div>
    </section>
  )
}
