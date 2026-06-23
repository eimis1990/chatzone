'use client'

import { DownloadIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface ExportRow {
  label: string
  value: string | number
}

interface ExportReportButtonProps {
  rows: ExportRow[]
  filename: string
}

function csvCell(s: string): string {
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}

/** Downloads the current analytics period as a CSV (Metric,Value). */
export function ExportReportButton({ rows, filename }: ExportReportButtonProps) {
  function handleExport() {
    const csv = ['Metric,Value', ...rows.map((r) => `${csvCell(r.label)},${csvCell(String(r.value))}`)].join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    document.body.appendChild(a)
    a.click()
    a.remove()
    URL.revokeObjectURL(url)
  }

  return (
    <Button onClick={handleExport}>
      <DownloadIcon className="size-4" />
      Export
    </Button>
  )
}
