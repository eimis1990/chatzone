import { LandingNav } from '@/components/landing/LandingNav'
import { Hero } from '@/components/landing/Hero'
import { Features, Stats, HowItWorks, CTASection, Footer } from '@/components/landing/sections'
import { Pricing } from '@/components/landing/Pricing'
import { Faq } from '@/components/landing/Faq'
import { SmoothScroll } from '@/components/landing/SmoothScroll'
import { SITE_URL, SITE_NAME } from '@/lib/site'

// Structured data — how Google rich results and AI assistants (GEO) parse what
// Loqara is, who makes it, and that it's a web app. Pricing is reflected as a
// free Offer for now; update the SoftwareApplication offers when billing ships.
const jsonLd = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'Organization',
      '@id': `${SITE_URL}/#organization`,
      name: SITE_NAME,
      url: SITE_URL,
      logo: `${SITE_URL}/loqara-icon.svg`,
      description: 'The AI chat & voice agent for modern stores.',
    },
    {
      '@type': 'WebSite',
      '@id': `${SITE_URL}/#website`,
      url: SITE_URL,
      name: SITE_NAME,
      publisher: { '@id': `${SITE_URL}/#organization` },
    },
    {
      '@type': 'SoftwareApplication',
      name: SITE_NAME,
      applicationCategory: 'BusinessApplication',
      operatingSystem: 'Web',
      url: SITE_URL,
      description:
        'AI chat & voice support for e-commerce: grounded answers from your knowledge, product search, identity-checked order lookups, live human handoff, and analytics — embedded in one line of code.',
      offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
      publisher: { '@id': `${SITE_URL}/#organization` },
    },
  ],
}

export default function Home() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <SmoothScroll />
      <LandingNav />
      <main>
        <Hero />
        <Features />
        <Stats />
        <HowItWorks />
        <Pricing />
        <Faq />
        <CTASection />
      </main>
      <Footer />
    </>
  )
}
