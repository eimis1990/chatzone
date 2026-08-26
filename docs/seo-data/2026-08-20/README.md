# Search performance baseline — 2026-08-20

Immutable raw exports used by the
[90-day search-visibility plan](../../superpowers/plans/2026-08-25-search-visibility-growth.md).
The CSV contents are byte-for-byte copies of the owner-supplied downloads; names
were normalized so future checkpoints can follow the same layout.

## Export scope

- **Google Search Console property:** `https://www.loqara.com/`
- **GSC filters:** Search type `Web`; UI range `Last 3 months`; no additional
  filter appears in `gsc-filters.csv`.
- **GSC chart dates present:** 2026-06-25 through 2026-08-17. Treat Aug 17 as
  the last complete exported day and compare complete periods only.
- **Bing Web Search dates present:** 2026-06-28 through 2026-08-17.
- **Bing AI Performance dates present:** 2026-06-29 through 2026-08-17.
- **Reporting timezone:** preserve engine-exported dates. Program review and
  scheduling use Europe/Vilnius; do not shift daily rows between timezones.

## Baseline summary

### Google Search Console

| Metric | Result |
| --- | ---: |
| Full exported property total | 29 clicks / 2,552 impressions / 1.14% CTR |
| Impression-weighted average position | 54.11 |
| Latest complete 28 days | 11 clicks / 1,139 impressions / 0.97% CTR |
| Previous complete 28 days | 18 clicks / 1,413 impressions / 1.27% CTR |
| Lithuania | 20 clicks / 48 impressions / position 12.42 |
| United States | 0 clicks / 1,211 impressions / position 58.25 |
| United Kingdom | 0 clicks / 318 impressions / position 64.41 |
| Netherlands | 0 clicks / 111 impressions / position 40.78 |
| Desktop | 18 clicks / 2,183 impressions / 0.82% CTR |
| Mobile | 11 clicks / 361 impressions / 3.05% CTR |

### Bing

| Metric | Result |
| --- | ---: |
| Web Search export | 1 click / 70 impressions / 1.43% CTR |
| AI citation events | 261 |
| Largest daily AI result | 31 citations / 7 cited pages |
| AI citations from 2026-08-07 through 2026-08-17 | 159 (61% of total) |

The GSC property chart is authoritative for property totals. Page and query
tables can have different totals because of aggregation and privacy thresholds.
The Bing AI overview does not expose the unique cited URLs or their grounding
queries, so those dimensions remain explicitly unmeasured until Task 0.3.

## Files and integrity hashes

| File | Source | SHA-256 |
| --- | --- | --- |
| `bing-search-performance.csv` | Bing Search Performance overview | `1868e42e1e22f80a836248aed0e88381ace4e7577f6349cb5c9b56dd5d590199` |
| `bing-ai-performance.csv` | Bing AI Performance overview | `915179508631e2916fec2cd48b4dc5f54aabb7cce21ec57c00a689141914cc9e` |
| `gsc-chart.csv` | GSC property chart | `44a0a7f9047ae63e0434ac7f634d820cbffc6bd2ddce5ee8c974c30ad1c47bfc` |
| `gsc-countries.csv` | GSC country table | `b4e02649256389b5ce30085b3d98d8fa3526f6b86666f04b65e00978ebfdb9bc` |
| `gsc-devices.csv` | GSC device table | `20a03b3c4d15c405ca285b439680c0133d66738c5c2212a23cee1981e34b1f4d` |
| `gsc-filters.csv` | GSC export filters | `163c07d6839b411e21df0e69bc8ae8a86013b42179da00682150503d1400951f` |
| `gsc-pages.csv` | GSC page table | `523bf4cb5f25815be719c3fb4719e4d51cc0836f970748565b6fcc2bb8be9c56` |
| `gsc-queries.csv` | GSC visible query table | `b289b798af32a25a7257d7f4a690161cf3d9206694552561d86f75cfea32c99c` |
| `gsc-search-appearance.csv` | GSC search-appearance table (header only) | `eed9ceafb9193e5e3d034f5897ad992bc851f1998204cd98f0b0f6873fbfc8b2` |

## Calculation rules

- Use `gsc-chart.csv` for property-level clicks, impressions, CTR, and period
  comparisons. Page/query table totals can differ because Google aggregates and
  withholds low-volume queries differently.
- Calculate a multi-row CTR as `sum(clicks) / sum(impressions)`, not the average
  of daily CTR percentages.
- Calculate a combined average position as
  `sum(position * impressions) / sum(impressions)`.
- Compare latest 28 complete rows with the preceding 28 complete rows. Do not
  mix a partial day into either window.
- Use page-filtered query exports—not the property-wide query table—to assign a
  query owner or diagnose cannibalization.
- Treat Bing `Citations` as citation events. Do not interpret `Cited Pages` as a
  unique-page total across days, and do not call citations rankings or clicks.

## Reproduction checklist

- [x] Raw exports archived without content changes.
- [x] Filters and present date ranges recorded.
- [x] Integrity hashes recorded and verified after copying.
- [x] Calculation definitions recorded.
- [ ] Add page-filtered GSC query exports when produced in Phase 0 Task 0.2.
- [ ] Add Bing cited-page and grounding-query exports when produced in Task 0.3.
