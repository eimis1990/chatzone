# Loqara vs Parnidia — head-to-head

_Benchmark run 2026-07-08. Live transcripts captured from Parnidia's own production bots on **homebynb.lt** (same store as our eval — a true like-for-like) and **crocs.lt**._

## Verdict in one line

On a **well-maintained** deployment (homebynb.lt), Parnidia is a genuinely
strong bot — correct facts *and* product cards, roughly on par with us on
answer quality. **We don't win on "they can't answer."** We win on the
**business model** (self-serve, you own it, removable branding, far cheaper)
and on **consistency** — their neglected crocs.lt bot proves the agency model's
quality varies client to client.

Read that twice before pitching. If you tell a prospect "their bot is broken"
and they open homebynb's bot, it works fine and you lose credibility. The real
story is stronger and true: **same quality, radically better terms, and you're
not dependent on an agency to keep it good.**

## Methodology

Parnidia's bot runs live on two stores we could test:
- **homebynb.lt** — Parnidia's client, and the *same store our accuracy eval
  targets*. This is a real like-for-like: I asked their live bot the exact
  questions we have ground-truth facts for.
- **crocs.lt** — a Voiceflow-embed Parnidia deployment, evidently less
  maintained.

Loqara side: `scripts/eval-answers.mjs` replays 10 curated buyer questions
through the real production `/api/chat`, graded by an LLM judge against required
facts (10/10 on 2026-07-08). Parnidia side: live transcripts, captured verbatim.

## 1. Same-store fact test (homebynb.lt) — the honest core

Both bots answer homebynb buyer questions; I have exact ground-truth facts.

| Question | Ground truth | Parnidia (homebynb) | Loqara (homebynb) |
|---|---|---|---|
| Delivery time (LT) | 1–3 days prep + 1–2 delivery | ✅ correct (+ offered VIP option) | ✅ correct |
| Returns policy | 14 days, unused, packaging intact | ✅ correct | ✅ correct |
| Who pays return shipping | Buyer | ✅ correct | ✅ correct |
| Contact / return address | uzsakymai@homebynb.lt, Vikingų g. 5C | ✅ correct, with links | ✅ correct |
| Product query ("veido kremas sausai odai") | Should surface real products | ✅ ~13 product cards (title, price, image, "Plačiau") | ✅ 20 product cards (title, price, **stock**, image, buy-link) |

**On its own client store, Parnidia ties us on facts and shows product cards.**
Minor edges to us: our cards include live **stock status** and deep-link
straight to the product page; theirs show price + a "more" button. Not a
knockout — a nudge.

Loqara measured accuracy: **10/10 (100%)** on the full eval set, and it's
**rerunnable on demand** — vs Parnidia's *claimed* ~81% chatbot / "85.73%
handled" marketing figures. We show ours; they assert theirs.

## 2. The consistency problem (crocs.lt) — Parnidia's real weakness

The **same vendor's** bot on crocs.lt performed markedly worse:

- **Delivery question → "neturiu tikslios informacijos"** (no info), punted to
  a human. The most basic e-commerce question, unanswered.
- **Leaked `klientams@open24.lt` + a different phone** — the parent retailer's
  contacts, a *different brand*, surfaced on the Crocs site.
- **Product query → prose only, zero cards, zero buy-links.**
- (Returns question there was answered correctly — credit where due.)

Same technology, same vendor, wildly different quality. That's the structural
risk of done-for-you: **your** bot is only as good as the attention your account
gets. A self-serve product you own and tune yourself doesn't degrade because the
agency prioritised a bigger client this month.

Evidence: `docs/assets/parnidia-crocs-transcript.jpeg`,
`docs/assets/parnidia-homebynb-cards.jpeg`.

## 3. Where we actually win — business model & ownership

| | Parnidia | Loqara |
|---|---|---|
| Go-to-market | Agency, done-for-you | **Self-serve** free→paid, **+** optional concierge |
| Price to start | €1,495–1,995 setup + €199–499/mo | Free tier; paid plans; no setup fee required |
| Onboarding | 3–4 weeks bespoke | Minutes, in-app wizard |
| Under the hood | Voiceflow (rented flow-builder) + socket.io widget | Own stack: hybrid RAG + live catalog sync + own widget |
| Branding | "Powered by Parnidia" on client's bot; links to parnidia.com | "Powered by Loqara", **removable on paid plans** |
| Caps | 500/700/1,000 conversations; 1/2/5 languages | Plan-based, no bespoke renegotiation |
| Who maintains quality | Parnidia (varies by client — see crocs) | You, in-app, anytime |
| Accuracy proof | Marketing number | Open, rerunnable eval |
| Product cards | Yes (price + more) | Yes (price + **stock** + deep link) |

## 4. Talking points for prospects (honest versions)

- "Their bot is good — and it should be, you'd pay €1.5–2k plus €199–499/mo for
  it, branded as Parnidia, on a 3–4 week setup. You can turn ours on yourself
  today, free, branded as you."
- "Ask us to rerun our accuracy eval live. They publish a number; we show the
  test."
- "Look at their crocs.lt bot vs their homebynb bot — same vendor, very
  different quality. With us you own it and tune it, so it doesn't drift when
  you're not the priority account."
- "Our product cards show live stock and link straight to the buy page."

## Reproduce

```bash
# Loqara accuracy (needs OPENAI_API_KEY + bot public key)
LOQARA_URL=https://www.loqara.com BOT_KEY=<public_key> \
  node --env-file=.env.local scripts/eval-answers.mjs
# then: delete conversations where visitor_id like 'eval-%'
```

Parnidia: open homebynb.lt / crocs.lt, open the chat, ask the questions above.
