import type { Metadata } from 'next'
import Link from 'next/link'
import { SITE_URL, SITE_NAME, AUTHOR } from '@/lib/site'

const DESCRIPTION =
  'Who builds Loqara, what the product does, and how to reach us. Loqara is an AI chat & voice agent for e-commerce stores, built by founder Eimantas Kudarauskas.'

export const metadata: Metadata = {
  title: 'About Loqara',
  description: DESCRIPTION,
  alternates: { canonical: '/about' },
  openGraph: {
    title: 'About Loqara',
    description: DESCRIPTION,
    url: '/about',
    type: 'website',
    images: [{ url: '/landing/og.jpg?v=4', width: 1200, height: 630, alt: 'Loqara' }],
  },
  twitter: { card: 'summary_large_image', title: 'About Loqara', description: DESCRIPTION, images: ['/landing/og.jpg?v=4'] },
}

// AboutPage schema ties the publisher identity together for crawlers; every
// claim here is visible on the page.
const jsonLd = {
  '@context': 'https://schema.org',
  '@type': 'AboutPage',
  mainEntity: {
    '@type': 'Organization',
    '@id': `${SITE_URL}/#organization`,
    name: SITE_NAME,
    url: SITE_URL,
    email: 'hello@loqara.com',
    founder: {
      '@type': 'Person',
      '@id': `${SITE_URL}/authors/${AUTHOR.slug}#person`,
      name: AUTHOR.name,
      jobTitle: AUTHOR.jobTitle,
      url: `${SITE_URL}/authors/${AUTHOR.slug}`,
      sameAs: [AUTHOR.linkedin],
    },
    sameAs: ['https://www.linkedin.com/company/loqara/'],
  },
}

export default function AboutPage() {
  return (
    <main className="mx-auto w-full max-w-2xl px-6 py-12">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <h1 className="text-2xl font-semibold">About Loqara</h1>

      <section className="mt-8 space-y-3">
        <h2 className="text-lg font-semibold">What Loqara is</h2>
        <p className="text-sm text-foreground/80">
          Loqara is an AI chat and voice agent for e-commerce stores. It answers customer questions
          from the store&apos;s own knowledge, searches the live product catalog, looks up orders,
          captures leads, and hands the conversation to a human when needed — embedded on a site
          with one line of code. It currently supports English and Lithuanian conversations.
        </p>
      </section>

      <section className="mt-8 space-y-3">
        <h2 className="text-lg font-semibold">Who builds it</h2>
        <p className="text-sm text-foreground/80">
          Loqara is built by{' '}
          <Link href={`/authors/${AUTHOR.slug}`} className="font-medium text-foreground underline">
            {AUTHOR.name}
          </Link>
          , its founder, who also writes the guides on the{' '}
          <Link href="/blog" className="font-medium text-foreground underline">
            blog
          </Link>
          . The product is developed hands-on: the same person who answers support email ships the
          features.
        </p>
      </section>

      <section className="mt-8 space-y-3">
        <h2 className="text-lg font-semibold">How we publish</h2>
        <p className="text-sm text-foreground/80">
          Everything on the blog follows our{' '}
          <Link href="/editorial-policy" className="font-medium text-foreground underline">
            editorial policy
          </Link>
          , and product comparisons follow a written{' '}
          <Link href="/review-methodology" className="font-medium text-foreground underline">
            review methodology
          </Link>{' '}
          that discloses our commercial relationship to the market we write about.
        </p>
      </section>

      <section className="mt-8 space-y-3">
        <h2 className="text-lg font-semibold">Contact</h2>
        <p className="text-sm text-foreground/80">
          Email{' '}
          <a href="mailto:hello@loqara.com" className="font-medium text-foreground underline">
            hello@loqara.com
          </a>{' '}
          — including corrections to anything we publish. Company profile:{' '}
          <a
            href="https://www.linkedin.com/company/loqara/"
            rel="noreferrer"
            target="_blank"
            className="font-medium text-foreground underline"
          >
            LinkedIn
          </a>
          .
        </p>
      </section>
    </main>
  )
}
