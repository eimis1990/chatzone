'use client'

import { Button } from '@/components/ui/button'

interface SignupRow {
  email: string
  source: string | null
  created_at: string
}

function csvCell(value: string): string {
  // Quote + escape so commas/quotes/newlines don't break the CSV.
  return `"${value.replace(/"/g, '""')}"`
}

export function SignupsExport({ rows }: { rows: SignupRow[] }) {
  const download = () => {
    const header = ['email', 'source', 'created_at']
    const lines = [
      header.join(','),
      ...rows.map((r) => [r.email, r.source ?? '', r.created_at].map(csvCell).join(',')),
    ]
    const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `loqara-signups-${new Date().toISOString().slice(0, 10)}.csv`
    document.body.appendChild(a)
    a.click()
    a.remove()
    URL.revokeObjectURL(url)
  }

  return (
    <Button type="button" variant="outline" size="sm" onClick={download} disabled={rows.length === 0}>
      Export CSV
    </Button>
  )
}
