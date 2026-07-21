#!/usr/bin/env node

import { readFileSync } from 'node:fs'

const reports = process.argv.slice(2)

if (reports.length === 0) {
  console.error('Usage: node scripts/summarize-lighthouse.mjs <report.json> [...]')
  process.exit(1)
}

const milliseconds = (value) =>
  Number.isFinite(value) ? `${(value / 1000).toFixed(2)} s` : 'n/a'

const megabytes = (value) =>
  Number.isFinite(value) ? `${(value / 1_000_000).toFixed(2)} MB` : 'n/a'

for (const reportPath of reports) {
  const report = JSON.parse(readFileSync(reportPath, 'utf8'))
  const metrics = report.audits?.metrics?.details?.items?.[0] ?? {}
  const requests = report.audits?.['network-requests']?.details?.items ?? []
  const resourceBytes = new Map()

  for (const request of requests) {
    const type = request.resourceType ?? 'Other'
    resourceBytes.set(type, (resourceBytes.get(type) ?? 0) + (request.transferSize ?? 0))
  }

  const scores = Object.fromEntries(
    Object.entries(report.categories ?? {}).map(([key, category]) => [
      key,
      Number.isFinite(category.score) ? Math.round(category.score * 100) : 'n/a',
    ]),
  )

  console.log(`## ${report.finalDisplayedUrl ?? report.finalUrl ?? report.requestedUrl}`)
  console.log('')
  console.log(`- Report: \`${reportPath}\``)
  console.log(`- Lighthouse: ${report.lighthouseVersion ?? 'unknown'}`)
  console.log(`- Captured: ${report.fetchTime ?? 'unknown'}`)
  console.log(`- Form factor: ${report.configSettings?.formFactor ?? 'unknown'}`)
  console.log(
    `- Scores: ${Object.entries(scores)
      .map(([key, value]) => `${key} ${value}`)
      .join(', ')}`,
  )
  console.log(
    `- Metrics: FCP ${milliseconds(metrics.firstContentfulPaint)}, LCP ${milliseconds(metrics.largestContentfulPaint)}, Speed Index ${milliseconds(metrics.speedIndex)}, TBT ${Math.round(metrics.totalBlockingTime ?? 0)} ms, CLS ${(metrics.cumulativeLayoutShift ?? 0).toFixed(3)}`,
  )
  console.log(
    `- Network: ${requests.length} requests, ${megabytes(report.audits?.['total-byte-weight']?.numericValue)}`,
  )

  const breakdown = [...resourceBytes.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([type, bytes]) => `${type} ${megabytes(bytes)}`)
    .join(', ')

  if (breakdown) console.log(`- Transfer by resource type: ${breakdown}`)
  console.log('')
}
