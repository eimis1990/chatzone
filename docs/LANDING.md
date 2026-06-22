# Chatzone landing page — spec, plan, tasks

A marketing landing page at `/`, in the clean modern-SaaS style (big display
headlines, alternating light / deep-green bands, generous whitespace, rounded
pill CTAs, scroll-reveal motion) — built with **our** brand, copy, and features.
The real **Jarvis** widget is embedded so visitors (and we, pre-launch) can try
the product live on the page.

> Inspiration is structural/feel only. All copy + visuals are original to Chatzone.

## Brand tokens
- Accent green **#68A369** (CTAs, highlights, accent headline line).
- Deep green band **#13241b** (dark sections), light-green-on-dark text **#a9d6b4**.
- Font **Geist** (already the app font). White sections `#ffffff`, soft section tint `#f6f8f6`.
- Pill buttons, 16–20px radius cards, soft shadows, ring-1 borders.

## Section map
1. **Announcement bar** — thin top strip: early-access / book-a-demo.
2. **Sticky nav** — logo, anchor links (Features, How it works, Pricing, Docs), Sign in, "Get started" pill. Gains a blurred background after scroll.
3. **Hero** — full-bleed deep-green gradient/mesh. Eyebrow label, oversized headline with the **last line in accent green**, subhead, "free while in early access" check line, email + CTA. Right: a **live-looking product mockup** (faux Chatzone chat) — no photo needed.
4. **Trusted-by strip** — short line + placeholder store logos (grayscale).
5. **Feature rows** (alternating white / deep-green), each scroll-revealed with an image slot:
   - Grounded AI chat (RAG over your knowledge base)
   - Voice agent (customers talk to your store)
   - Live handoff + agent inbox
   - Conversation analytics + AI evaluations
   - Product search + transactional skills (order status, discounts)
   - Multilingual (EN/LT) + 1-line embeddable widget
6. **Stats band** (deep green) — a few proof points.
7. **How it works** — 3 steps (Connect knowledge → Customize → Embed & go live).
8. **Big CTA band** (deep green) — final conversion push + email/CTA.
9. **Footer** — columns, brand, privacy link.

## Interactions / motion
- `Reveal` wrapper: fade + 16px slide-up on `whileInView` (once), staggered for grids.
- Sticky nav: transparent over hero → solid/blur after ~24px scroll.
- Hero product mockup: gentle float + subtle parallax.
- Cards: hover lift + ring. Respect `prefers-reduced-motion`.

## Conversion improvements (beyond a static clone)
- **Live product on the page** — the real Jarvis widget is embedded; a "Try it — bottom-right" nudge points to it. Trying beats screenshots.
- Outcome-led copy (deflection, 24/7, faster replies) over feature-listing.
- Single, repeated primary CTA ("Get started"); email capture in hero + final band.
- Social-proof slot + a metrics band to build trust fast.

## Embed
`<Script src="/widget.js" data-bot-key="135c8f3f62b77480ef0237e5827ca996" data-position="bottom-right">` (Jarvis — avatar, voice, commerce, EN/LT). Same-origin, so the loader + config fetch just work.

## Image prompts (run these; drop results in `public/landing/`)
See the chat message accompanying this build for the full prompt list (hero,
feature shots, og image). Slots reference `/landing/*.png` with graceful
gradient fallbacks until provided.

## Tasks
- [x] Spec (this doc).
- [ ] `Reveal` + landing components + `app/page.tsx` + layout metadata.
- [ ] Embed Jarvis widget; typecheck/build/test; deploy; verify live.
