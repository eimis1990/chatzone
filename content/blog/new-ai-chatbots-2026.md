---
title: "New AI chatbots to watch in 2026: Nvidia, voice agents, and vertical AI"
description: "What GPT-6 Astra, continuous voice, tool-using agents, and AI product discovery change for online stores—and what still needs proof."
date: 2026-07-03
updated: 2026-09-09
topic: vendor-comparisons
related: best-chatbot-platforms, best-ai-chatbot-for-ecommerce, ai-voice-agents-explained
author: Eimantas Kudarauskas
image: /blog/new-ai-chatbots-2026.webp
---

Every few months, a new wave of AI chatbots arrives with a press cycle claiming everything before it is obsolete. Most store owners do not need another launch list. They need to know which changes affect product discovery, customer support, cost, and the work required to deploy an agent safely.

This review separates five material developments from the noise. We build an e-commerce AI agent ourselves, so our interest in grounded, vertical agents is not neutral. The GPT-6 Astra documentation was reviewed on **9 September 2026**; the other vendor facts were reviewed on **26 August 2026**. Our recommendations are labelled as judgement rather than market evidence.

<blockquote class="quick-answer">The most useful 2026 shifts are <strong>stronger models for multi-step computer work</strong>, <strong>more natural continuous voice</strong>, <strong>tool-using agents</strong>, <strong>AI-native product discovery</strong>, and <strong>specialised workflows</strong>. For an online store, a stronger model can improve difficult tasks, but accurate data, scoped permissions, testing, and human handoff still determine whether the customer experience is trustworthy.</blockquote>

<div class="takeaways">
<p class="takeaways-title">What changed since our July review</p>
<ul>
<li><strong>OpenAI released GPT-6 Astra:</strong> its API documentation positions it for complex reasoning, computer use, research, and long multi-step workflows. That raises the capability ceiling; it does not supply a store's live data, permissions, or quality controls.</li>
<li><strong>OpenAI introduced GPT-Live on 8 July:</strong> it uses full-duplex interaction and can delegate deeper work while the conversation continues. At launch, OpenAI said API availability was still planned, so do not confuse the ChatGPT rollout with a generally available developer API.</li>
<li><strong>OpenAI refocused commerce on discovery:</strong> its 2026 update says merchants can use their own checkout while product feeds and Shopify Catalog improve how products appear in ChatGPT.</li>
<li><strong>Voice pricing is easier to inspect:</strong> ElevenAgents currently lists a free allowance and $0.08 additional call minutes, while explicitly billing language-model and telephony usage separately.</li>
<li><strong>Nvidia's product boundary is clearer:</strong> ChatRTX was deprecated on 21 January; ACE remains a developer stack for digital humans, speech, and animation.</li>
</ul>
</div>

## 1. What does GPT-6 Astra change for e-commerce AI agents?

