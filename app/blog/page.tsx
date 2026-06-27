import Link from 'next/link'
import type { Metadata } from 'next'
import { LandingNav } from '@/components/landing/LandingNav'
import { Footer } from '@/components/landing/sections'
import { getAllPosts } from '@/lib/blog'

export const metadata: Metadata = {
  title: 'Blog',
  description:
    'Practical guides on AI chat & voice support for e-commerce — cutting support tickets, embedding a chatbot, and converting more shoppers.',
  alternates: { canonical: '/blog' },
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
}

export default function BlogIndex() {
  const posts = getAllPosts()

  return (
    <>
      <LandingNav solid />
      <main className="mx-auto min-h-svh max-w-3xl px-5 pb-24 pt-28">
        <header className="mb-10">
          <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">Blog</h1>
          <p className="mt-3 text-lg text-gray-600">
            Practical guides on AI chat &amp; voice support for modern stores.
          </p>
        </header>

        {posts.length === 0 ? (
          <p className="text-gray-600">No posts yet — check back soon.</p>
        ) : (
          <div className="divide-y divide-gray-200 border-t border-gray-200">
            {posts.map((p) => (
              <article key={p.slug} className="flex flex-col gap-5 py-8 sm:flex-row">
                {p.image && (
                  <Link href={`/blog/${p.slug}`} className="shrink-0">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={p.image}
                      alt={p.title}
                      width={320}
                      height={180}
                      className="aspect-video w-full rounded-xl object-cover sm:w-56"
                    />
                  </Link>
                )}
                <div>
                  <p className="text-xs uppercase tracking-wide text-gray-500">
                    {formatDate(p.date)} · {p.author}
                  </p>
                  <h2 className="mt-2 text-2xl font-semibold tracking-tight text-gray-900">
                    <Link href={`/blog/${p.slug}`} className="transition-colors hover:text-primary">
                      {p.title}
                    </Link>
                  </h2>
                  <p className="mt-2 text-gray-600">{p.description}</p>
                  <Link
                    href={`/blog/${p.slug}`}
                    className="mt-3 inline-block text-sm font-semibold text-primary hover:underline"
                  >
                    Read more →
                  </Link>
                </div>
              </article>
            ))}
          </div>
        )}
      </main>
      <Footer />
    </>
  )
}
