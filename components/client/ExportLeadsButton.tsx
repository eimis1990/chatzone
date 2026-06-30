'use client'

import { useState } from 'react'
import { DownloadIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { toCsv } from '@/lib/csv'
import type { Lead } from '@/lib/types'

interface ExportLeadsButtonProps {
  leads: Lead[]
  columns: string[]
  botName?: string
}

export function ExportLeadsButton({ leads, columns, botName }: ExportLeadsButtonProps) {
  const [exporting, setExporting] = useState(false)

  function handleExport() {
    setExporting(true)
    try {
      // Build rows with all columns (including created_at)
      const allColumns = ['created_at', ...columns.filter((c) => c !== 'created_at')]

      const rows = leads.map((lead) => ({
        created_at: lead.created_at,
        ...lead.fields,
      }))

      const csv = toCsv(rows, allColumns)
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
      const url = URL.createObjectURL(blob)

      const a = document.createElement('a')
      a.href = url
      const filename = `leads-${botName ?? 'bot'}-${new Date().toISOString().slice(0, 10)}.csv`
      a.download = filename
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } finally {
      setExporting(false)
    }
  }

  return (
    <Button
      onClick={handleExport}
      disabled={exporting || leads.length === 0}
      className="h-10 rounded-md px-7"
    >
      <DownloadIcon className="size-4" />
      {exporting ? 'Exporting…' : 'Export'}
    </Button>
  )
}
