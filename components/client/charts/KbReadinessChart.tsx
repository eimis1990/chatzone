'use client'

import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts'

export interface StatusCount {
  status: string
  count: number
}

interface KbReadinessChartProps {
  data: StatusCount[]
}

const STATUS_COLORS: Record<string, string> = {
  ready: 'hsl(142, 71%, 45%)',
  processing: 'hsl(47, 96%, 53%)',
  pending: 'hsl(214, 84%, 56%)',
  error: 'hsl(0, 84%, 60%)',
}

export function KbReadinessChart({ data }: KbReadinessChartProps) {
  if (data.length === 0 || data.every((d) => d.count === 0)) {
    return (
      <div className="flex items-center justify-center h-40 text-muted-foreground text-sm">
        No knowledge sources
      </div>
    )
  }

  return (
    <div className="space-y-2">
      {data.map((item) => (
        <div key={item.status} className="flex items-center gap-3">
          <div
            className="w-2.5 h-2.5 rounded-full shrink-0"
            style={{ background: STATUS_COLORS[item.status] ?? '#888' }}
          />
          <span className="text-sm capitalize flex-1">{item.status}</span>
          <span className="text-sm font-medium tabular-nums">{item.count}</span>
        </div>
      ))}
    </div>
  )
}
