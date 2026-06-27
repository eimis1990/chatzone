import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Terms of Service — Loqara',
  description: 'The terms that govern your use of Loqara.',
  alternates: { canonical: '/terms' },
}

const CONTACT_EMAIL = 'e.kudarauskas@gmail.com'

export default function TermsPage() {
  return (
    <main className="mx-auto max-w-2xl px-6 py-12">
      <h1 className="text-2xl font-semibold">Terms of Service</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        The terms that govern your use of Loqara. Last updated {new Date().getFullYear()}.
      </p>

      <section className="mt-8 space-y-3">
        <h2 className="text-lg font-semibold">Agreement</h2>
        <p className="text-sm text-foreground/80">
          By creating an account or using Loqara (the “Service”), you agree to these terms. If you use
          Loqara on behalf of an organization, you confirm you have authority to bind that
          organization. If you don’t agree, please don’t use the Service.
        </p>
      </section>

      <section className="mt-8 space-y-3">
        <h2 className="text-lg font-semibold">The Service</h2>
        <p className="text-sm text-foreground/80">
          Loqara provides an AI chat and voice agent you configure with your own knowledge and embed
          on your website. It answers visitor questions, captures leads, looks up orders, and hands
          off to your team. Features may change as the product evolves.
        </p>
      </section>

      <section className="mt-8 space-y-3">
        <h2 className="text-lg font-semibold">Plans and pricing</h2>
        <p className="text-sm text-foreground/80">
          Loqara offers a free plan and paid subscription plans. We may change plan features, usage
          limits, or pricing over time, and we’ll give reasonable notice of material changes that
          affect active accounts. Paid plans are billed through our payment processor, and you can
          upgrade, downgrade, or cancel at any time.
        </p>
      </section>

      <section className="mt-8 space-y-3">
        <h2 className="text-lg font-semibold">Your content and responsibilities</h2>
        <p className="text-sm text-foreground/80">
          You own the content you provide — your knowledge sources, branding, and configuration — and
          you’re responsible for it, including having the rights to use it and complying with the laws
          that apply to your business and your customers. You agree not to use Loqara to send spam,
          host unlawful or infringing content, attempt to disrupt or overload the Service, or mislead
          people about the fact they are interacting with an AI agent. You’re responsible for activity
          under your account and for keeping your credentials secure.
        </p>
      </section>

      <section className="mt-8 space-y-3">
        <h2 className="text-lg font-semibold">AI-generated output</h2>
        <p className="text-sm text-foreground/80">
          The agent generates responses from your configured knowledge and large language models. Its
          output can be inaccurate or incomplete and should not be relied on as professional advice.
          You’re responsible for how your bot is configured and for the answers it gives your
          customers.
        </p>
      </section>

      <section className="mt-8 space-y-3">
        <h2 className="text-lg font-semibold">Availability and warranty</h2>
        <p className="text-sm text-foreground/80">
          The Service is provided “as is,” without warranties of any kind. We aim for reliable uptime
          but do not guarantee the Service will be uninterrupted or error-free.
        </p>
      </section>

      <section className="mt-8 space-y-3">
        <h2 className="text-lg font-semibold">Limitation of liability</h2>
        <p className="text-sm text-foreground/80">
          To the maximum extent permitted by law, Loqara is not liable for indirect, incidental, or
          consequential damages, or for lost profits, data, or goodwill arising from your use of the
          Service.
        </p>
      </section>

      <section className="mt-8 space-y-3">
        <h2 className="text-lg font-semibold">Termination</h2>
        <p className="text-sm text-foreground/80">
          You can stop using Loqara and delete your data at any time from your in-app Settings. We may
          suspend or terminate accounts that violate these terms or put the Service or other users at
          risk.
        </p>
      </section>

      <section className="mt-8 space-y-3">
        <h2 className="text-lg font-semibold">Contact</h2>
        <p className="text-sm text-foreground/80">
          Questions about these terms? Email{' '}
          <a href={`mailto:${CONTACT_EMAIL}`} className="font-medium text-foreground underline">
            {CONTACT_EMAIL}
          </a>
          .
        </p>
      </section>
    </main>
  )
}
