/**
 * September 2026 founder-led LinkedIn slate.
 *
 * Four entries deliberately develop existing board ideas. Their IDs stay stable so
 * applying the slate promotes those ideas to drafts instead of creating duplicates.
 */
export const SEPTEMBER_2026_LINKEDIN_POSTS = [
  {
    id: '20000000-0000-4000-8000-000000000002',
    title: 'A real store changed my definition of “done”',
    body: `For months, I thought a feature was done when it worked in the demo.

Then I put it in front of a real store.

Real catalogues contain inconsistent attributes. Policies have exceptions. Product pages mix languages. Customers say “the second one” after seeing four products and expect the system to remember what they mean.

None of that looks dramatic in a launch video. All of it decides whether the product is useful.

Working with a live store changed my definition of done:

• the answer survives messy source data
• product context survives the follow-up
• the live widget behaves like the preview
• failure leaves the customer with a useful next step

The interesting AI work is rarely the first impressive answer. It is everything required to make the hundredth ordinary answer dependable.

The demo proves the idea. A real customer reveals the product.

#BuildInPublic #SaaS #CustomerExperience`,
    link: 'https://www.loqara.com',
    image_url: '/linkedin/31-real-store-definition-of-done.webp',
    image_alt: 'A pristine miniature demo storefront opening into a richly detailed real shop full of varied products, paths, and edge cases.',
    pillar: 'Founder notes',
  },
  {
    id: '20000000-0000-4000-8000-000000000010',
    title: 'The bug was not a crash. It was amnesia.',
    body: `A customer asked a question in the store widget, opened another product page, and came back.

The widget had forgotten everything.

Nothing technically crashed. The page loaded. The launcher appeared. A new chat could begin.

But from the customer’s point of view, the store had asked them to repeat themselves simply because they walked into another aisle.

We fixed Loqara so a recent conversation can continue across page navigation. The transcript returns, the context remains, and “what about this one?” still belongs to the same shopping journey.

It was a small engineering change compared with the AI work around it. It may be more noticeable to a customer than a model upgrade.

Reliability is often like that.

The worst product bugs do not always produce an error message. Sometimes they quietly make the customer do the work again.

#ProductDesign #CustomerExperience #BuildInPublic`,
    link: 'https://www.loqara.com',
    image_url: '/linkedin/32-bug-was-amnesia.webp',
    image_alt: 'A continuous orange conversation ribbon passes through several storefront rooms while a broken duplicate ribbon fades away.',
    pillar: 'Founder notes',
  },
  {
    id: '40000000-0000-4000-8000-000000000033',
    title: 'A product recommendation without a reason is just an ad',
    body: `“Here are four products you may like” is not advice.

It is a shelf placed inside a chat window.

A useful recommendation should make its reasoning visible:

• this one fits the dimensions you gave
• this option is quieter, but more expensive
• this model is compatible with what you already own
• I excluded the others because they cannot arrive in time

The explanation matters for two reasons.

First, it gives the customer something they can check. Second, it makes a wrong assumption easier to correct: “Actually, price matters more than noise.”

AI can make product discovery feel personal, but personal should not mean mysterious.

The goal is not to place more products in front of someone. It is to help them understand why one option fits their situation better than another.

Recommendation without reasoning is promotion. Recommendation with reasoning can become service.

#Ecommerce #ProductDiscovery #CustomerExperience`,
    link: 'https://www.loqara.com/blog/semantic-search-ecommerce',
    image_url: '/linkedin/33-recommendation-needs-a-reason.webp',
    image_alt: 'Four sculptural products stand on a shelf while one is connected to the shopper by a clear trail of matching clues.',
    pillar: 'Ecommerce observations',
  },
  {
    id: '40000000-0000-4000-8000-000000000034',
    title: 'Your zero-result searches are trying to tell you something',
    body: `A zero-result search is usually treated as a dead end.

I think it is closer to a tiny piece of market research.

Someone searched for a walnut desk under 120 cm. A replacement filter for a discontinued machine. A jacket for warm rain. A delivery promise before Friday.

The store may not have the answer today, but the question still contains intent.

One search proves very little. A pattern can reveal:

• a missing product or variant
• an attribute customers use but the catalogue ignores
• demand the buying team has not seen
• a product that exists but is described badly

This is why I have become interested in unresolved demand, not only resolved conversations.

Good ecommerce software should not merely say “nothing found.” It should help the merchant learn what people repeatedly wanted to find.

Sometimes the most valuable result is the gap itself.

#Ecommerce #Merchandising #CustomerInsights`,
    link: 'https://www.loqara.com',
    image_url: '/linkedin/34-zero-result-signal.webp',
    image_alt: 'An empty search shelf casts a vivid shadow shaped like the missing product, with repeated shopper paths gathering around it.',
    pillar: 'Ecommerce observations',
  },
  {
    id: '40000000-0000-4000-8000-000000000035',
    title: 'The fastest reply is not always the fastest resolution',
    body: `A support system can respond in one second and still waste ten minutes.

It happens when the first answer is generic, the second asks for information the customer already gave, and the third sends them to a page they have already read.

Response time measures when the system started talking.

Resolution time measures when the customer could move forward.

Those are not the same thing.

For an AI agent, I would rather wait a little longer for the system to retrieve the correct policy, check the relevant product, and preserve the conversation than celebrate a fast first token that creates another round trip.

Speed matters. People should not stare at a typing indicator while nothing useful happens.

But the unit of progress is not a message. It is a decision, an answer, or a clean handoff.

Optimise the time to usefulness, not merely the time to sound alive.

#CustomerSupport #CustomerExperience #AI`,
    link: 'https://www.loqara.com/blog/chatbot-roi-metrics-that-matter',
    image_url: '/linkedin/35-fast-reply-slow-resolution.webp',
    image_alt: 'A fast orange messenger races in circles while a quieter direct path reaches a clearly resolved destination.',
    pillar: 'Responsible AI',
  },
  {
    id: '40000000-0000-4000-8000-000000000036',
    title: 'A customer should not need prompt-engineering skills to shop',
    body: `If a customer has to learn the system’s preferred wording, the interface has failed.

People do not arrive at an online store with perfect product names and database filters.

They say:

“I need something for a small, dark room.”
“Will this work with the older model?”
“Show me the same thing, but easier to clean.”

That is not poor prompting. It is normal human language.

A useful shopping assistant should ask for the one missing constraint, keep context across the follow-up, and translate the request into catalogue attributes behind the scenes.

We should not make customers speak like a search index to compensate for weak retrieval.

The best conversational interface does not teach people how to talk to AI. It does the harder work of understanding how people already talk when they are uncertain, comparing options, and trying to make a decision.

#Ecommerce #ConversationalAI #UX`,
    link: 'https://www.loqara.com/blog/conversational-ai-vs-chatbot',
    image_url: '/linkedin/36-no-prompt-engineering.webp',
    image_alt: 'A natural handwritten-style speech ribbon flows through a complex hidden machine and emerges as a neatly matched set of products.',
    pillar: 'Responsible AI',
  },
  {
    id: '20000000-0000-4000-8000-000000000003',
    title: 'August build report: the invisible work mattered most',
    body: `August did not produce one dramatic Loqara launch.

It produced several changes that make the product behave more like customers expect:

• conversations now continue when a shopper moves between store pages
• the mobile chat sheet behaves properly around the iPhone keyboard and page zoom
• merchants can see product suggestions and the clicks that follow them
• Messenger moved from “coming soon” to a real, entitlement-gated connection flow
• the chat path moved closer to the European database and the slow product matcher was rebuilt

This is the kind of month that looks modest in a feature list and important in daily use.

The theme was continuity: keep the conversation, keep the interface stable, keep the data useful, and remove the pauses customers should never have to understand.

Building a customer-facing AI product is increasingly less about making it say something clever.

It is about making the whole system feel dependable.

#BuildInPublic #SaaS #ProductDevelopment`,
    link: 'https://www.loqara.com',
    image_url: '/linkedin/37-august-build-report.webp',
    image_alt: 'Five carefully crafted mechanisms click into one calm, reliable storefront machine under warm studio light.',
    pillar: 'Founder notes',
  },
  {
    id: '40000000-0000-4000-8000-000000000038',
    title: 'The best demo starts with the question you hope nobody asks',
    body: `Most AI demos begin with the happiest possible question.

The answer exists in the knowledge base. The product is in stock. The wording matches the prompt used during testing.

Everything looks excellent.

I would rather begin here:

“Your policy does not cover my situation. What happens now?”

That question reveals much more.

Does the system invent a rule? Does it repeat the nearest paragraph? Does it admit the gap? Can it collect the right context and hand the case to a person without making the customer start again?

The failure path is not an embarrassing corner of the product. In customer service, it is part of the main experience.

A polished happy path shows what the AI can do.

A calm, useful failure path shows whether the team understood what it should not do.

That is the demo I trust.

#ResponsibleAI #CustomerSupport #ProductDesign`,
    link: 'https://www.loqara.com/blog/how-to-choose-ai-support-agent',
    image_url: '/linkedin/38-demo-the-hard-question.webp',
    image_alt: 'A bright demo stage turns toward one dark unknown doorway where a safe bridge and human handoff are clearly prepared.',
    pillar: 'Responsible AI',
  },
  {
    id: '40000000-0000-4000-8000-000000000039',
    title: 'Product pages should be written with support conversations open',
    body: `A product page is usually written before anyone sees how customers misunderstand it.

Support conversations arrive afterwards with the missing vocabulary.

Customers ask whether “compact” means it fits under a specific shelf. Whether “water resistant” survives a commute in heavy rain. Whether the cable shown in the photo is included. Whether two nearly identical models work together.

Those questions are not interruptions to the product content process.

They are the research phase that happened late.

The strongest loop I can imagine is simple:

1. collect repeated questions
2. identify the exact page that created the uncertainty
3. improve the specification, photo, comparison, or policy
4. watch whether the question disappears

A support inbox contains a language guide written by customers.

Merchandising teams should read it before writing the next product page—and while rewriting the current one.

#Ecommerce #ContentDesign #CustomerExperience`,
    link: 'https://www.loqara.com/blog/ecommerce-ai-chatbot-knowledge-base',
    image_url: '/linkedin/39-write-pages-from-questions.webp',
    image_alt: 'Customer question ribbons reshape a plain product page into a clear, richly detailed and useful product story.',
    pillar: 'Ecommerce observations',
  },
  {
    id: '40000000-0000-4000-8000-000000000040',
    title: 'I would rather ship an honest “not yet”',
    body: `There is a strong temptation in early-stage software to make every unfinished feature look almost available.

A disabled button. A “coming soon” badge. A sales sentence written as if the last ten percent were only polish.

But the last ten percent is often authentication, billing, failure recovery, permissions, or the edge case that protects customer data.

That is not polish.

It is the feature.

I have become more comfortable saying “not yet” when a capability works in a controlled test but is not ready for a customer to depend on.

An honest gap creates less excitement today. It also creates less cleanup tomorrow.

Shipping quickly still matters. The trick is to separate a reversible experiment from a promise made inside someone else’s business.

I would rather lose a little momentum than train customers to translate “available” into “available if nothing unusual happens.”

#SaaS #BuildInPublic #ProductManagement`,
    link: null,
    image_url: '/linkedin/40-honest-not-yet.webp',
    image_alt: 'A beautiful unfinished bridge stops safely at a clear boundary while rushed decorative pieces fall away beyond it.',
    pillar: 'Founder notes',
  },
  {
    id: '40000000-0000-4000-8000-000000000041',
    title: 'Small stores face enterprise-sized expectations',
    body: `Customers do not lower their expectations because a store has three employees.

They still expect a clear delivery promise, accurate stock, a safe checkout, a quick answer, and someone to take responsibility when things go wrong.

The difference is that a small store has far less operational slack.

The person updating products may also be packing orders. The founder may answer support between supplier calls. One confusing policy can create twenty interruptions for the same tiny team.

This is why I think small-business software should reduce coordination, not introduce a miniature version of enterprise bureaucracy.

Give the team one useful view. Automate the predictable steps. Preserve context. Make exceptions obvious. Keep setup proportional to the problem.

Small stores do not need smaller ambitions.

They need tools designed for the reality that the same person is often the strategy, operations, and support department before lunch.

#SmallBusiness #Ecommerce #CustomerExperience`,
    link: 'https://www.loqara.com/blog/ai-customer-service-small-stores',
    image_url: '/linkedin/41-enterprise-expectations-small-team.webp',
    image_alt: 'A tiny three-person shop calmly carries a large constellation of customer expectations using one elegantly balanced tool.',
    pillar: 'Small business',
  },
  {
    id: '40000000-0000-4000-8000-000000000042',
    title: 'One useful question can beat five plausible answers',
    body: `When a shopper asks for “the best office chair,” an AI system has two choices.

It can confidently produce a list.

Or it can ask what “best” means here.

Long hours or occasional use? A small desk or a dedicated office? Back support, compact size, material, or budget? Delivery this week or no deadline?

The second approach may feel slower because the system does not answer immediately.

It is usually faster than giving five plausible options built on assumptions the customer never made.

Clarifying questions are sometimes treated as a weakness—as if intelligence means knowing without asking.

In real service, asking well is part of knowing.

The goal is not to minimise turns at any cost. It is to make every turn reduce uncertainty.

One relevant question can create a better recommendation than a page of fluent guesses.

#ConversationalAI #Ecommerce #CustomerExperience`,
    link: 'https://www.loqara.com/blog/semantic-search-ecommerce',
    image_url: '/linkedin/42-one-question-beats-five-answers.webp',
    image_alt: 'Five hazy product paths collapse into one clear route after a single bright question lens reveals the shopper constraint.',
    pillar: 'Responsible AI',
  },
  {
    id: '40000000-0000-4000-8000-000000000043',
    title: 'A chatbot should be willing to send the customer back to the page',
    body: `A chat window should not become a tiny internet inside the internet.

Sometimes the best answer is a short explanation followed by the exact place where the customer can verify, compare, or complete the task.

Show the relevant product. Open the size guide. Link to the delivery boundary. Take the shopper to checkout with the correct variant selected.

The conversation should remove uncertainty, not trap the whole journey in bubbles.

This also creates a useful standard for AI answers:

Can the system point to something real outside its own prose?

An answer linked to the actual product or policy is easier to trust, easier to check, and easier to act on than a long paragraph that asks the customer to believe the interface.

Good conversational design knows when to talk.

Great conversational design also knows when the page, product card, form, or human is the better next interface.

#UX #ConversationalAI #Ecommerce`,
    link: 'https://www.loqara.com/blog/ai-chatbot-for-online-store',
    image_url: '/linkedin/43-chat-should-open-the-page.webp',
    image_alt: 'A warm conversation bubble opens like a doorway onto a detailed product page instead of enclosing the shopper.',
    pillar: 'Product design',
  },
  {
    id: '40000000-0000-4000-8000-000000000044',
    title: 'The database can make the AI look slow',
    body: `When an AI answer feels slow, the model is the obvious suspect.

In our case, a large part of the delay lived elsewhere.

The server was too far from the database. Product matching spilled into expensive database work. Independent checks waited for one another. The model was only one participant in a much longer relay race.

We moved the chat functions closer to the European database, ran independent reads together, and rebuilt the slow matching path.

The lesson was useful: customers experience one wait, even when engineers can divide it into six services.

Performance work on AI products should measure the entire path:

message → retrieval → permissions → tools → model → response

Changing the model may help. It may also optimise the only part everyone can see while leaving the real bottleneck untouched.

Latency is a product experience and a systems problem before it is a model benchmark.

#AIEngineering #SaaS #BuildInPublic`,
    link: 'https://www.loqara.com',
    image_url: '/linkedin/44-database-makes-ai-slow.webp',
    image_alt: 'A glowing AI prism waits in a relay race while a distant database and tangled matching track create the real bottleneck.',
    pillar: 'Founder notes',
  },
  {
    id: '40000000-0000-4000-8000-000000000045',
    title: 'Brand voice should shape the answer, not the facts',
    body: `A warm brand can sound warm. A playful brand can sound playful. A technical brand can be precise without becoming cold.

But tone should never change what the system is willing to claim.

“I’m sure it will arrive tomorrow 😊” is not better service when the delivery source does not support it.

The safe order is:

1. establish what the store data actually says
2. decide what uncertainty must remain visible
3. express that answer in the brand’s voice

Many AI demos reverse this. They optimise personality first because personality is immediately visible.

Evidence, permissions, and refusal rules are less charming in a demo. They matter more in a real conversation.

A brand voice can make a truthful answer feel recognisable.

It should never make an unsupported answer feel trustworthy.

#BrandExperience #ResponsibleAI #CustomerSupport`,
    link: 'https://www.loqara.com/blog/how-to-choose-ai-support-agent',
    image_url: '/linkedin/45-voice-not-facts.webp',
    image_alt: 'One solid fact-shaped core wears several expressive outer textures while its underlying form remains unchanged.',
    pillar: 'Responsible AI',
  },
  {
    id: '40000000-0000-4000-8000-000000000046',
    title: '“Add AI” is not a customer-experience strategy',
    body: `“We should add AI” begins with a technology and searches for a problem.

I think the better conversation begins with a moment of friction.

Where does a customer stop?
What information do they lack?
Which answer is repeated every day?
Which decision requires judgment?
What happens when the source is incomplete?

Only then does it make sense to choose the interface.

The answer may be AI. It may also be a clearer product page, a better confirmation email, a simpler return rule, or a human callback at the right moment.

This is not an argument against AI. I am building an AI product.

It is an argument for giving the technology a precise job and a visible boundary.

Customers do not experience your innovation roadmap. They experience whether the next step became easier.

#CustomerExperience #ProductStrategy #AI`,
    link: null,
    image_url: '/linkedin/46-add-ai-not-strategy.webp',
    image_alt: 'A shiny AI-shaped puzzle piece hovers beside a customer journey until one precise gap is identified for it.',
    pillar: 'Strategy',
  },
  {
    id: '40000000-0000-4000-8000-000000000047',
    title: 'A product suggestion is not useful because it was shown',
    body: `An AI agent suggested a product.

That sounds like success until you ask what happened next.

Did the customer open it? Compare it? Return to the conversation? Add it to the cart? Ignore all four suggestions and rephrase the question?

We recently added product-suggestion and click visibility to Loqara’s analytics because “products shown” is only an output count.

The click is not a perfect outcome either. It does not prove satisfaction or revenue.

But it is a more honest signal that the recommendation was relevant enough to deserve attention.

AI analytics can become flattering very quickly: answers generated, messages handled, products displayed.

Useful analytics should make it possible to discover that the system talked a lot and influenced very little.

Measure the customer’s next move, not only the system’s last action.

#ProductAnalytics #Ecommerce #AI`,
    link: 'https://www.loqara.com/blog/chatbot-roi-metrics-that-matter',
    image_url: '/linkedin/47-suggestion-versus-click.webp',
    image_alt: 'Many product cards float past unnoticed while one earns a clear shopper path and deliberate click.',
    pillar: 'Product analytics',
  },
  {
    id: '40000000-0000-4000-8000-000000000048',
    title: 'A feature is not finished when it works in preview',
    body: `Preview environments are generous.

They use clean data, a known route, a signed-in owner, and the exact sequence the builder expects.

The live store adds a different domain, a lazy loader, page navigation, customer privacy, mobile keyboards, caching, network failures, and whatever CSS the theme accumulated over five years.

We have fixed several Loqara bugs that existed because preview and live chat are separate paths.

Each one reinforced the same rule: parity has to be tested, not assumed.

For every customer-facing capability, I now want the same question answered twice:

Does it work in the configurator?
Does it work from the actual storefront a customer will use?

Preview proves that the feature can work.

Production proves that the product can carry it through the real environment around it.

Those are different tests—and “done” needs both.

#QualityEngineering #SaaS #BuildInPublic`,
    link: 'https://www.loqara.com',
    image_url: '/linkedin/48-preview-is-not-production.webp',
    image_alt: 'A pristine glass preview cube sits beside a lively real storefront filled with browsers, devices, networks, and edge cases.',
    pillar: 'Founder notes',
  },
  {
    id: '20000000-0000-4000-8000-000000000005',
    title: 'The seven jobs hiding inside “customer support”',
    body: `“Customer support” sounds like one category of work.

Store conversations usually contain at least seven different jobs:

1. Discovery — help me find the right thing.
2. Comparison — explain the trade-off between these options.
3. Compatibility — will this work with what I own?
4. Policy — what are the delivery or return rules?
5. Order — what is happening with my purchase?
6. Exception — my situation does not fit the normal rule.
7. Intent — I am interested, but I need a person to follow up.

Treating all seven as FAQ retrieval produces a disappointing chatbot.

They need different sources, tools, permissions, questions, and escalation rules.

Discovery may need catalogue search. An order question needs identity verification. An exception may need a human immediately.

Before automating support, map the job inside the message.

The same chat box can hide very different work.

#CustomerSupport #Ecommerce #ServiceDesign`,
    link: 'https://www.loqara.com/blog/ai-chatbot-for-online-store',
    image_url: '/linkedin/49-seven-support-jobs.webp',
    image_alt: 'One conversation enters a crafted sorting table and branches into seven distinct paths for discovery, comparison, compatibility, policy, order, exception, and intent.',
    pillar: 'Frameworks',
  },
  {
    id: '40000000-0000-4000-8000-000000000050',
    title: 'Building in public still needs closed doors',
    body: `I like sharing what I am building.

The useful parts are often the awkward ones: the assumption that failed, the bug that survived the demo, the performance change that mattered, the feature I decided not to ship.

But “build in public” is not permission to turn customers into content.

Store data, private conversations, identifiable screenshots, internal metrics, and a customer’s unfinished process stay behind a boundary unless there is clear consent.

That constraint can improve the writing.

It forces me to explain the lesson instead of relying on somebody else’s details for drama.

Share the architecture. Anonymise the failure pattern. Describe the decision and the trade-off. Keep the person or business that revealed it protected.

Transparency should make the builder more accountable.

It should not make the customer more exposed.

#BuildInPublic #Privacy #FounderLife`,
    link: null,
    image_url: '/linkedin/50-building-in-public-boundary.webp',
    image_alt: 'An open founder workshop shares plans and lessons while a warm private room safely protects customer material behind it.',
    pillar: 'Founder notes',
  },
]

