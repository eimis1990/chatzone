---
title: "AI voice agents explained: when customers can just talk to your website"
description: What an AI voice agent is, how a voice chatbot works (speech in, LLM, speech out), what it costs per minute, and the honest limits — explained simply.
date: 2026-07-03
author: Eimantas Kudarauskas
image: /blog/ai-voice-agents-explained.webp
---

For most of the past decade, "talking to a website" meant one of two disappointments: a phone menu that made you press 3 twice, or a browser demo with pauses so long you'd check whether the tab had frozen. That's over. In 2026 a customer can click a button in a chat widget, ask a question out loud in their own words, and get a natural spoken answer back in about a second — grounded in that store's actual policies and products.

This post explains what an AI voice agent actually is, how it works in plain words, what changed to make it real, what it honestly still can't do, and what it costs. No hype — including about the parts we sell.

<blockquote class="quick-answer">An <strong>AI voice agent</strong> (or voice chatbot) lets a customer <em>speak</em> to a business and hear a spoken answer in real time — no human on the line. The pipeline is speech-to-text, an LLM <strong>grounded in the business's own content</strong>, then text-to-speech, with tool calls for orders and products. Real-time speech models made it conversational in 2026; it's typically billed per minute.</blockquote>

<div class="takeaways">
<p class="takeaways-title">Quick take</p>
<ul>
<li><strong>An AI voice agent</strong> (often called a voice chatbot) is real-time speech-to-speech conversation with a business — on its website or phone line — powered by the same grounded AI that answers its text chat.</li>
<li><strong>The pipeline is simple to say:</strong> speech-to-text → an LLM grounded in the business's own content → text-to-speech, with tool calls in the middle for orders and products.</li>
<li><strong>What changed:</strong> real-time speech models cut response latency from "awkward" to conversational, and made interruptions and natural voices work.</li>
<li><strong>Honest limits remain:</strong> heavy accents plus background noise, per-minute costs, and plenty of situations where typing simply beats talking.</li>
</ul>
</div>

## What is an AI voice agent, actually?

Strip the jargon and it's this: software that lets a customer *speak* to a business and hear a spoken answer, in real time, with no human on the other end — and, crucially, with answers that come from the business's real content rather than a script or a model's imagination.

Three things separate it from what came before:

**It's not an IVR.** Phone menus ("press 1 for orders") are the button chatbots of telephony — a fixed tree with no understanding. A voice agent understands whatever the customer actually says: "yeah hi, I ordered trainers last Tuesday and they haven't shipped yet."

**It's not a voice assistant.** Siri and Alexa answer general questions on their own behalf. A voice agent answers on *one business's* behalf, from that business's knowledge — its returns window, its shipping zones, its live catalog.

**It's not text-to-speech bolted onto a chatbot.** The real thing is conversational: you can interrupt it mid-sentence, it stops and listens, it handles "wait, actually—" the way a person does. That turn-taking is most of what makes it feel natural rather than uncanny.

On a website it usually lives inside the existing chat widget — a "call" button next to the text box. The same agent can also sit on a phone number, which matters for the customers who were never going to type anything.

<figure>
<img src="/landing/feature-voice.webp" alt="Live voice call in the Loqara chat widget showing the Listening state" width="1200" height="900" loading="lazy" />
<figcaption>A real voice call inside a store's chat widget — the agent is listening.</figcaption>
</figure>

## How it works, in plain words

The pipeline has three stages, plus one thing happening in the middle that makes it useful:

