// Shared FAQ content — rendered by the landing accordion (Faq.tsx) AND emitted
// as FAQPage structured data on the homepage (app/page.tsx). Edit here once and
// both stay in sync.
export const FAQ: [question: string, answer: string][] = [
  ['Is there a setup fee?', 'No. Loqara is self-serve — paste one line of code and you’re live. No onboarding invoice, ever.'],
  ['What counts as a conversation?', 'A single back-and-forth session between a visitor and your bot, however many messages it includes. Voice calls are billed separately as minutes.'],
  ['Do voice calls cost extra?', 'Yes — the voice agent is an add-on (€49/mo including ~200 minutes, then €0.20/min), because real-time voice is the only genuinely expensive part to run.'],
  ['Can I change or cancel anytime?', 'Yes. Upgrade, downgrade, or cancel whenever — changes take effect right away.'],
  ['What if I hit my conversation limit?', 'Nothing breaks. Extra conversations are billed per 1,000, or you can move up a plan.'],
  ['Which languages are supported?', 'English and Lithuanian out of the box, with more on the way — additional languages are included, not charged per language.'],
  ['Is there a free plan?', 'Yes — the Free plan gives you 100 conversations a month, one bot, and live human handoff, with no credit card required. Paid plans start at €149/mo and add more conversations, extra bots, all languages, lead capture, and order lookup as you grow.'],
]
