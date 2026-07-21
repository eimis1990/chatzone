# Public SEO/performance baseline — 2026-07-20

Companion evidence for the
[remediation design](superpowers/specs/2026-07-20-seo-geo-remediation-design.md)
and [implementation plan](superpowers/plans/2026-07-20-seo-geo-remediation.md).

## Audit environment

- Production URLs: `https://www.loqara.com/` and `https://www.loqara.com/blog`
- Captured: 2026-07-20 20:07–20:11 UTC
- Repository SHA at audit time: `ba6f82d`
- Lighthouse: 13.4.1 CLI
- Browser: extension-free Headless Chrome 150
- Form factor: mobile, 412 × 823 CSS px, device scale factor 1.75
- Simulation: 150 ms RTT, 1,638.4 Kbps throughput, 4× CPU slowdown
- Categories: Performance, Accessibility, Best Practices, SEO on `/`; Performance,
  Accessibility, SEO on `/blog`
- Storage reset: enabled

The supplied desktop HTML report is retained at
`/Users/eimantaskudarauskas/Desktop/www.loqara.com-20260720T225809.html`.
Its Best Practices score of 58 is not a production baseline: a browser extension
injected more than 500 KB of JavaScript and caused deprecated-API/third-party-cookie
findings. That run also timed out during the full-page screenshot. The clean run
scored 100 for Best Practices.

## Clean mobile results

| Route | Performance | Accessibility | Best Practices | SEO | FCP | LCP | Speed Index | TBT | CLS | Transfer | Requests |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| `/` | 61 | 89 | 100 | 100 | 3.60 s | 11.26 s | 7.89 s | 37 ms | 0 | 10.78 MB | 66 |
| `/blog` | 63 | 100 | not run | 100 | 3.48 s | 10.84 s | 6.12 s | 25 ms | 0 | 2.53 MB | 112 |

Dominant verified findings:

- Homepage video transfer was approximately 7.97 MB across the intro and loop.
- Homepage total image transfer was approximately 2.16 MB, with roughly 1.47 MB
  of potential image-delivery savings.
- Public routes made 11 font requests totaling approximately 249 KB.
- The blog index rendered all 51 posts, producing 104 image elements, 54 image
  preloads, and 58 image requests.
- The homepage LCP candidate was hero text initially rendered at opacity zero and
  revealed only after client hydration.

These are lab regression measurements, not field Core Web Vitals. Field acceptance
uses Search Console/CrUX at the 75th percentile after release.

## Reproduction

Run each audit three times against the same deployed SHA and use the median:

```bash
npx --yes lighthouse https://www.loqara.com/ \
  --output=json --output-path=/tmp/loqara-home.json \
  --chrome-flags="--headless --no-sandbox --disable-extensions" \
  --only-categories=performance,accessibility,best-practices,seo --quiet

npx --yes lighthouse https://www.loqara.com/blog \
  --output=json --output-path=/tmp/loqara-blog.json \
  --chrome-flags="--headless --no-sandbox --disable-extensions" \
  --only-categories=performance,accessibility,best-practices,seo --quiet
```

Summarize one or more JSON reports without additional dependencies:

```bash
node scripts/summarize-lighthouse.mjs /tmp/loqara-home.json /tmp/loqara-blog.json
```

Record the URL, deployment SHA, capture time, Lighthouse version, median scores,
metrics, bytes, and request count with every phase gate.

## Phase 1 checkpoint — 2026-07-21

Measured against a local optimized production build (`next build` + `next start`)
with the same Lighthouse mobile simulation. This is directional rather than a
production-to-production comparison because localhost removes production network
latency. Three runs produced these medians:

| Performance | Accessibility | Best Practices | SEO | FCP | LCP | Speed Index | TBT | CLS | Transfer |
|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| 79 | 89 | 96* | 100 | 1.21 s | 5.83 s | 2.28 s | 10 ms | 0 | 10.34 MB |

