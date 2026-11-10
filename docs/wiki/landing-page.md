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
| Widget playground at real size (`#showcase`) | `Playground.tsx` | 10:00 (600) |
| Two ways to go live (`#how`) | `HowItWorks.tsx` | 13:00 (780) |
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
- **The shader sky is decoration.** `NightSky.tsx` skips software GL (the
  `failIfMajorPerformanceCaveat` context and the renderer-name check) and the
  CSS gradient under the canvas is the page without it; reduced motion gets one
  still frame.
- **Parallax is depth-ordered.** In the hero shader each layer (far stars, near
  stars, moon, cloud) is sampled a share of `scrollY` further down (`sc`
  uniform) and a share of the pointer, so far layers leave the screen slowest.
  In the scenes and the close, `.stars` holds two tiled `<i>` layers that slide
  at different speeds on a `view()` timeline (`starsFar` / `starsNear`).
- **No horizon lines, and glows have many stops.** The hero's ground is a
  darkening laid over the sky (`.ground`), not a bordered band. Radial glows
  (`.halo`, `.spill`, `.farGlow`) use six or seven stops on an ease-out curve:
  a two-stop glow, or a `box-shadow` with spread, shows its edge as a ring.
- **The close ends on the footer's colour.** `.tonight`'s gradient finishes on
  `#101213` so the page runs into `Footer` with no seam; the distant window is
  the real `WidgetFrame` at `scale: 0.32` with `-webkit-box-reflect` for its
  reflection (Firefox shows none).
- **`#get-started` opens the signup dialog** and is owned by `Tonight.tsx`
  (`openOnHash`). Blog CTAs and chat replies link to it; do not put that id on
  a section.

## The playground and the two ways to go live

- `Playground.tsx` shows the widget at its real size and restyles it with eight
  of the configurator's settings (colour incl. any colour, corners, header,
  chat background, font, suggested-question layout, launcher, language). All
  of it is CSS variables (`--w-accent`, `--w-radius`, `--w-font`, the `--w-*`
  surface colours) and `data-*` attributes on `WidgetFrame`; fonts come from
  the product's own `fontStack()` (`lib/fonts.ts`).
- The settings sit in an editor-style panel: titled groups (Look, Layout,
  Language and voice) of label | control rows, with a Reset.
- From 1280px wide the section is one screen: text, widget and panel share a
  row, the section is `100svh - 4rem` tall, and the widget's height follows the
  screen (`clamp(33.5rem, 100svh - 13rem, 39.5rem)`), so everything is in view
  at once on a laptop (owner's request). Adding a settings row or lengthening
  the text can push it past one screen: re-check at 1440x790.
- Its play buttons (in the widget and in the panel) speak the greeting in the
  selected language from `public/landing/greeting-{en,lt}.mp3`. Those are
  recordings made by `node scripts/gen-landing-greeting.mjs [enVoiceId]
  [ltVoiceId]` with ElevenLabs `eleven_v3`: "Archer - Conversational" for
  English, "Alexandra - Conversational and Real" for Lithuanian (owner's pick).
  The Lithuanian copy is therefore feminine ("asistentė", "Virtuali asistentė").
  The plain "Archer" voice read the line with second-long pauses. v3 varies
  between runs, so listen and re-run if a take drags. The spoken text must
  equal `COPY[lang].greeting` in `Playground.tsx`: change one, re-run the script.
- `HowItWorks.tsx` leads with done-for-you (owner decision, 2026-11-10: many
  clients would rather not set it up themselves) and keeps self-serve beside
  it. Its package chooser, price and timeline read `lib/setup-packages.ts`; the
  "what we build" sentence per package (`BUILD`) restates that file's feature
  lists by hand, so keep the two in step.
- The signup dialog and `/api/signup` both require a website
  (`lib/website.ts`, `isWebsite`): Loqara answers from one.

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
  the clock, the inbox, the playground (incl. the greeting clip being
  requested) and the done-for-you path.
- `node scripts/landing-shots.mjs <outDir> [width height]` takes real-timing
  screenshots (hero, hero scrolled, a scene, the close, the footer) in headless
  Chromium with the GPU on, so the WebGL sky actually renders.
- The in-app Browser pane, when hidden, barely advances CSS animation time, so
  its screenshots show half-played states. Use the two commands above.

> ⚠️ verify: Safari and Firefox were not tested. Browsers without scroll-driven
> animations should show scenes fully revealed (the `@supports` fallback), which
> has only been reasoned about, not seen.

_Last verified: 2026-11-10 (branch `landing-night-shift`)._
