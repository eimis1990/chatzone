# Loqara landing page

The landing page at `/` was rebuilt in November 2026 as "one day in a store".
How it is put together, the rules that keep it working, and how to check it are
in [`docs/wiki/landing-page.md`](wiki/landing-page.md). The code is
`components/landing/night/` and `app/page.tsx`.

The previous page (fox hero videos, showcase carousel, feature screenshots) and
its delivery notes are in this file's git history.

## Still true

- Global font preloads are limited to Geist Sans (base UI) and the landing's
  display face, Bricolage Grotesque (`components/landing/night/fonts.ts`). Geist
  Mono and every selectable chat font use `preload: false`.
- The real widget is embedded on the page (`WidgetEmbed`, idle loading policy)
  when the owner has switched it on, so visitors can talk to the live bot.
