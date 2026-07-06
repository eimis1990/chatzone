---
title: "AI chatbot data privacy & GDPR: what e-commerce owners must know"
description: A plain-English guide to the data an AI chatbot handles, your GDPR obligations, and the exact questions to ask any vendor before you put one on your store.
date: 2026-07-02
author: Eimantas Kudarauskas
image: /blog/ai-chatbot-gdpr-data-privacy.webp
related: how-to-choose-ai-support-agent, best-ai-chatbot-for-ecommerce, ai-chatbot-human-handoff
---

Adding an AI chatbot to your store means adding a new place where customer data flows — questions, names, sometimes an email or an order number. Under the GDPR, that makes the chatbot part of your compliance surface, and "the vendor handles it" is not a defense if something goes wrong. The good news: getting this right is mostly about asking a handful of pointed questions and choosing a tool that answers them cleanly.

This guide walks through what data a support chatbot actually touches, the obligations that land on you as the store owner, and a vendor checklist you can use verbatim.

<p><em>This is general information for store owners, not legal advice. For your specific situation — especially anything involving special-category data or large-scale processing — talk to a qualified data-protection professional.</em></p>

<blockquote class="quick-answer">Yes — an AI chatbot is <strong>GDPR-compliant when handled correctly</strong>. You're the data controller, so you need a lawful basis, transparency in your privacy policy, a DPA with the vendor, data minimization, and sensible retention. The three things to verify: where data is stored, whether it trains anyone's models, and how long it's kept. Loqara builds these in as EU-first defaults.</blockquote>

<div class="takeaways">
<p class="takeaways-title">Quick take</p>
<ul>
<li><strong>You're the data controller.</strong> The chatbot vendor is usually a processor acting on your instructions — but the accountability stays with you.</li>
<li><strong>Minimize by default.</strong> A support bot rarely needs more than the question itself; don't collect what you can't justify.</li>
<li><strong>The big three to verify:</strong> where data is stored, whether it's used to train anyone's models, and how long it's kept.</li>
<li><strong>Get it in writing:</strong> a Data Processing Agreement (DPA), a list of sub-processors, and clear retention controls.</li>
</ul>
</div>

<figure>
<img src="/blog/ai-chatbot-gdpr-data-privacy-illustration.webp" alt="Illustration of data streams flowing into a glowing padlock shield" width="1200" height="800" loading="lazy" />
<figcaption>Privacy isn't a feature you bolt on later — it's a set of questions you answer before the chatbot goes live.</figcaption>
</figure>

## What data a support chatbot actually touches

Before you can protect data, you need to know what's flowing. A typical e-commerce support conversation involves less than people fear — but it's not nothing.

| Data type | When it appears | Sensitivity |
| --- | --- | --- |
| The message content | Every conversation | Usually low, but can contain anything a shopper types |
| Name / email / phone | If you capture leads or look up orders | Personal data — the core of GDPR scope |
| Order number & status | Order-lookup conversations | Personal data when tied to a customer |
| IP address / device info | Often logged by default | Personal data under GDPR |
| Payment details | Should **never** enter a chat | High — keep it out entirely |

Two rules make the rest simpler. First, **a support chatbot should never handle payment card details** — checkout stays in your payment processor, full stop. Second, **collect only what the conversation needs**: to look up an order you need an order number and the email on it, not a phone number, home address, and date of birth. Data you don't collect is data you can't leak, don't have to secure, and never have to delete.

<div class="stat-grid">
<div class="stat"><div class="stat-num">€20M</div><div class="stat-label">Or 4% of global turnover — the GDPR fine ceiling</div></div>
<div class="stat"><div class="stat-num">Controller</div><div class="stat-label">Your role; the vendor is your processor</div></div>
<div class="stat"><div class="stat-num">DPA</div><div class="stat-label">The contract you must have with any processor</div></div>
<div class="stat"><div class="stat-num">Minimize</div><div class="stat-label">The single most effective privacy practice</div></div>
</div>

## What are your obligations, in plain English?

You don't need to memorize the regulation. For a support chatbot, the duties that actually matter come down to a short list.

**Have a lawful basis.** For support, this is usually "legitimate interest" (answering a customer who contacted you) or performance of a contract (handling an order). If you use conversations for marketing follow-up, that's a separate purpose that typically needs consent.

**Be transparent.** Your privacy policy should mention the chatbot: that an AI assists support, what it collects, and who processes it. A one-line notice near the chat ("By chatting you agree to our privacy policy") plus the detail in the policy itself is the norm.

**Minimize and limit purpose.** Collect only what's needed for support, and don't quietly repurpose it. An email captured to answer a delivery question isn't automatically a marketing subscriber.

