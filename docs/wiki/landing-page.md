# Landing page ("one day in a store")

The `/` page tells one story top to bottom: it is 02:47, a shopper is being
answered; the night passes scene by scene; the sun comes up on the inbox; the
day covers setup; dusk falls over pricing; and the page ends at night again.
Every product feature is shown as a small live scene, not a screenshot.

Assembly order is `app/page.tsx` (the `<main>` block). Code lives in
`components/landing/night/`; one CSS module, `night.module.css`, ships only on `/`.

## The pieces

| Section | Component | Time (`data-clock`) |
|---|---|---|
| Hero: the lit widget on a shader sky | `NightHero.tsx`, `HeroWindow.tsx`, `NightSky.tsx` | 02:47 (167) |
| Order status, in Lithuanian | `SceneOrder.tsx` | 03:12 (192) |
| Voice call | `SceneVoice.tsx` | 04:05 (245) |
| "It does not guess" → lead → handoff | `SceneHandoff.tsx` | 05:20 (320) |
| Sunrise + morning inbox | `Morning.tsx` | 07:30 (450) |
| Widget restyle playground (`#showcase`) | `Playground.tsx` | 10:00 (600) |
| Three setup steps (`#how`) | `Steps.tsx` | 13:00 (780) |
| Pricing, done-for-you, FAQ | `../Pricing.tsx`, `../SetupPricing.tsx`, `../Faq.tsx` | 18:30, 20:30, 22:30 |
| Close ("again tonight") | `Tonight.tsx` | 02:47 next day (1607) |

- `Scene.tsx` is the shared pinned-scene shell (copy right, visual left) and
  exports `at(from, to)`, the step timing helper.
- `WidgetFrame.tsx` is the widget chrome (header, body sheet, "Powered by"),
  used by the hero and the playground. It mirrors
  `components/widget/ChatWindow.tsx`; restyle it with `--w-accent` / `--w-radius`.
- Real widget components are reused, inert, wherever they fit: `ProductCards`
  (hero grid, voice row) and `SiriOrb` (voice call).

## Rules that are easy to break

- **All copy is server HTML and nothing needs JavaScript to appear.** The hero
  conversation is revealed by CSS `animation-delay` only (`.msg`,
  `night.module.css:271`), so it plays before hydration; a picked question
  re-keys the nodes to restart the CSS (`HeroWindow.tsx`, the `run` counter).
- **Scenes are driven by CSS scroll timelines, behind `@supports`**
  (`night.module.css:916`). The scene declares `view-timeline: --scene`
  (`:663`); each `.step` animates over `contain <from>% .. contain <to>%`, which
  for a subject taller than the screen is exactly the pinned stretch. Default
  (no support, reduced motion) is every step visible. Small screens do not pin:
  steps reveal on their own `view()` entry instead.
- **Visual on the left, copy on the right, everywhere.** The live landing
  widget's launcher and greeting bubble own the bottom-right ~260×170px of the
  screen; anything tall on the right collides with it. The copy stays first in
  the DOM and is placed with `grid-column`.
- **Single-column grids declare `minmax(0, 1fr)`** (`:51`, `:651`, `:1150`).
  See [gotchas](gotchas.md#a-default-grid-track-can-make-a-phone-page-scroll-sideways).
- **Every section sets `data-clock` and `data-tone`.** `PageClock.tsx` (in the
  nav) interpolates the time between consecutive `data-clock` sections by scroll
  position; `LandingNav.tsx:31` wears the tone of the last `data-tone` section
  whose top has passed under the bar. A new section without them freezes the
  clock across it and inherits the previous tone.
- **Sky continuity.** Each night section's gradient starts on the colour the
  previous one ended on (`sky` prop of `Scene`; `.sunrise`, `.dusk`). Change one
  end and its neighbour must follow.
- **The shader sky is decoration.** `NightSky.tsx` skips software GL
  (`:59`, `:66`) and the CSS gradient under the canvas is the page without it;
  reduced motion gets one still frame.
- **`#get-started` opens the signup dialog** and is owned by `Tonight.tsx`
  (`openOnHash`). Blog CTAs and chat replies link to it; do not put that id on
  a section.

## Claims the copy makes (keep them true)

- The bot answers in the widget's **selected** language, not the language the
  shopper types in (`lib/ai/prompt.ts`, "Always respond in …"). The order scene
  says "her widget is set to Lithuanian" for that reason.
- Order lookup needs the order number **and** the billing email to match, and
  exists for WooCommerce and Magento only (`lib/commerce/index.ts`).
- Voice is an add-on. The inbox numbers are the page's own four example
  conversations, labelled as an example; no performance metrics are invented.

## Checking it

- `E2E_PORT=3000 npx playwright test tests/e2e/public-landing.spec.ts` reuses a
  running dev server and covers: no-JS content, anchors and the signup hash,
  reduced motion, mobile overflow, hero questions, a pinned scene playing with
  the clock, the inbox and the playground.
- The in-app Browser pane, when hidden, barely advances CSS animation time, so
  screenshots show half-played states. Trust the Playwright run for timing.

> ⚠️ verify: Safari and Firefox were not tested. Browsers without scroll-driven
> animations should show scenes fully revealed (the `@supports` fallback), which
> has only been reasoned about, not seen.

_Last verified: 2026-11-10 (branch `landing-night-shift`)._
