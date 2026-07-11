/**
 * One-time, idempotent LinkedIn content refresh for the owner board.
 * Run from the repository root with: node scripts/seed-linkedin-content.mjs
 */
import { config } from 'dotenv'
import { createClient } from '@supabase/supabase-js'
import { HASHTAGS } from './linkedin-hashtags.mjs'

config({ path: '.env.local' })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } },
)

const drafts = [
  {
    id: '27f065e1-6e79-4649-9c8f-13426b3bb6d4',
    title: 'A support bot should earn the right to keep talking',
    body: `One of the first tests I run on any support bot is deliberately unfair.

I ask about a damaged order, then add a detail that is not covered by the store policy.

Weak bots keep talking. They rephrase the same answer, sound increasingly confident, and quietly make the situation worse.

The rule I built into Loqara is simpler: answer when the source is strong. When it is not, say so and hand the conversation to a person with the transcript attached.

I would rather have an AI say “I need a colleague for this one” than invent a polished answer about someone else’s refund policy.

Knowing when to stop is part of being helpful. It is also how a store keeps the customer’s trust.`,
    link: 'https://www.loqara.com/blog/ai-chatbot-human-handoff',
    image_url: '/linkedin/01-human-handoff.png',
    image_alt: 'A warm orange conversation path passing cleanly from an AI chat bubble to a human support agent.',
  },
  {
    id: 'fa6dec03-f9f4-4b38-a454-a44d8f66e3d2',
    title: 'The hardest answer for an AI support agent is “I don’t know”',
    body: `When I started building Loqara, the impressive part was easy to demo.

Ask a product question. Get a fluent answer. Search the catalogue. Continue the conversation.

The harder work was making the agent reliably refuse to improvise.

A store cannot afford invented delivery dates, imaginary discounts, or a return policy assembled from general internet knowledge.

So Loqara answers from the store’s own sources: product data, knowledge pages, policies, and verified order information. If those sources do not support an answer, the agent says that clearly and offers the next useful step.

Fluency gets attention in a demo. Boundaries are what make the product safe enough for a real customer.`,
    link: 'https://www.loqara.com',
    image_url: '/linkedin/02-grounded-answer.png',
    image_alt: 'An AI answer anchored to verified product, policy, and order data blocks instead of an open internet cloud.',
  },
  {
    id: 'f670a481-b17a-4510-b42c-b9c8c1ba9f4a',
    title: 'The first time I spoke to our store widget, the interface disappeared',
    body: `I asked: “Do you have running shoes for wet weather in size 42?”

No search filters. No category menu. No careful keywords.

The agent understood the request, searched the catalogue, and answered out loud.

That was the moment voice stopped feeling like a novelty to me.

On mobile, typing a detailed product question is work. Speaking it is natural. Voice is especially useful when the customer is comparing products, has their hands busy, or does not know the exact product name.

It still needs the same discipline as text chat: real catalogue data, conversational context, and a clean handoff when the answer is uncertain.

Voice does not replace the store interface. It gives customers another way into it.`,
    link: 'https://www.loqara.com/blog/voice-ai-for-ecommerce-support',
    image_url: '/linkedin/03-voice-shopping.png',
    image_alt: 'A mobile store conversation turning a spoken request into three relevant running-shoe product results.',
  },
  {
    id: '45138260-6e18-482a-9e5a-800532c6ae3f',
    title: 'A small store does not need AI to answer everything',
    body: `It needs AI to remove the questions that interrupt the day without requiring judgment.

Where is my order?
Do you ship to Norway?
Is this available in size M?
What is the return window?

Each answer is small. The interruption is not.

For a founder or a tiny support team, ten two-minute questions rarely consume only twenty minutes. They break focus, reopen tabs, and pull attention away from fulfilment, merchandising, and customers with genuinely difficult problems.

That is the useful role for an AI agent: resolve the repetitive layer from real store data, then leave exceptions and sensitive cases to a person.

The goal is not a support inbox with no humans. It is a day with fewer avoidable interruptions.`,
    link: 'https://www.loqara.com/blog/reduce-support-tickets-with-ai',
    image_url: '/linkedin/04-repetitive-questions.png',
    image_alt: 'Repeated order, shipping, stock, and returns questions being cleared from a solo store owner’s crowded workday.',
  },
  {
    id: '0c374f60-2f73-491b-90e5-9a22648a5446',
    title: 'I stopped caring how many messages a chatbot handled',
    body: `“10,000 messages handled” looks excellent in a dashboard.

It can also hide a bad support experience.

A bot may send three replies to the same unresolved question and count every one. Volume rises while the customer gets nowhere.

The numbers I would rather see are:

• Did the customer resolve the issue without repeating themselves?
• How often did the agent admit it lacked enough information?
• Which conversations needed a human, and why?
• Did product conversations lead to useful clicks, leads, or orders?

Message volume tells you that the widget was busy. Resolution quality tells you whether it deserved to be.

Good analytics should make weak answers visible, not bury them under a large activity number.`,
    link: 'https://www.loqara.com/blog/chatbot-roi-metrics-that-matter',
    image_url: '/linkedin/05-support-metrics.png',
    image_alt: 'A clean analytics view replacing a large message-count vanity metric with resolution, fallback, handoff, and revenue signals.',
  },
  {
    id: '57764012-de66-49e0-8112-774e99556205',
    title: 'Contact forms ask for trust before they provide value',
    body: `Name. Email. Company. Phone. Message.

Then silence until someone replies.

That exchange makes sense for the business, but not always for the visitor. They came with a question and are asked to identify themselves before receiving anything useful.

A conversation can reverse the order.

Answer the product or service question first. Understand what the person needs. If the request needs follow-up, ask for an email in context and explain what happens next.

The lead is warmer because the visitor already received help, and the business gets the conversation that created the enquiry instead of a blank message field.

Lead capture works better when it feels like the next step in a useful exchange, not an entry fee.`,
    link: 'https://www.loqara.com/blog/capture-leads-with-conversational-chat',
    image_url: '/linkedin/06-conversational-lead.png',
    image_alt: 'A rigid five-field contact form transforming into a helpful conversation that naturally ends with an email handoff.',
  },
  {
    id: '6bb4b086-3d5f-4ae5-a9ed-ec99033ff333',
    title: 'A WooCommerce support setup should not become another plugin project',
    body: `WooCommerce gives store owners enormous flexibility.

It also makes it very easy to assemble support from six plugins that each know one small part of the customer.

One tool sees the FAQ. Another sees the catalogue. Someone checks the order manually. Product recommendations live somewhere else.

For Loqara, I wanted the integration to feel like one capability rather than another stack to maintain:

• search the live WooCommerce catalogue
• answer from the store’s actual policies and pages
• verify the customer before showing order status
• keep the context when the question changes

The store stays on WooCommerce. The owner keeps control. The support agent simply has access to the information it needs.`,
    link: 'https://www.loqara.com/blog/best-ai-chatbot-for-woocommerce',
    image_url: '/linkedin/07-woocommerce-stack.png',
    image_alt: 'A tangled stack of disconnected WooCommerce support plugins simplified into one connected customer conversation.',
  },
  {
    id: '4fd1af10-4cb3-4c90-a610-33eec5ff9c95',
    title: 'Five questions I would ask before putting any AI agent in front of customers',
    body: `A polished demo tells you very little about how an AI agent behaves on a difficult Tuesday afternoon.

I would test these five things with the store’s real data:

1. Ask something missing from the knowledge base. Does it admit the gap?
2. Change language halfway through. Does the conversation stay coherent?
3. Request someone else’s order. Does it verify identity before revealing anything?
4. Create a sensitive exception. Can it hand off without losing the transcript?
5. Challenge a product claim. Can you trace the answer back to a source?

The happy path is useful for a sales call. Edge cases reveal the actual product.

If an agent fails the first or third test, I would not connect it to live customers yet.`,
    link: 'https://www.loqara.com/blog/how-to-choose-ai-support-agent',
    image_url: '/linkedin/08-five-tests.png',
    image_alt: 'Five practical test cards for hallucination, language, order privacy, human handoff, and answer sources.',
  },
  {
    id: '968f7f5f-3e4a-4cb4-8bee-5decf401aff6',
    title: 'Gorgias can be the right tool and still be too much tool',
    body: `Gorgias is a serious helpdesk. For a larger support team that needs ticket routing, macros, agent management, and mature workflows, that depth is valuable.

But I keep thinking about the smaller store.

The owner mainly wants product questions answered, orders checked safely, repetitive tickets reduced, and leads captured when nobody is online.

They may not need an enterprise support operation around those jobs. They may also prefer predictable conversation limits over pricing tied to support volume or automated resolutions.

That narrower need is the space I am building Loqara for.

Choosing software is not about finding the longest feature list. It is about paying for the operating model you actually have.`,
    link: 'https://www.loqara.com/blog/gorgias-alternatives-for-ecommerce',
    image_url: '/linkedin/09-right-sized-support.png',
    image_alt: 'A small online store choosing a right-sized conversational support tool instead of an oversized enterprise control room.',
  },
  {
    id: '74c54440-2c79-418e-a255-4ff107a580e7',
    title: 'You can spot an FAQ widget after the second question',
    body: `Ask: “Which coffee machine is best for a small office?”

Then follow with: “What about one that is easier to clean?”

An FAQ widget often treats those as two unrelated searches. A conversational agent understands that “one” still means a coffee machine and that easy cleaning is now part of the same decision.

That continuity matters more than a flashy first answer.

For an online store, I think a useful agent should combine five things: the store’s own knowledge, live product data, verified order access, multilingual conversation, and a clear route to a human.

Without context, every follow-up makes the customer start again. With context, the interaction begins to feel like actual help.`,
    link: 'https://www.loqara.com/blog/conversational-ai-vs-chatbot',
    image_url: '/linkedin/10-context-memory.png',
    image_alt: 'Two connected customer follow-up questions about a coffee machine, contrasted with two disconnected FAQ search results.',
  },
  {
    id: '9095a072-057f-463d-a6a5-7c9d3121fa57',
    title: 'A Shopify chat widget should know what the storefront already knows',
    body: `The catalogue already contains product names, variants, prices, availability, and collections.

The order system already knows whether a parcel was fulfilled.

Yet many chat widgets sit on top of a Shopify store like a visitor. They can repeat an FAQ, but they cannot answer “Is the blue version available in M?” or continue with “When would it arrive?”

That disconnect is what I wanted to remove with Loqara.

The agent uses the store’s structured data during the conversation, verifies identity before order lookup, and keeps product context across follow-up questions.

The best support interface should not force the merchant to recreate information Shopify already has.`,
    link: 'https://www.loqara.com/blog/best-ai-chatbot-for-shopify',
    image_url: '/linkedin/11-shopify-context.png',
    image_alt: 'A Shopify catalogue and order timeline flowing directly into one contextual customer chat.',
  },
  {
    id: '10000000-0000-4000-8000-000000000012',
    title: 'The most expensive support question may be the simplest one',
    body: `“Where is my order?” rarely needs judgment.

It does require a person to find the order, verify the customer, read the fulfilment status, and write back. Repeat that across a busy week and a simple question becomes a large block of fragmented work.

The automation is only useful if it protects the customer’s data.

In Loqara, order lookup is not an open search box. The customer provides the order reference and matching email, then the agent retrieves the status from the connected store.

The answer can arrive immediately, outside office hours, without exposing another customer’s order.

This is the kind of AI use case I like most: boring, frequent, measurable, and safer when the boundaries are designed properly.`,
    link: 'https://www.loqara.com/blog/where-is-my-order-ai',
    image_url: '/linkedin/12-order-status.png',
    image_alt: 'A secure order reference and email check leading to a clear delivery timeline in a customer chat.',
  },
  {
    id: '10000000-0000-4000-8000-000000000013',
    title: 'Lithuanian customer support exposes weak “multilingual” AI quickly',
    body: `A system can translate words into Lithuanian and still sound wrong.

The awkwardness appears in follow-up questions, product names, polite forms, and the moment a customer mixes English terminology into a Lithuanian sentence.

Building Loqara from Lithuania made this impossible to treat as a checkbox.

The agent needs to understand what the customer means, keep the conversation in the language they chose, and avoid drifting into another language because the product data happens to be written there.

For a local store, natural Lithuanian is not a bonus feature. It is the difference between a tool that feels imported and one a customer is willing to keep talking to.

Multilingual support should preserve the conversation, not merely translate each message.`,
    link: 'https://www.loqara.com/blog/multilingual-ai-customer-support',
    image_url: '/linkedin/13-lithuanian-language.png',
    image_alt: 'A natural Lithuanian customer conversation staying coherent while product data contains mixed international terms.',
  },
  {
    id: '10000000-0000-4000-8000-000000000014',
    title: 'An AI agent becomes useless when every conversation feels expensive',
    body: `Store owners should not have to ration a support tool.

If every extra conversation creates anxiety about a surprise bill, the agent gets hidden on low-traffic pages or switched off before a campaign.

I designed Loqara’s paid plans around generous monthly conversation limits, from 1,500 to 12,000 depending on the plan.

The intention is simple: let the agent do the repetitive work every day, not only during a carefully controlled trial.

Pricing still needs sensible boundaries because AI has real operating costs. But those boundaries should match how a store actually uses support: uneven traffic, campaign spikes, seasonal questions, and plenty of short conversations.

Useful software should invite use. It should not make the owner watch a meter after every customer.`,
    link: 'https://www.loqara.com/blog/how-much-does-ai-chatbot-cost',
    image_url: '/linkedin/14-generous-limits.png',
    image_alt: 'A clear monthly conversation allowance absorbing normal traffic and campaign spikes without a stressful per-message meter.',
  },
  {
    id: '10000000-0000-4000-8000-000000000015',
    title: 'Many abandoned carts are unanswered questions in disguise',
    body: `A customer adds a product, pauses, and leaves.

Analytics records an abandoned cart. It does not record the question that caused it.

Will this fit?
Does it work with the model I own?
Can it arrive before Friday?
What happens if I need to return it?

A discount pop-up assumes the problem is price. Sometimes the customer simply needed confidence.

That is where conversational product support can help: answer from the catalogue and policies while the decision is still happening, remember the product under discussion, and ask a useful clarification instead of immediately offering 10% off.

Not every abandoned cart is recoverable. But a store should at least have a way to hear the question before the tab closes.`,
    link: 'https://www.loqara.com/blog/recover-abandoned-carts-ai-chatbot',
    image_url: '/linkedin/15-cart-question.png',
    image_alt: 'An abandoned shopping cart revealing hidden questions about fit, compatibility, delivery, and returns.',
  },
  {
    id: '10000000-0000-4000-8000-000000000016',
    title: 'Customer support AI needs a privacy model, not just a privacy page',
    body: `The risky moment is not when a chatbot answers an FAQ.

It is when the conversation touches an order, an email address, a phone number, or a support history.

Privacy has to shape the product behaviour:

• verify identity before revealing order information
• collect only the contact details needed for follow-up
• keep store data scoped to the correct bot and organisation
• make human access intentional and auditable
• avoid training vague global knowledge from private customer conversations

A GDPR page is necessary, but it cannot compensate for careless product design.

The safest answer is often not “our AI is secure.” It is showing exactly what data the feature uses, when it uses it, and what it refuses to reveal.`,
    link: 'https://www.loqara.com/blog/ai-chatbot-gdpr-data-privacy',
    image_url: '/linkedin/16-privacy-by-design.png',
    image_alt: 'A customer conversation protected by identity verification, scoped store data, minimal contact capture, and controlled human access.',
  },
  {
    id: '10000000-0000-4000-8000-000000000017',
    title: 'Small stores need less support software and more support capacity',
    body: `An enterprise helpdesk helps a team coordinate work.

A small store often has a different problem: there is barely a team to coordinate.

The founder answers email between fulfilment tasks. The marketing person also handles returns. Nobody wants to configure queues, routing rules, and dozens of agent seats before the first question is resolved.

For that store, AI should create capacity directly:

Answer common questions from real sources. Help customers navigate products. Check orders safely. Capture a lead. Escalate the exception.

This is why I keep Loqara deliberately focused on customer conversations rather than rebuilding every feature of a large helpdesk.

The product should fit the team that exists today, not the support department the store may have in five years.`,
    link: 'https://www.loqara.com/blog/ai-customer-service-small-stores',
    image_url: '/linkedin/17-small-store-capacity.png',
    image_alt: 'A solo store operator gaining breathing room as routine customer conversations are resolved beside their fulfilment work.',
  },
  {
    id: '10000000-0000-4000-8000-000000000018',
    title: 'The worst time to test support automation is during the campaign',
    body: `A traffic spike does not only create more orders.

It creates more pre-sale questions, more address changes, more “where is my order?” messages, and more exceptions arriving at once.

If a store wants an AI agent for Black Friday or another large campaign, I would prepare it before the ads start:

1. Refresh delivery, returns, and campaign policies.
2. Test the ten most common product questions.
3. Verify order lookup with real edge cases.
4. Decide exactly when a human should take over.
5. Watch early conversations and fix weak sources quickly.

Automation magnifies the quality of its preparation.

Campaign day should be the moment the system absorbs pressure, not the first time anyone discovers what it says to customers.`,
    link: 'https://www.loqara.com/blog/black-friday-ai-agent',
    image_url: '/linkedin/18-campaign-readiness.png',
    image_alt: 'A five-step support readiness checklist completed before a sharp Black Friday traffic spike.',
  },
  {
    id: '10000000-0000-4000-8000-000000000019',
    title: 'ChatGPT is a model. Customer support is a system.',
    body: `A good language model can write a convincing answer.

That is only one part of serving a real customer.

The system around the model still has to retrieve the correct store policy, search current products, protect order data, keep conversation context, measure failures, and hand sensitive cases to a person.

Without that system, a general chatbot is being asked to guess its way through operational work.

I use OpenAI models inside Loqara, but the product is the surrounding discipline: what context is supplied, which tools can be called, what data is allowed, how uncertainty is handled, and what the merchant can review.

The model makes conversation possible. The product design makes the conversation dependable.`,
    link: 'https://www.loqara.com/blog/chatgpt-for-customer-service',
    image_url: '/linkedin/19-model-vs-system.png',
    image_alt: 'A language model at the centre of a wider support system containing store knowledge, tools, privacy controls, analytics, and human handoff.',
  },
  {
    id: '10000000-0000-4000-8000-000000000020',
    title: '“One line of code” took much more than one line of work',
    body: `The installation goal for Loqara was simple: paste one script into the site and get a working customer conversation.

Making the merchant experience that small required moving complexity somewhere else.

The loader has to stay fast, avoid blocking the storefront, open the right bot, respect allowed domains, work across page navigation, and keep the chat isolated from the store’s CSS.

Then the hard product work begins behind it: knowledge ingestion, catalogue tools, language handling, order privacy, usage limits, and handoff.

I like this kind of engineering trade-off.

The customer should not have to understand the architecture to receive its benefit. A small installation surface is not evidence that the product is simple. It is evidence that the complexity has been organised.`,
    link: 'https://www.loqara.com/blog/ai-chatbot-for-online-store',
    image_url: '/linkedin/20-one-line-install.png',
    image_alt: 'A single lightweight website script opening into a carefully organised architecture of knowledge, commerce, privacy, languages, and handoff.',
  },
]

