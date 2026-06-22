import { LandingNav } from '@/components/landing/LandingNav'
import { Hero } from '@/components/landing/Hero'
import { Logos, Features, Stats, HowItWorks, CTASection, Footer } from '@/components/landing/sections'
import { WidgetEmbed } from '@/components/landing/WidgetEmbed'
import { SmoothScroll } from '@/components/landing/SmoothScroll'

// The configured Jarvis bot (avatar, voice, commerce, EN/LT).
const JARVIS_KEY = '135c8f3f62b77480ef0237e5827ca996'

export default function Home() {
  return (
    <>
      <SmoothScroll />
      <LandingNav />
      <main>
        <Hero />
        <Logos />
        <Features />
        <Stats />
        <HowItWorks />
        <CTASection />
      </main>
      <Footer />
      <WidgetEmbed botKey={JARVIS_KEY} />
    </>
  )
}
