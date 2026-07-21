import type { Metadata } from 'next'
import Link from 'next/link'
import { AUTHOR, IDENTITY_PAGES_UPDATED, formatUpdated } from '@/lib/site'

const DESCRIPTION =
  'How Loqara researches, writes, reviews, and corrects its published guides — including how AI assistance is used and how to report an error.'

export const metadata: Metadata = {
  title: 'Editorial policy',
  description: DESCRIPTION,
  alternates: { canonical: '/editorial-policy' },
  openGraph: {
    title: 'Loqara editorial policy',
    description: DESCRIPTION,
    url: '/editorial-policy',
    type: 'website',
    images: [{ url: '/landing/og.jpg?v=4', width: 1200, height: 630, alt: 'Loqara' }],
  },
  twitter: { card: 'summary_large_image', title: 'Loqara editorial policy', description: DESCRIPTION, images: ['/landing/og.jpg?v=4'] },
}

export default function EditorialPolicyPage() {
  return (
    <main className="mx-auto w-full max-w-2xl px-6 py-12">
      <h1 className="text-2xl font-semibold">Editorial policy</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        How we research, write, and correct what we publish. Last updated{' '}
        {formatUpdated(IDENTITY_PAGES_UPDATED)}.
      </p>

      <section className="mt-8 space-y-3">
        <h2 className="text-lg font-semibold">Who writes and approves content</h2>
        <p className="text-sm text-foreground/80">
          Every article is published under{' '}
          <Link href={`/authors/${AUTHOR.slug}`} className="font-medium text-foreground underline">
            {AUTHOR.name}
          </Link>
          , Loqara&apos;s founder, who is responsible for its accuracy. There is no separate content
          team: the author builds the product the guides describe.
        </p>
      </section>

      <section className="mt-8 space-y-3">
        <h2 className="text-lg font-semibold">How articles are researched</h2>
        <p className="text-sm text-foreground/80">
          Product-behavior claims come from operating Loqara itself. Claims about other vendors,
          statistics, or regulations are researched from primary sources — official documentation,
          vendor pricing pages, original research, and the regulation text — and we link the source
          next to the claim. Where a claim can&apos;t be verified, we qualify it as opinion or remove
          it. Comparisons additionally follow our{' '}
          <Link href="/review-methodology" className="font-medium text-foreground underline">
            review methodology
          </Link>
          .
        </p>
      </section>

      <section className="mt-8 space-y-3">
        <h2 className="text-lg font-semibold">AI assistance</h2>
        <p className="text-sm text-foreground/80">
          We build AI software and we use it: drafts are produced with AI assistance. Every article
          is reviewed, fact-checked, and edited by the author before publication, and the author
          stands behind the result. AI is a drafting tool here, not an unsupervised publisher.
        </p>
      </section>

      <section className="mt-8 space-y-3">
        <h2 className="text-lg font-semibold">Updates and dates</h2>
        <p className="text-sm text-foreground/80">
          The published date reflects first publication. An &quot;updated&quot; date is added only
          when an article materially changes — not for typo fixes, and never automatically at build
          time.
        </p>
      </section>

      <section className="mt-8 space-y-3">
        <h2 className="text-lg font-semibold">Corrections</h2>
        <p className="text-sm text-foreground/80">
          Found an error? Email{' '}
          <a href="mailto:hello@loqara.com" className="font-medium text-foreground underline">
            hello@loqara.com
          </a>
          . We review correction reports, fix confirmed errors in place, and mark the article
          updated when the fix is material.
        </p>
      </section>
    </main>
  )
}