const ideas = [
  {
    id: '20000000-0000-4000-8000-000000000001',
    title: 'A respectful teardown of one frustrating store chatbot',
    body: 'Record an anonymised three-question test, show exactly where context breaks, then explain the smallest product change that would improve it.',
  },
  {
    id: '20000000-0000-4000-8000-000000000002',
    title: 'What onboarding the first real Loqara customer changes',
    body: 'A founder diary covering the assumptions that survived contact with a live store, the unexpected setup work, and the feature that mattered most.',
  },
  {
    id: '20000000-0000-4000-8000-000000000003',
    title: 'A transparent monthly build report',
    body: 'Share shipped improvements, conversations handled, one metric that disappointed, one customer lesson, and the next month’s bet.',
  },
  {
    id: '20000000-0000-4000-8000-000000000004',
    title: 'Before and after: the source that fixed a weak AI answer',
    body: 'Show an actual low-quality response, the missing knowledge-base sentence, and the grounded answer after re-ingestion.',
  },
  {
    id: '20000000-0000-4000-8000-000000000005',
    title: 'The seven customer questions hiding inside support logs',
    body: 'Build a taxonomy from real anonymised conversations: discovery, comparison, compatibility, policy, order, exception, and lead intent.',
  },
  {
    id: '20000000-0000-4000-8000-000000000006',
    title: 'What a solo founder should automate last',
    body: 'A contrarian post about keeping customer interviews, sensitive complaints, and early sales conversations human for longer.',
  },
  {
    id: '20000000-0000-4000-8000-000000000007',
    title: 'Lithuanian phrases that expose literal machine translation',
    body: 'Use three harmless support examples to show the difference between translated grammar and a natural local conversation.',
  },
  {
    id: '20000000-0000-4000-8000-000000000008',
    title: 'How I would price Loqara if every customer used it differently',
    body: 'Explain the trade-offs between per-message, per-resolution, seat-based, and generous conversation-limit pricing from a builder’s perspective.',
  },
  {
    id: '20000000-0000-4000-8000-000000000009',
    title: 'The anatomy of a safe order lookup',
    body: 'A visual technical walkthrough from customer message to identity check, commerce connector, scoped response, and audit trail.',
  },
  {
    id: '20000000-0000-4000-8000-000000000010',
    title: 'The bug that made the widget look smarter but less trustworthy',
    body: 'Tell a concrete engineering failure story: what users saw, the tempting patch, the root cause, and the guardrail added afterwards.',
  },
]

