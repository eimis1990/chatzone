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