**Respect data-subject rights.** Customers can ask what you hold, correct it, or have it deleted. You need to be able to honor that — which means knowing where chat data lives and being able to remove it.

**Keep it secure and keep it briefly.** Reasonable security (encryption, access control) and a retention period that isn't "forever." If you don't need a two-year-old support chat, don't keep it.

<div class="callout">
<p class="callout-title">Legitimate interest still needs a light touch</p>
<p>"Legitimate interest" isn't a blank cheque. It works well for answering the customer in front of you. It does not automatically cover training models on their messages, selling data, or bolting them onto a marketing list. When in doubt, ask: would the shopper reasonably expect this use? If not, you need consent or you shouldn't do it.</p>
</div>

## The vendor checklist (use this verbatim)

Most of your compliance depends on the tool you pick, so interrogate it before you install it. A trustworthy vendor answers all of these without squirming:

- **Do you offer a Data Processing Agreement (DPA)?** If they can't provide one, walk away — you legally need it.
- **Where is the data stored and processed?** For EU shoppers, EU/EEA storage (or a valid transfer mechanism) keeps things simple.
- **Who are your sub-processors?** The model provider, hosting, analytics — you're entitled to the list, and you inherit their practices.
- **Is my data used to train AI models?** The answer you want is "no." Your customers' questions should not become someone's training set.
- **What's the data retention, and can I control it?** You want configurable retention and automatic deletion, not indefinite storage.
- **How do you handle deletion and export requests?** You need a practical way to fulfill data-subject rights.
- **How is data secured?** Encryption in transit and at rest, access controls, and tenant isolation so one store's data can't reach another's.

If a vendor is vague on the training question or can't produce a DPA, that's your answer. Privacy posture is part of choosing well — see our broader guide to [choosing an AI support agent](/blog/how-to-choose-ai-support-agent).

<div class="proscons">
<div class="pros">
<p class="pc-title">Green flags</p>
<ul>
<li>Ready DPA and a public sub-processor list</li>
<li>EU data storage option; clear on transfers</li>
<li>Explicit "we don't train on your data"</li>
<li>Configurable retention with auto-deletion</li>
<li>Per-store data isolation and encryption</li>
</ul>
</div>
<div class="cons">
<p class="pc-title">Red flags</p>
<ul>
<li>No DPA, or "we'll sort it later"</li>
<li>Won't say where data lives or who sub-processes it</li>
<li>Evasive on model training</li>
<li>"We keep everything forever"</li>
<li>Encourages putting payment or ID details in chat</li>
</ul>
</div>
</div>

## How Loqara approaches it

We built Loqara for EU stores, so privacy is a default, not an upsell. In plain terms: conversations are **not used to train foundation models**; each store's data is **isolated** from every other tenant; retention is **time-bounded** with automatic cleanup rather than kept indefinitely; and sensitive flows are designed so **payment details never enter the chat** (checkout stays on your store). When a conversation needs a person, the [handoff](/blog/ai-chatbot-human-handoff) keeps the data within your own inbox.

We'll also tell you plainly what we are and aren't: we're a practical, privacy-respecting tool for small and mid-size stores, not a heavyweight enterprise compliance suite. If your situation demands specific certifications or contractual guarantees, ask us directly and we'll give you a straight answer rather than a sales pitch.

## Frequently asked questions

### Does using an AI chatbot make me GDPR non-compliant?

No — a chatbot is fine under GDPR when handled correctly. You need a lawful basis (usually answering the customer), transparency in your privacy policy, a DPA with the vendor, data minimization, and a sensible retention period. Thousands of EU stores run chatbots compliantly; the work is in choosing a solid vendor and being honest in your policy.

### Am I responsible, or is the chatbot company?

Both, in different roles. You're the data controller — you decide why and how customer data is used, so accountability sits with you. The vendor is typically a processor acting on your instructions, governed by the DPA. "The vendor is responsible" won't shield you if you skipped the basics.

### What's the single most important thing to check in a vendor?

Whether your data is used to train AI models, and whether they'll sign a DPA. If conversations become someone's training data, or there's no processing agreement, no other feature makes up for it. After that, check data location and retention.

### Do I need to mention the chatbot in my privacy policy?

Yes. Note that an AI assistant helps with support, what data it collects, and who processes it (including the model provider). A short notice by the chat window pointing to the full policy is standard practice.

### How long should chat data be kept?

Only as long as you actually need it for support and record-keeping — then delete it automatically. There's no fixed number in the GDPR, but "indefinitely" is the wrong answer. Prefer a tool with configurable retention so old conversations clean themselves up.

---

Privacy done right is a trust advantage, not a chore — shoppers in the EU notice. Ask the hard questions, minimize what you collect, and pick a tool that answers cleanly. [See how Loqara handles it.](/#get-started)