// Recommended publishing order for the draft column (front of the list posts
// first). Kept as an explicit id list so the drafts above can be authored in any
// order — this list, not array position, defines the board sequence.
const DRAFT_ORDER = [
  'fa6dec03-f9f4-4b38-a454-a44d8f66e3d2', // The hardest answer is "I don't know" (grounded)
  '10000000-0000-4000-8000-000000000020', // "One line of code" took much more than one line of work
  '27f065e1-6e79-4649-9c8f-13426b3bb6d4', // A support bot should earn the right to keep talking (handoff)
  '10000000-0000-4000-8000-000000000012', // The most expensive support question (WISMO)
  '0c374f60-2f73-491b-90e5-9a22648a5446', // I stopped caring how many messages (ROI metrics)
  '45138260-6e18-482a-9e5a-800532c6ae3f', // A small store does not need AI to answer everything
  'f670a481-b17a-4510-b42c-b9c8c1ba9f4a', // The first time I spoke to our store widget (voice)
  '74c54440-2c79-418e-a255-4ff107a580e7', // You can spot an FAQ widget (conversational vs chatbot)
  '57764012-de66-49e0-8112-774e99556205', // Contact forms ask for trust (lead capture)
  '4fd1af10-4cb3-4c90-a610-33eec5ff9c95', // Five questions before putting AI in front of customers
  '968f7f5f-3e4a-4cb4-8bee-5decf401aff6', // Gorgias can be the right tool and still be too much tool
  '10000000-0000-4000-8000-000000000019', // ChatGPT is a model. Customer support is a system.
  '9095a072-057f-463d-a6a5-7c9d3121fa57', // A Shopify chat widget should know the storefront
  '6bb4b086-3d5f-4ae5-a9ed-ec99033ff333', // A WooCommerce support setup (platform)
  '10000000-0000-4000-8000-000000000014', // An AI agent becomes useless when conversations feel expensive
  '10000000-0000-4000-8000-000000000013', // Lithuanian customer support exposes weak multilingual AI
  '10000000-0000-4000-8000-000000000016', // Customer support AI needs a privacy model (GDPR)
  '10000000-0000-4000-8000-000000000017', // Small stores need less software, more support capacity
  '10000000-0000-4000-8000-000000000015', // Many abandoned carts are unanswered questions
  '10000000-0000-4000-8000-000000000018', // The worst time to test automation is the campaign (Black Friday — seasonal, last)
]

// Guard: every draft must have an explicit rank, or the board order silently breaks.
for (const post of drafts) {
  if (!DRAFT_ORDER.includes(post.id)) {
    throw new Error(`Draft ${post.id} ("${post.title}") is missing from DRAFT_ORDER`)
  }
}

const now = new Date().toISOString()
const rows = [
  ...drafts.map((post) => ({
    ...post,
    body: HASHTAGS[post.id] ? `${post.body}\n\n${HASHTAGS[post.id]}` : post.body,
    status: 'draft',
    sort_order: DRAFT_ORDER.indexOf(post.id),
    posted_at: null,
    updated_at: now,
  })),
  ...ideas.map((post, index) => ({
    ...post,
    link: null,
    image_url: null,
    image_alt: null,
    status: 'idea',
    sort_order: index,
    posted_at: null,
    updated_at: now,
  })),
]

const { error } = await supabase.from('linkedin_posts').upsert(rows, { onConflict: 'id' })
if (error) throw error

const { data: counts, error: countError } = await supabase
  .from('linkedin_posts')
  .select('status')
if (countError) throw countError

const summary = counts.reduce((result, row) => {
  result[row.status] = (result[row.status] ?? 0) + 1
  return result
}, {})

console.log(JSON.stringify(summary))
