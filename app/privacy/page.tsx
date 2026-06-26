import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Privacy & Data Handling — Loqara',
  description: 'How Loqara collects, processes, retains, and protects data.',
}

const SUBPROCESSORS = [
  { name: 'Supabase', purpose: 'Database, authentication, and file storage (data hosted in the EU region).' },
  { name: 'OpenAI', purpose: 'Language model responses, embeddings, and conversation analysis.' },
  { name: 'ElevenLabs', purpose: 'Real-time voice agent (speech-to-text, the conversation LLM, and text-to-speech).' },
  { name: 'Vercel', purpose: 'Application hosting and content delivery.' },
]

export default function PrivacyPage() {
  return (
    <main className="mx-auto max-w-2xl px-6 py-12">
      <h1 className="text-2xl font-semibold">Privacy &amp; Data Handling</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        How Loqara collects, processes, retains, and protects data. Last updated{' '}
        {new Date().getFullYear()}.
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
        <h2 className="text-lg font-semibold">Data retention</h2>
        <p className="text-sm text-foreground/80">
          Bot owners choose a retention window in their settings. When set, conversations (and their
          messages) older than that window are automatically and permanently deleted by a daily job.
          Owners can also export or erase their data on demand at any time.
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
          the operator of the website where you used the chat.
        </p>
      </section>
    </main>
  )
}
