import { LandingNav } from '@/components/landing/LandingNav'
import { Hero } from '@/components/landing/Hero'
import { Features, Stats, HowItWorks, CTASection, Footer } from '@/components/landing/sections'
import { Pricing } from '@/components/landing/Pricing'
import { SetupPricing } from '@/components/landing/SetupPricing'
import { Showcase } from '@/components/landing/Showcase'
import { Faq } from '@/components/landing/Faq'
import { FAQ } from '@/components/landing/faq-data'
import { WidgetEmbed } from '@/components/landing/WidgetEmbed'
import { getLandingBotKey } from '@/lib/platform-bot'
import { PLANS, DISPLAY_PLANS } from '@/lib/plans-catalog'
import { SITE_URL, SITE_NAME } from '@/lib/site'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  alternates: { canonical: '/' },
}

// Re-rendered when the owner flips the landing toggle (revalidatePath('/')); the
// 5-min window is just a backstop so the page otherwise stays cached.
export const revalidate = 300

const PAID = DISPLAY_PLANS.map((p) => PLANS[p].monthly)
const LOW_PRICE = Math.min(...PAID)
const HIGH_PRICE = Math.max(...PAID)

// Structured data — how Google rich results and AI assistants (GEO) parse what
// Loqara is, who makes it, what it costs, and the most common questions.
const jsonLd = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'Organization',
      '@id': `${SITE_URL}/#organization`,
      name: SITE_NAME,
      url: SITE_URL,
      logo: `${SITE_URL}/loqara-logo-colorful.png`,
      image: `${SITE_URL}/landing/og.jpg?v=4`,
      slogan: 'The AI chat & voice agent for modern stores.',
      sameAs: ['https://www.linkedin.com/company/loqara/'],
      description:
        'Loqara is an AI chat and voice agent for e-commerce stores: it answers customer questions from your own knowledge, searches your catalog, looks up orders, captures leads, and hands off to a human — embedded in one line of code.',
    },
    {
      '@type': 'WebSite',
      '@id': `${SITE_URL}/#website`,
      url: SITE_URL,
      name: SITE_NAME,
      publisher: { '@id': `${SITE_URL}/#organization` },
      inLanguage: 'en',
    },
    {
      '@type': 'SoftwareApplication',
      '@id': `${SITE_URL}/#software`,
      name: SITE_NAME,
      applicationCategory: 'BusinessApplication',
      applicationSubCategory: 'Customer support / live chat',
      operatingSystem: 'Web',
      url: SITE_URL,
      description:
        'AI chat & voice support for e-commerce: grounded answers from your knowledge, product search, identity-checked order lookups, live human handoff, and analytics — embedded in one line of code. Supports English and Lithuanian.',
      featureList: [
        'AI chat agent grounded in your knowledge base',
        'Real-time voice agent (add-on)',
        'Product search and order lookup',
        'Lead capture',
        'Live human handoff from a shared inbox',
        'Conversation analytics and CSAT',
        'Multilingual (English, Lithuanian)',
        'One-line embed snippet',
      ],
      offers: {
        '@type': 'AggregateOffer',
        priceCurrency: 'EUR',
        lowPrice: String(LOW_PRICE),
        highPrice: String(HIGH_PRICE),
        offerCount: DISPLAY_PLANS.length,
      },
      publisher: { '@id': `${SITE_URL}/#organization` },
    },
    {
      '@type': 'FAQPage',
      '@id': `${SITE_URL}/#faq`,
      mainEntity: FAQ.map(([question, answer]) => ({
        '@type': 'Question',
        name: question,
        acceptedAnswer: { '@type': 'Answer', text: answer },
      })),
    },
  ],
}

export default async function Home() {
  // Loqara's own bot, shown only when the owner has toggled it on (Owner → Our chatbot).
  const landingBotKey = await getLandingBotKey()

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <LandingNav />
      <main>
        <Hero />
        <Showcase />
        <Features />
        <Stats />
        <HowItWorks />
        <Pricing />
        <SetupPricing />
        <Faq />
        <CTASection />
      </main>
      <Footer />
      {landingBotKey && <WidgetEmbed botKey={landingBotKey} loadingPolicy="idle" />}
    </>
  )
}