`*` Local Best Practices lost four points only because Vercel Analytics' production
`/_vercel/insights/script.js` endpoint returns 404 under `next start`. The clean
production baseline for Best Practices remains 100.

Phase 1 removed hydration-dependent opacity from the hero and all rendered landing
reveal wrappers, removed Lenis, and made the reduced-motion hero hydration-safe.
The LCP breakdown now reports approximately 127 ms of element render delay instead
of the multi-second hydration delay. The remaining lab LCP/transfer constraint is
the unchanged 7.96 MB hero-video payload, owned by Phase 2.

## Phase 2 hero-media checkpoint — 2026-07-21

Measured across three serial Lighthouse runs against the optimized local
production build, using the same mobile simulation as Phase 1:

| Performance | Accessibility | Best Practices | SEO | FCP | LCP | Speed Index | TBT | CLS | Transfer | Requests |
|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| 78 | 89 | 96* | 100 | 1.21 s | 6.03 s | 2.23 s | 10 ms | 0 | 2.31 MB | 57 |

The responsive, sequential media state machine reduced total transfer from the
Phase 1 checkpoint's 10.34 MB to 2.31 MB (−77.7%). Media transfer fell from
7.96 MB to 0.32 MB because the mobile audit requests the 317 KB intro only; the
267 KB loop is assigned after the 5.04-second intro completes. The original
production baseline was 10.78 MB and 11.26-second LCP.

Reduced-motion, Save-Data, and 2G policy paths make zero video requests. Browser
instrumentation also confirmed the mobile intro and loop never download
concurrently. The remaining initial payload is led by 1.34 MB of images, primarily
the chat-view showcase addressed by Task 2.3.

`*` As in Phase 1, local Best Practices is 96 only because the production-only
Vercel Analytics endpoint returns 404 under `next start`.

### Phase 2 showcase checkpoint

After replacing 11 mounted PNGs with bounded responsive WebPs and zero-byte CSS
outer-wing placeholders, three additional serial runs produced these medians:

| Performance | Accessibility | Best Practices | SEO | FCP | LCP | Speed Index | TBT | CLS | Transfer | Requests |
|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| 79 | 89 | 96* | 100 | 1.21 s | 5.83 s | 2.16 s | 10 ms | 0 | 1.28 MB | 53 |

Image transfer fell from 1.34 MB at the hero-media checkpoint to 0.30 MB. Total
transfer is now 88.1% below the 10.78 MB production baseline and 87.6% below the
10.34 MB Phase 1 local checkpoint. The interaction regression proves at most
three showcase images are mounted/requested initially and covers side-card click,
Previous wrap, and swipe navigation across the complete 11-design set.

### Phase 2 completion checkpoint

After responsive How it works images, two global font preloads, single-state nav
logo delivery, and deferred live-widget loading, the final three-run median is:

| Performance | Accessibility | Best Practices | SEO | FCP | LCP | Speed Index | TBT | CLS | Transfer | Requests |
|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| 85 | 89 | 96* | 100 | 1.21 s | 4.30 s | 1.49 s | 9 ms | 0 | 0.94 MB | 38 |

Resource medians are 0.32 MB media, 0.30 MB script, 0.18 MB image, 0.06 MB font,
0.04 MB CSS, and 0.03 MB document. `/`, `/blog`, and `/login` each expose two
font preloads; the invalid embed smoke URL returns no font preload. Homepage HTML
has zero image preloads because its LCP candidate is the server-rendered hero
paragraph, not an image. The widget loader/config/embed requests are absent from
the initial trace and a browser regression proves the proxy's first click both
loads and opens the real widget.

The simulated LCP remains above the 3.5-second stretch target even though the
observed local LCP is 128 ms and the text element's observed render delay is
~122 ms. The dominant actionable insight is two render-blocking CSS files totaling
~35 KB, with Lighthouse estimating 410 ms savings. This is tracked as Task 6.5;
Phase 2's media/image/font/widget budgets are complete.
