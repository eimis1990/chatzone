# Loqara landing page — spec, plan, tasks

A marketing landing page at `/`, in the clean modern-SaaS style (big display
headlines, alternating light / deep-green bands, generous whitespace, rounded
pill CTAs, scroll-reveal motion) — built with **our** brand, copy, and features.
The real **Jarvis** widget is embedded so visitors (and we, pre-launch) can try
the product live on the page.

> Inspiration is structural/feel only. All copy + visuals are original to Loqara.

## Brand tokens
- Accent green **#68A369** (CTAs, highlights, accent headline line).
- Deep green band **#13241b** (dark sections), light-green-on-dark text **#a9d6b4**.
- Font **Geist** (already the app font). White sections `#ffffff`, soft section tint `#f6f8f6`.
- Pill buttons, 16–20px radius cards, soft shadows, ring-1 borders.

## Section map
1. **Announcement bar** — thin top strip: early-access / book-a-demo.
2. **Sticky nav** — logo, anchor links (Features, How it works, Pricing, Docs), Sign in, "Get started" pill. Gains a blurred background after scroll.
3. **Hero** — full-bleed deep-green gradient/mesh. Eyebrow label, oversized headline with the **last line in accent green**, subhead, "free while in early access" check line, email + CTA. Right: a **live-looking product mockup** (faux Loqara chat) — no photo needed.
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

## Hero media delivery

The hero renders a responsive poster in server HTML. After hydration, capable
browsers request only the intro video; the loop source is not assigned until the
intro ends. Reduced-motion, Save-Data, and 2G users remain poster-only.

Current derivative assets are generated from the original 1920×1080 H.264 files:

| Asset set | Dimensions | Intro | Loop | Combined |
|---|---:|---:|---:|---:|
| Original | 1920×1080 | 3.91 MB / 6.21 Mbps / 5.04 s | 4.05 MB / 5.36 Mbps / 6.04 s | 7.96 MB |
| Desktop | 1280×720 | 560 KB / 0.88 Mbps | 433 KB / 0.57 Mbps | 993 KB |
| Mobile | 540×960 | 317 KB / 0.50 Mbps | 267 KB / 0.35 Mbps | 584 KB |

All video variants are H.264 at 24 fps with no audio. Original 1600×900 posters
are 221–230 KB; desktop derivatives are 162–167 KB and mobile derivatives are
58–65 KB.

```bash
# Desktop, 1280×720
ffmpeg -i public/loqara-hero-intro.mp4 -vf 'scale=1280:-2:flags=lanczos' \
  -an -c:v libx264 -preset slow -crf 29 -pix_fmt yuv420p \
  -movflags +faststart public/loqara-hero-intro-desktop.mp4

# Mobile, portrait crop focused on the fox
ffmpeg -i public/loqara-hero-intro.mp4 \
  -vf 'crop=608:1080:980:0,scale=540:960:flags=lanczos' \
  -an -c:v libx264 -preset slow -crf 30 -pix_fmt yuv420p \
  -movflags +faststart public/loqara-hero-intro-mobile.mp4
```

Use the same settings for the loop file. Posters use matching 1280×720 and
540×960 crops. The compositions were checked at 390, 768, 1440, and 1920 CSS px.
Keep the full-resolution sources until the optimized derivatives have passed
production network and visual smoke tests.

## Landing image and font budgets

- The hero picture is intentional eager background chrome; it uses responsive
  540×960 and 1280×720 poster sources and is the only image available before
  hydration.
- Feature screenshots use `next/image`, fixed aspect-ratio containers, and
  `(min-width: 1024px) 50vw, 100vw` sizing. They remain lazy because they are
  below the hero.
- The three How it works illustrations are decorative, dimensioned 900×672
  WebPs delivered through `next/image`; they remain lazy and reserve a 4:3 box.
- The showcase mounts at most three responsive images. Outer wings are CSS and
  the likely forward neighbor waits for browser idle.
- The header selects one decorative fox mark as a CSS background instead of
  rendering and preloading both light/dark variants. Dialog logo images are
  created only after a dialog opens; they are not content/LCP candidates.
- Global font preloads are limited to Geist Sans (base UI) and Plus Jakarta Sans
  (hero heading). Geist Mono and every selectable chat font use `preload: false`.

## Image prompts (run these; drop results in `public/landing/`)
See the chat message accompanying this build for the full prompt list (hero,
feature shots, og image). Slots reference `/landing/*.png` with graceful
gradient fallbacks until provided.

## Tasks
- [x] Spec (this doc).
- [ ] `Reveal` + landing components + `app/page.tsx` + layout metadata.
- [ ] Embed Jarvis widget; typecheck/build/test; deploy; verify live.