**1. Speech-to-text (STT).** The customer's audio is transcribed as they speak — streaming, not waiting for them to finish. Good systems also detect *when* they've finished (or when they're interrupting), which is harder than the transcription itself.

**2. An LLM, grounded in the business's knowledge.** The transcribed question goes to the same brain that powers the text chat: a language model constrained to answer from the store's indexed content — policies, FAQs, product data. This is the part that decides whether the agent is trustworthy. A voice pipeline around an ungrounded model just hallucinates out loud, which is arguably worse than doing it in text, because the customer can't scroll back and check.

**3. Text-to-speech (TTS).** The answer is spoken back in a natural voice, streamed so the first words play while the rest is still being generated. Modern voices handle tone, pacing, and multiple languages well enough that most customers stop noticing they're synthetic.

**The useful bit in the middle: tool calls.** While formulating an answer, the agent can call out to real systems — search the live product catalog, check stock and price, look up an order after verifying the customer's identity. That's what turns "a website that talks" into "a website that helps": the difference between *"our shipping usually takes 2–4 days"* and *"your order shipped yesterday with DPD, it should arrive Thursday."* It's the same mechanism that makes [voice AI genuinely useful for e-commerce support](/blog/voice-ai-for-ecommerce-support) rather than a novelty.

All of this happens fast enough that the exchange feels like a conversation — roughly a second from the customer finishing a sentence to hearing an answer begin.

## What changed: why this works in 2026 and didn't in 2022

Two shifts, both recent:

**Latency collapsed.** The old approach chained three separate slow systems — transcribe everything, then think, then synthesize everything — and the customer waited through all three. Modern real-time speech stacks (ElevenLabs' conversational voice platform and OpenAI's realtime speech-to-speech models are the two names you'll hear most) stream every stage and overlap them, bringing response times down from several seconds to under one. Below about a second, a pause reads as "thinking"; above it, it reads as "broken."

**Conversation mechanics got solved.** Interruption handling ("barge-in"), knowing when a speaker has actually finished versus paused, and voices that don't sound like a navigation system — these were the details that made earlier demos feel wrong even when the answers were right. They're now table stakes on the serious platforms.

The result: what required a research team in 2022 is a product feature in 2026. The hard remaining work isn't the voice — it's the grounding and the integrations behind it, same as for text.

## The honest limits

Anyone selling voice agents without this section is selling too hard.

**Accents and noise, together.** STT in 2026 handles most accents well in quiet conditions and moderate noise with familiar accents. Combine a strong accent, a busy street, and a phone speaker, and transcription errors climb — and a mis-heard product name produces a confidently wrong answer. A well-built agent asks for confirmation on anything consequential ("Just to check — order four-seven-one-two?"), but friction is friction.

**Some answers don't belong in audio.** A returns *policy* works spoken aloud; a list of nine products with prices doesn't. Voice agents that also render content in the widget (product cards, links) soften this, but if the answer is fundamentally a table, chat is the better channel.

**Plenty of customers shouldn't — or won't — talk.** Open-plan offices, public transport, 1 a.m. browsing next to a sleeping partner, or a question involving an address read aloud in a café. Voice is an *additional* door, never the only one. The text chat, and a clean [handoff to a human](/blog/ai-chatbot-human-handoff) when the AI reaches its limit, still carry most of the load.

**Minutes cost real money.** Speech models are billed per minute, and a chatty caller costs more than a typer. That's manageable (numbers below) but it means voice should handle conversations, not be the default for every visitor who'd have happily typed.

One place voice earns its cost quickly: customers who struggle with typing — and language. Because the LLM's understanding is multilingual, a voice agent can hold the call in the customer's own language, which pairs naturally with [multilingual text support](/blog/multilingual-ai-customer-support).

## What does an AI voice agent cost?

The industry unit for voice is the **conversation minute**, covering the whole pipeline — transcription, model, synthesis. Across platforms in 2026, all-in costs typically land somewhere between roughly €0.05 and €0.30 per minute depending on voice quality, model, and volume, and vendor pricing usually wraps that in a monthly plan with included minutes plus an overage rate.

For a concrete, disclosed example: Loqara — our product — prices voice as an add-on at **€49/month including roughly 200 minutes, then €0.20/minute** beyond that, on top of a chat plan. The arithmetic worth doing for any vendor is the same: estimate your voice-inclined traffic (it's a minority of visitors), multiply by a typical call length of a couple of minutes, and compare against what those conversations cost you today in support time — or in customers who bounced rather than typed.

<div class="callout">
<p class="callout-title">Before you buy: test it like a sceptic</p>
<p>Any voice agent demos well with a clear voice in a quiet room. Test it the way your customers will use it: on a phone, outdoors, with your accent, interrupting it mid-answer, asking about a real order. And ask the vendor the grounding question — <em>"what does it say when the answer isn't in my content?"</em> The right answer is that it admits it and offers a human, out loud.</p>
</div>

## How to try one

The fastest way to calibrate your expectations is two minutes with a live one — not a promo video, which always sounds better than reality (in both directions: videos hide latency, but also hide how natural real turn-taking feels).

If you want one to poke at right now: the chat widget on [loqara.com](https://www.loqara.com) runs our live voice agent — click the call button, ask it something awkward, interrupt it, try another language. It's the same agent a store would install, answering from our own site's content.

Then run the same experiment against your own use case: take your ten most common support questions, ask them out loud, and count how many got a correct, grounded, comfortable-to-listen-to answer. That number — not the demo — tells you whether voice is ready for your customers.

## Frequently asked questions

### What is an AI voice agent?
An AI voice agent is software that holds a real-time spoken conversation with customers on a business's website or phone line. It transcribes the customer's speech, generates an answer using an AI model grounded in the business's own content, and speaks the reply back in a natural voice — typically within about a second, with support for interruptions and follow-up questions.

### Is a voice chatbot the same thing as an AI voice agent?
In practice, yes — "voice chatbot," "AI voice agent," and "voice AI" all describe the same category. "Voice agent" tends to imply the current generation: real-time speech-to-speech with a grounded LLM behind it, rather than an old phone menu or a chatbot with text-to-speech bolted on.

### How does an AI voice agent work?
Three streaming stages: speech-to-text transcribes the customer as they talk; a language model grounded in the business's knowledge base generates the answer, calling tools where needed (product search, order lookup); and text-to-speech speaks the reply. Everything overlaps, which is what makes the response fast enough to feel conversational.

### Can a voice agent look up my order or check if a product is in stock?
Yes, if it's integrated with the store's platform. Through tool calls, a voice agent can search the live catalog for price and stock and look up a specific order after verifying the customer's identity — the same actions a good text agent performs, just spoken. Agents without these integrations can only answer general policy questions.

### How much does an AI voice agent cost?
Voice is billed by the conversation minute, since speech models run per second of audio. All-in per-minute costs across the industry typically range from roughly €0.05 to €0.30 depending on quality and volume, and most vendors package this as a monthly add-on with included minutes plus an overage rate on top of a chat plan.

### When is text chat better than voice?
Whenever the answer is a list, a link, or a table; whenever the customer is somewhere they can't talk; and whenever sensitive details would have to be read aloud. Voice is an additional channel for people who prefer talking — mobile users, accessibility needs, customers who dislike typing — not a replacement for chat or for human handoff.
