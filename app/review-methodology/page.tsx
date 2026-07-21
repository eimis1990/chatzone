import type { Metadata } from 'next'
import Link from 'next/link'
import { IDENTITY_PAGES_UPDATED, formatUpdated } from '@/lib/site'

const DESCRIPTION =
  'How Loqara evaluates chat platforms in its comparison articles: what is tested first-hand, what is researched from public sources, and our commercial relationship to the market.'

export const metadata: Metadata = {
  title: 'Review methodology',
  description: DESCRIPTION,
  alternates: { canonical: '/review-methodology' },
  openGraph: {
    title: 'Loqara review methodology',
    description: DESCRIPTION,
    url: '/review-methodology',
    type: 'website',
    images: [{ url: '/landing/og.jpg?v=4', width: 1200, height: 630, alt: 'Loqara' }],
  },
  twitter: { card: 'summary_large_image', title: 'Loqara review methodology', description: DESCRIPTION, images: ['/landing/og.jpg?v=4'] },
}

export default function ReviewMethodologyPage() {
  return (
    <main className="mx-auto w-full max-w-2xl px-6 py-12">
      <h1 className="text-2xl font-semibold">Review methodology</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        What our comparison and &quot;alternatives&quot; articles are based on. Last updated{' '}
        {formatUpdated(IDENTITY_PAGES_UPDATED)}.
      </p>

      <section className="mt-8 space-y-3">
        <h2 className="text-lg font-semibold">Our relationship to this market — read this first</h2>
        <p className="text-sm text-foreground/80">
          Loqara sells an AI support agent, so every comparison we publish covers our own market and
          usually includes Loqara. That is a commercial conflict of interest and we&apos;d rather
          state it than pretend neutrality. We handle it two ways: verifiable facts about
          competitors (pricing, plan limits, features) are cited to their own public pages, and
          judgments (&quot;best for X&quot;) are labeled as our opinion.
        </p>
      </section>

      <section className="mt-8 space-y-3">
        <h2 className="text-lg font-semibold">What is tested first-hand</h2>
        <p className="text-sm text-foreground/80">
          Loqara itself: we operate it daily and its capabilities in comparisons reflect the shipped
          product. Where an article includes screenshots or transcripts of other tools, those come
          from public materials or our own trial use, and the article says which.
        </p>
      </section>

      <section className="mt-8 space-y-3">
        <h2 className="text-lg font-semibold">What is researched from public sources</h2>
        <p className="text-sm text-foreground/80">
          Competitor pricing, plan limits, and feature availability are taken from the vendor&apos;s
          own pricing and documentation pages at the time of writing, and linked in the article.
          Vendors change pricing without notice — treat their page, not ours, as authoritative, and
          tell us via{' '}
          <a href="mailto:hello@loqara.com" className="font-medium text-foreground underline">
            hello@loqara.com
          </a>{' '}
          when we&apos;re out of date.
        </p>
      </section>

      <section className="mt-8 space-y-3">
        <h2 className="text-lg font-semibold">Criteria</h2>
        <p className="text-sm text-foreground/80">
          Comparisons for e-commerce stores weigh: answer quality on real store questions, catalog
          and order integration, human handoff, multilingual support, setup effort, and total cost
          at realistic usage — not feature-list length. Each article states the criteria it applies
          and the date its facts were checked.
        </p>
      </section>

      <section className="mt-8 space-y-3">
        <h2 className="text-lg font-semibold">No pay-to-play</h2>
        <p className="text-sm text-foreground/80">
          Nobody pays to appear in, or be ranked in, our comparisons. There are no affiliate links.
          See also our{' '}
          <Link href="/editorial-policy" className="font-medium text-foreground underline">
            editorial policy
          </Link>
          .
        </p>
      </section>
    </main>
  )
}