OpenAI describes [GPT-6 Astra](https://developers.openai.com/api/docs/models/gpt-6-astra) as its most capable model for complex reasoning, computer use, research, and document creation. The model accepts text and images, supports function calling and Structured Outputs, and can use Responses API tools including web search, file search, code execution, computer use, and MCP connections. OpenAI's [model guidance](https://developers.openai.com/api/docs/guides/latest-model) says Astra is designed for multi-step workflows across browsers and professional software.

For e-commerce, that raises the ceiling on difficult workflows. An agent may have more capacity to interpret an ambiguous request, compare several constraints, inspect an interface, call a tool, and keep track of the customer's goal across multiple steps. That could help with complicated product comparisons, technical compatibility questions, or preparing a back-office action for review.

It does **not** automatically give a chatbot current prices, stock, order records, or permission to change anything. Those capabilities come from the surrounding product: its store connection, retrieval system, identity checks, tool definitions, confirmation rules, logs, and human handoff. A larger context window cannot repair stale inventory or a contradictory returns policy.

<div class="callout">
<p class="callout-title">What changes—and what does not</p>
<p><strong>What changes:</strong> the model may be able to handle harder, longer and more visual tasks. <strong>What does not:</strong> the merchant or chatbot vendor still has to provide trusted data, restrict every action, test real customer questions, and make takeover easy when the model is uncertain.</p>
</div>

OpenAI also describes Astra as better at respecting task boundaries and communicating uncertainty than its previous models. Treat that as a vendor-reported model characteristic, not a production guarantee. A store should still test whether the complete assistant stays within policy when a shopper asks for an unavailable discount, an unsupported refund, an address change, or information about someone else's order.

The price reinforces the need for testing. OpenAI currently lists Astra at **$10 per million input tokens and $50 per million output tokens**, before tool-call charges. OpenAI says stronger task performance and lower output-token use can reduce its estimated cost per completed task in some evaluations, despite the higher token price. That does not establish the cost of a real store conversation. Compare models using resolved customer jobs, answer quality, escalation rate, latency, and total cost—not token price alone.

| Possible benefit | Evidence a store should request |
| --- | --- |
| Better complex product comparisons | A test using live price, stock, variants, and deliberately conflicting constraints |
| Longer multi-step workflows | A trace showing every tool call, permission, confirmation, and changed record |
| Stronger visual understanding | A product-image test that also checks the answer against the catalogue rather than guessing from appearance |
| More capable difficult-case routing | Results for the same real questions across quality, latency, handoff rate, and cost per resolved job |

Our recommendation is to use a model upgrade as a reason to rerun the workflow test, not to skip it. Start with the [knowledge-base checklist](/blog/ecommerce-ai-chatbot-knowledge-base), test the assistant against [real failure cases before launch](/blog/test-ai-chatbot-before-launch), and keep a [human handoff with the full conversation context](/blog/ai-chatbot-human-handoff). Those controls matter whichever model sits underneath the product.

## 2. Nvidia's chatbot story is infrastructure, not a store app

People searching for an “Nvidia AI chatbot” often mean ChatRTX, a Windows reference application that ran retrieval-augmented generation over local files on supported RTX hardware. Nvidia's own repository says the project was [deprecated and stopped being maintained on 21 January 2026](https://github.com/NVIDIA/ChatRTX).

That does not mean Nvidia left conversational AI. Its active proposition sits lower in the stack. [Nvidia ACE](https://docs.nvidia.com/ace/overview/latest/) is a suite of technologies for digital humans: speech recognition, text-to-speech, translation, orchestration, and animation. Some ACE components are distributed as Nvidia NIM microservices and can run in the cloud or on supported local hardware. Nvidia's documentation describes reference workflows and components for developers; it does not present ACE as a ready-made customer-support product for a small shop.

The practical distinction is simple:

- **A store owner** normally buys a completed support or shopping-assistant product.
- **A software team** may use ACE or NIM to build a voice-enabled avatar or other custom experience.
- **A vendor** may use Nvidia components behind the scenes without the merchant ever configuring them.

If a chatbot comparison treats Nvidia ACE as interchangeable with a Shopify or WooCommerce support app, it is comparing infrastructure with an application. Ask what the finished product does in your store, not which GPU stack appears in its architecture diagram.

## 3. Voice became more capable—but availability still needs checking

The largest new voice announcement since this page first appeared was OpenAI's [GPT-Live release on 8 July 2026](https://openai.com/index/introducing-gpt-live/). OpenAI describes a full-duplex design that can listen and speak continuously, decide when to pause or interrupt, and delegate search or deeper reasoning to another model while maintaining the conversation. A 31 July update added provenance signals to supported generated audio.

There is an important availability limit. GPT-Live rolled out to ChatGPT Voice, but OpenAI's launch post said the API was **coming later**. Developers already have OpenAI's production [Realtime API and `gpt-realtime`](https://openai.com/index/introducing-gpt-realtime/), but a vendor should not claim that a newer named model is in its product merely because it is visible in ChatGPT.

ElevenLabs provides a more directly inspectable agent platform today. Its [ElevenAgents documentation](https://elevenlabs.io/docs/eleven-agents/overview/) lists web widgets, telephony, tool calls, knowledge bases, testing, and analytics. Its [public pricing reviewed 26 August 2026](https://elevenlabs.io/pricing/agents) lists 15 included call minutes on Free, 75 on the $6 monthly Starter plan, and $0.08 for additional call minutes on plans where those are available. Language-model and telephony charges are separate.

That last sentence matters more than the headline rate. A voice-agent cost estimate should include:

1. the voice platform or call-minute charge;
2. the language model used during the call;
3. the phone provider, if telephone calls are involved;
4. testing, monitoring, and human follow-up time.

<figure>
<img src="/landing/feature-voice.webp" alt="Website AI agent voice call interface with live conversation transcript" width="1200" height="750" loading="lazy" />
<figcaption>A website voice interface can remove the telephone layer, but it still needs the same knowledge, safeguards, and handoff design as text chat.</figcaption>
</figure>

Our judgement: voice is ready to **trial**, not automatically ready for every customer conversation. Test product questions or order-status routing first. Keep payment disputes, identity-sensitive changes, safety issues, and ambiguous complaints behind a deliberate confirmation or human handoff. Our [voice AI guide for e-commerce](/blog/voice-ai-for-ecommerce-support) explains that scope in more detail.

## 4. “Agentic” now means a controlled action, not a longer answer

The useful definition of an agent is operational: it can use a tool or system to complete a bounded task. For a store, that might mean searching current inventory, retrieving an order after identity verification, creating a support ticket, or preparing a return request for approval.

Commerce in ChatGPT shows both the opportunity and the limits. OpenAI initially presented in-chat purchasing through its Agentic Commerce Protocol. Its later [2026 product-discovery update](https://openai.com/index/powering-product-discovery-in-chatgpt/) says it is focusing on discovery, supporting merchant product feeds and promotions, and allowing merchants to use their own checkout experiences. It also says Shopify product data is integrated through Shopify Catalog, with no separate merchant feed work required for individual Shopify stores.

That is a more useful lesson than claiming that every purchase will move inside a chatbot. Conversation can help a shopper clarify needs and compare products; the store's own checkout can remain the trusted place for account, payment, shipping, and policy confirmation.

<div class="callout">
<p class="callout-title">A practical test for an “agentic” claim</p>
<p>Ask the vendor to name one action, the system it changes, the permission required, and what happens when the action is uncertain. “It can process returns” is vague. “It verifies the customer, checks the return window, prepares the request, and asks for confirmation before submission” is testable.</p>
</div>

For a small store, the safest progression is answer → retrieve → prepare → execute. Let the agent answer from approved content first, then retrieve read-only data, then prepare an action for approval. Only automate execution after logs show the earlier stages are reliable.

## 5. Specialised workflows matter more than a “vertical wins” slogan

It is tempting to say vertical agents beat general agents. We found no current primary evidence that supports that as a universal performance claim, so we will not make it.

What can be tested is whether a product already understands the workflow you need. A general platform may be the better choice for a technical team that wants complete control. A specialised e-commerce agent may reduce setup work when it already supports catalog search, variants, store policies, and identity-checked order lookup.

Evaluate the fit with a five-question test:

| Question | Evidence to request |
| --- | --- |
| Can it answer from current store data? | A live product with price, stock, and variant checks |
| Can it show where an answer came from? | A visible source or trace to the policy/catalog record |
| Can it recognise uncertainty? | A test where the required information is deliberately absent |
| Can it hand off with context? | A human receives the transcript, customer intent, and relevant records |
| Can it act safely? | Permissions, identity checks, confirmation, logs, and a rollback path |

Loqara is specialised in e-commerce, so we naturally value those defaults. That does not make it right for every business. A bank, clinic, or SaaS support team has different data, compliance, and workflow requirements. For store-focused alternatives, use our [e-commerce AI chatbot comparison](/blog/best-ai-chatbot-for-ecommerce); for a neutral evaluation process, use the [AI support agent buyer's checklist](/blog/how-to-choose-ai-support-agent).

## What should a store owner do next?

**Fix the knowledge layer first.** Check product titles, variant relationships, current prices, stock, delivery information, and policy dates. A newer model cannot repair contradictory source data.

**Run a small answer-quality test.** Use real questions from search, support email, and product pages. Score whether the answer is correct, complete, sourced, and appropriately uncertain. Do not count “messages handled” as success.

**Choose one integration.** Product search or read-only order lookup is enough for a first trial. A long list of theoretical actions creates more risk than value.

**Trial voice after text is trustworthy.** Voice makes the same agent easier to access; it does not make weak answers accurate. Include every cost layer and read transcripts from real sessions.

**Measure resolved customer jobs.** Track whether the shopper found a suitable product, got an accurate answer, or reached the right human without repeating themselves. Our [2026 customer-service statistics](/blog/ai-customer-service-statistics) explains why adoption numbers alone are not an outcome benchmark.

## Frequently asked questions

### Will GPT-6 Astra automatically make an e-commerce chatbot better?

No. A stronger model may improve difficult reasoning, visual input, and multi-step tool use, but the complete assistant still depends on current store data, well-defined tools, scoped permissions, identity checks, testing, and human handoff. Ask for results on your real catalogue and policies rather than assuming a model name guarantees them.

### Should every customer message use GPT-6 Astra?

Not necessarily. Routine questions may not need the most capable—and more expensive—model. Compare quality, latency, escalation rate, and cost per resolved customer job on representative conversations. A sensible system may route difficult cases to a stronger model while handling simple, well-grounded answers more efficiently.

### Does Nvidia make a chatbot for online stores?

Not as a ready-to-install store product. ChatRTX was a local Windows reference app and is no longer maintained. Nvidia ACE provides speech, animation, and digital-human components for developers and enterprises building their own experiences.

### What is the biggest new voice-chatbot change in 2026?

OpenAI's GPT-Live introduced continuous, full-duplex interaction in ChatGPT Voice, while existing platforms such as OpenAI's Realtime API and ElevenAgents already support developers building production voice agents. Availability differs by product: at GPT-Live's July launch, OpenAI said API access was planned rather than already generally available.

### Are voice AI agents cheap?

They can be inexpensive to trial, but “price per minute” is not the whole cost. ElevenAgents currently lists $0.08 additional call minutes, with LLM and telephony usage charged separately. Deployment, quality review, escalation, and support time also belong in the calculation.

### What does an agentic chatbot do?

It uses tools to retrieve data or perform a controlled action, rather than only generating text. In e-commerce, useful examples include searching a live catalog, retrieving an order after verification, creating a ticket, or preparing a return request for confirmation.

### Should a small store choose a general or e-commerce-specific agent?

Choose the product that passes your real workflow test with the least risky custom work. A general platform can suit a technical team building bespoke processes. A specialised product can be faster when it already supports the store platform, catalog, policies, and order workflows you need.

---

**The honest bottom line:** the 2026 change is not that every chatbot became autonomous. Models can handle harder multi-step work, voice interaction improved, product discovery moved into AI interfaces, and tool-using agents became easier to deploy. A store still wins by starting with accurate data, one bounded customer job, clear permissions, and a human path when the agent is unsure.

*GPT-6 Astra capabilities and pricing were reviewed against official OpenAI documentation on 9 September 2026. Other vendor features, availability, and public prices were reviewed on 26 August 2026. Recheck current terms before purchasing.*
