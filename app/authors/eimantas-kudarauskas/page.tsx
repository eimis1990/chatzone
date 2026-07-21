import type { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'
import { getAllPosts } from '@/lib/blog'
import { SITE_URL, AUTHOR } from '@/lib/site'

const DESCRIPTION =
  'Eimantas Kudarauskas is the founder of Loqara and writes its guides on AI chat & voice support for e-commerce.'

export const metadata: Metadata = {
  title: `${AUTHOR.name} — Founder, Loqara`,
  description: DESCRIPTION,
  alternates: { canonical: `/authors/${AUTHOR.slug}` },
  openGraph: {
    title: `${AUTHOR.name} — Founder, Loqara`,
    description: DESCRIPTION,
    url: `/authors/${AUTHOR.slug}`,
    type: 'profile',
    images: [{ url: '/landing/og.jpg?v=4', width: 1200, height: 630, alt: AUTHOR.name }],
  },
  twitter: { card: 'summary_large_image', title: `${AUTHOR.name} — Founder, Loqara`, description: DESCRIPTION, images: ['/landing/og.jpg?v=4'] },
}

export default function AuthorPage() {
  const posts = getAllPosts()

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'ProfilePage',
    mainEntity: {
      '@type': 'Person',
      '@id': `${SITE_URL}/authors/${AUTHOR.slug}#person`,
      name: AUTHOR.name,
      jobTitle: AUTHOR.jobTitle,
      url: `${SITE_URL}/authors/${AUTHOR.slug}`,
      image: `${SITE_URL}${AUTHOR.photo}`,
      sameAs: [AUTHOR.linkedin],
      worksFor: { '@id': `${SITE_URL}/#organization` },
    },
  }

  return (
    <main className="mx-auto w-full max-w-2xl px-6 py-12">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <div className="flex items-center gap-4">
        <Image
          src={AUTHOR.photo}
          alt={AUTHOR.name}
          width={64}
          height={64}
          sizes="64px"
          className="size-16 rounded-full object-cover ring-1 ring-black/[0.06]"
        />
        <div>
          <h1 className="text-2xl font-semibold">{AUTHOR.name}</h1>
          <p className="text-sm text-muted-foreground">
            {AUTHOR.jobTitle},{' '}
            <Link href="/about" className="underline">
              Loqara
            </Link>
            {' · '}
            <a href={AUTHOR.linkedin} rel="noreferrer" target="_blank" className="underline">
              LinkedIn
            </a>
          </p>
        </div>
      </div>

      <section className="mt-8 space-y-3">
        <p className="text-sm text-foreground/80">
          Eimantas founded Loqara and builds it hands-on — the RAG pipeline, the commerce
          integrations, the voice agent, and the widget stores embed. The guides below come from
          that day-to-day work: what an AI support agent can actually do for an online store, what
          it costs to run, and where it goes wrong. Articles follow the{' '}
          <Link href="/editorial-policy" className="font-medium text-foreground underline">
            editorial policy
          </Link>{' '}
          and comparisons follow the{' '}
          <Link href="/review-methodology" className="font-medium text-foreground underline">
            review methodology
          </Link>
          .
        </p>
      </section>

      {/* Text list only — no cover images (plan 5.1: don't load all covers here). */}
      <section className="mt-10">
        <h2 className="text-lg font-semibold">Articles by {AUTHOR.name}</h2>
        <ul className="mt-4 space-y-3">
          {posts.map((p) => (
            <li key={p.slug} className="text-sm">
              <Link href={`/blog/${p.slug}`} prefetch={false} className="font-medium text-foreground underline-offset-2 hover:underline">
                {p.title}
              </Link>
              <span className="text-muted-foreground"> — {new Date(p.date).toLocaleDateString('en-US', { year: 'numeric', month: 'short' })}</span>
            </li>
          ))}
        </ul>
      </section>
    </main>
  )
}
