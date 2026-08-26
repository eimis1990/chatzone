import type { Metadata } from 'next'
import { LEGAL_UPDATED, formatUpdated } from '@/lib/site'

export const metadata: Metadata = {
  title: 'Privacy & Data Handling — Loqara',
  description: 'How Loqara collects, processes, retains, and protects data.',
  alternates: { canonical: '/privacy' },
  openGraph: {
    title: 'Privacy & Data Handling — Loqara',
    description: 'How Loqara collects, processes, retains, and protects data.',
    url: '/privacy',
    type: 'website',
    images: [{ url: '/landing/og.jpg?v=4', width: 1200, height: 630, alt: 'Loqara' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Privacy & Data Handling — Loqara',
    description: 'How Loqara collects, processes, retains, and protects data.',
    images: ['/landing/og.jpg?v=4'],
  },
}

const SUBPROCESSORS = [
  { name: 'Supabase', purpose: 'Database, authentication, and file storage (data hosted in the EU region).' },
  { name: 'OpenAI', purpose: 'Language model responses, embeddings, and conversation analysis.' },
  { name: 'ElevenLabs', purpose: 'Real-time voice agent (speech-to-text, the conversation LLM, and text-to-speech).' },
  { name: 'Vercel', purpose: 'Application hosting, content delivery, and privacy-focused public-site analytics.' },
  { name: 'Google Analytics', purpose: 'Delayed public-site page and conversion measurement.' },
]

export default function PrivacyPage() {
  return (
    <main className="mx-auto w-full max-w-2xl px-6 py-12">
      <h1 className="text-2xl font-semibold">Privacy &amp; Data Handling</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        How Loqara collects, processes, retains, and protects data. Last updated{' '}
        {formatUpdated(LEGAL_UPDATED.privacy)}.
      </p>

      <section className="mt-8 space-y-3">
        <h2 className="text-lg font-semibold">What we process</h2>
        <p className="text-sm text-foreground/80">
          When a visitor chats with a bot, we store the messages, any leads they submit, and
          aggregate analytics (e.g. feedback ratings and topic summaries) so the bot owner can
          review and improve the experience. We do not sell personal data, and the bot answers only
          from its owner&apos;s configured knowledge — it is not used to train third-party models.
        </p>
      </section>

      <section className="mt-8 space-y-3">
        <h2 className="text-lg font-semibold">Public website analytics and signup requests</h2>
        <p className="text-sm text-foreground/80">
          On Loqara&apos;s public website, Vercel Web Analytics and Google Analytics measure page
          visits and actions such as opening or submitting the Get Started form. We keep these
          analytics off authenticated, owner, embedded-widget, and demo screens.
        </p>
        <p className="text-sm text-foreground/80">
          To understand which public page first led to a signup, the browser stores a first-touch
          record in local storage for up to 90 days. It contains the landing pathname, the external
          referrer with its query and fragment removed, and explicit UTM campaign fields. We do not
          retain search-query text (including <code>utm_term</code>), arbitrary landing-page
          parameters, or advertising click IDs in that record. If you submit the Get Started form,
          the same bounded attribution fields are saved with your signup request.
        </p>
      </section>

      <section className="mt-8 space-y-3">
        <h2 className="text-lg font-semibold">Data retention</h2>
        <p className="text-sm text-foreground/80">
          Bot owners choose a retention window in their settings. When set, conversations (and their
          messages) older than that window are automatically and permanently deleted by a daily job.
          Owners can also export or erase their data on demand at any time.
          Public-site first-touch data expires from the browser after 90 days. Signup requests are
          retained until they are converted into an account or deleted by Loqara.
        </p>
      </section>

      <section className="mt-8 space-y-3">
        <h2 className="text-lg font-semibold">Subprocessors</h2>
        <ul className="space-y-2">
          {SUBPROCESSORS.map((s) => (
            <li key={s.name} className="text-sm">
              <span className="font-medium text-foreground">{s.name}</span>
              <span className="text-foreground/70"> — {s.purpose}</span>
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-8 space-y-3">
        <h2 className="text-lg font-semibold">Security</h2>
        <p className="text-sm text-foreground/80">
          Data is encrypted in transit. Each organization&apos;s data is isolated at the database
          level with row-level security, and embeddable widgets can be restricted to an allowlist of
          domains. Server-only secrets are never exposed to the browser.
        </p>
      </section>

      <section className="mt-8 space-y-3">
        <h2 className="text-lg font-semibold">Your rights</h2>
        <p className="text-sm text-foreground/80">
          Bot owners can export and delete their organization&apos;s data from the in-app Settings.
          For access, correction, or erasure requests relating to a specific conversation, contact
          the operator of the website where you used the chat. For a Loqara website signup or
          public-site analytics request, contact Loqara directly using the address below.
        </p>
      </section>

      <section className="mt-8 space-y-3">
        <h2 className="text-lg font-semibold">Contact</h2>
        <p className="text-sm text-foreground/80">
          Questions about privacy or this page? Email{' '}
          <a href="mailto:hello@loqara.com" className="font-medium text-foreground underline">
            hello@loqara.com
          </a>
          .
        </p>
      </section>
    </main>
  )
}
