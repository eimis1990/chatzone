// Add or edit Q&As here — the section renders whatever's in this list.
const FAQ: [string, string][] = [
  ['Is there a setup fee?', 'No. Loqara is self-serve — paste one line of code and you’re live. No onboarding invoice, ever.'],
  ['What counts as a conversation?', 'A single back-and-forth session between a visitor and your bot, however many messages it includes. Voice calls are billed separately as minutes.'],
  ['Do voice calls cost extra?', 'Yes — the voice agent is an add-on (€49/mo including ~200 minutes, then €0.20/min), because real-time voice is the only genuinely expensive part to run.'],
  ['Can I change or cancel anytime?', 'Yes. Upgrade, downgrade, or cancel whenever — changes take effect right away.'],
  ['What if I hit my conversation limit?', 'Nothing breaks. Extra conversations are billed per 1,000, or you can move up a plan.'],
  ['Which languages are supported?', 'English and Lithuanian out of the box, with more on the way — additional languages are included, not charged per language.'],
  ['Is it really free right now?', 'Yes. Loqara is free while we’re in early access — you won’t be charged until billing launches, and we’ll give plenty of notice.'],
]

export function Faq() {
  return (
    <section id="faq" className="scroll-mt-20 bg-white">
      <div className="mx-auto max-w-3xl px-5 py-20">
        <h2 className="text-center text-3xl font-semibold tracking-tight text-gray-900 sm:text-4xl">
          Frequently asked questions
        </h2>
        <div className="mt-10 divide-y divide-gray-200 border-y border-gray-200">
          {FAQ.map(([q, a]) => (
            <div key={q} className="py-5">
              <h3 className="font-semibold text-gray-900">{q}</h3>
              <p className="mt-2 text-sm leading-relaxed text-gray-600">{a}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
