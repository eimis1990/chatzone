# Landing page ("one day in a store")

The `/` page tells one story top to bottom: it is 02:47, a shopper is being
answered; the night passes scene by scene; the sun comes up on the inbox; the
day covers setup; dusk falls over pricing; and the page ends at night again.
Every product feature is shown as a small live scene, not a screenshot.

Assembly order is `app/page.tsx` (the `<main>` block). Code lives in
`components/landing/night/`; one CSS module, `night.module.css`, ships only on `/`.

## The offer, and the voice (read before touching copy)

Reviewed 2026-11-11 with the owner; these are decisions, not drafts.

- **One offer: "See it on my store".** Visitors cannot create an account
  (`app/(auth)/` has login, reset and accept-invite only; `/api/signup` stores a
  request and emails the owner). So every request button says the same thing and
  the page promises exactly this: send your store's address, and within one
  working day you are emailed a preview of the assistant answering on your own
  site, free. Never write "get started", "start free", "sign up", "live in
  minutes" or "tonight" as something the visitor gets by clicking. The dialog's
  confirmation names who writes (Eimantas, the founder), from where
  (hello@loqara.com) and when. `tests/e2e/public-landing.spec.ts` ("the request
  form promises a preview, not instant access") guards the button labels.
- **Every scene has three beats** (`Scene.tsx`): what Loqara does, what the
  owner gets (`gain`, one sentence about them), and what it needs (`fine`: plan,
  add-on, platform). The night shown is Starter + Voice, and the pricing intro
  says so with the sum from `lib/plans-catalog.ts`.
- **The page is in English; Lithuanian is a choice.** Conversations default to
  English, the language switches are labelled "Lithuanian", and example emails
  are `@example.com`. Names (Greta, Marta, Jonas) are regional on purpose.
  "Ieva" was dropped: in the display face its capital I reads as a lowercase l.
- **American spelling** (catalog, color, customize, meter, installments), to
  match `en_US` and the rest of the product. **12-hour times** everywhere
  ("2:47 AM"), including the nav clock.
- **Words:** the product on a store is "your assistant"; "agent" appears only in
  the category phrase "AI chat and voice agent"; never "bot" in visitor-facing
  copy. The people it talks to are "shoppers". The owner's staff are "your
  team"; one of them is "a person". The score is "AI success".
- **No em dashes, no "&", no "~"** in copy; plain sentences.
- **Nothing unbacked:** no "most popular" (the badge says "Recommended"), no
  "most businesses", no comparisons with other tools, no phone calls (voice is
  in the widget only), no SSO. The founder is named because `/about` already
  says one person builds Loqara and answers support.
- **Display type has one setting per role** (`night.module.css`, the comment
  above `.title`): Bricolage Grotesque near normal width (wdth 95-100), weight
  580-600, tracking no tighter than -0.022em, and none at 30px or below. The
  first version (wdth 88, weight 650, -0.035em) read as a poster and fused
  letters ("It's", the colon in "2:47"). Prices everywhere use `.priceBig`.
- **Radar labels are plain words** for the product's three issue types:
  "Missing answer" (knowledge gap), "Not found in search" (product gap), "Not
  offered" (store limitation).

## The pieces

| Section | Component | Time (`data-clock`) |
|---|---|---|
| Hero: the lit widget on a shader sky | `NightHero.tsx`, `HeroWindow.tsx`, `NightSky.tsx`, `LiveChatButton.tsx` | 2:47 AM (167) |
| Order status (English, Lithuanian on request) | `SceneOrder.tsx` | 3:12 AM (192) |
| Voice call | `SceneVoice.tsx` | 04:05 (245) |
| "It does not guess" → lead → handoff | `SceneHandoff.tsx` | 05:20 (320) |
| Sunrise + morning inbox | `Morning.tsx` | 07:30 (450) |
| Analytics strip + Demand Radar | `Radar.tsx` | 08:30 (510) |
| Widget playground at real size (`#showcase`) | `Playground.tsx` | 10:00 (600) |
| Two ways to go live (`#how`) | `HowItWorks.tsx` | 13:00 (780) |
| Pricing, done-for-you, FAQ | `../Pricing.tsx`, `../SetupPricing.tsx`, `../Faq.tsx` | 18:30, 20:30, 22:30 |
| Close ("again tonight"), with the fox | `Tonight.tsx`, `NightFox.tsx` | 02:47 next day (1607) |

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
  nav) shows a section's own time while that section is on screen, so it always
  agrees with the time printed in the scene, and runs forward to the next
  section's time only as that section slides in; `LandingNav.tsx:31` wears the tone of the last `data-tone` section
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
  `#101213` so the page runs into `Footer` with no seam.
- **The fox at the close is a transparent video with a still under it**
  (`NightFox.tsx`, owner's request 2026-11-10). The still is the loop's first
  frame, so the two line up. The loop is `preload="none"` and starts only when
  the fox nears the screen; reduced motion and Save-Data never fetch it. It
  replaces the still only after a frame is drawn to a canvas and its corner
  reads as transparent, because a browser can play the HEVC file and drop its
  alpha (a box behind the fox). Sources: HEVC+alpha first (the only transparent
  video Safari plays), then VP9+alpha.
- **The fox is cut for a dark page.** `scripts/key-hero-fox.sh` rebuilds both
  loops and the poster from the opaque `hero-fox-idle.mp4` (about 2 minutes).
  It erodes 2.2px and clears a clip-specific gap by the right hand; the cut made
  for the old light page left a pale rim and a white speck on dark.
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
- Voice is an add-on. The inbox and the Analytics strip total the page's own
  four example conversations, labelled as an example; no performance metrics
  are invented. Metric names are the product's (`AnalyticsSection.tsx`).
- In the Demand Radar scene only "Add an FAQ" and "Add a missing synonym" are
  shown as changing the assistant, because only those do
  ([demand-radar](demand-radar.md)). Everything else is "saved for review".
  The scene's opening item is Jonas's 05:20 question, scored 2/5 in the inbox,
  which is what makes it unresolved.

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

## Known gaps (2026-11-11)

- White text on the brand orange (`#e97634`) is 3.0:1, below the 4.5:1 that
  14-16px text needs. It is a documented brand choice (`app/globals.css`,
  `--primary`), so it was left; closing it means a darker button orange.
- The live widget's proactive greeting bubble covers page copy on phones, and
  its launcher paints above the request dialog's scrim. Both come from
  `public/widget.js` and the landing bot's own config, not from this page.
  Hiding the bubble with CSS was tried and dropped: the greeting sound would
  still play with nothing on screen.
- The site `<title>` and meta description (`app/layout.tsx`) still say "for any
  website" while the page says "online stores". Left alone because the title is
  an SEO asset with a measured baseline ([seo-baselines](seo-baselines.md)).

> ⚠️ verify: the fox's HEVC file does carry
> an alpha track (checked with AVFoundation), but Safari playing it, and the
> canvas alpha check passing there, are unseen; if the check fails Safari shows
> the still.

> ⚠️ verify: Safari and Firefox were not tested. Browsers without scroll-driven
> animations should show scenes fully revealed (the `@supports` fallback), which
> has only been reasoned about, not seen.

_Last verified: 2026-11-10 (branch `landing-night-shift`)._
