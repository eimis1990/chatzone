'use client'

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts'

export interface HourCount {
  hour: string // "00".."23" (local business timezone)
  count: number
  afterHours: boolean
}

interface HourHistogramProps {
  data: HourCount[]
}

/**
 * Conversations by local hour of day. After-hours bars (evenings, plus all
 * weekend conversations folded into their hour) are tinted amber so the
 * "the bot answers while you're closed" story reads at a glance.
 */
export function HourHistogram({ data }: HourHistogramProps) {
  if (data.every((d) => d.count === 0)) {
    return (
      <div className="flex items-center justify-center h-48 text-muted-foreground text-sm">
        No data for this period
      </div>
    )
  }

  return (
    <ResponsiveContainer width="100%" height={200}>
      <BarChart data={data} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" className="stroke-border" vertical={false} />
        <XAxis dataKey="hour" tick={{ fontSize: 11 }} interval={2} className="fill-muted-foreground" />
        <YAxis tick={{ fontSize: 11 }} allowDecimals={false} className="fill-muted-foreground" />
        <Tooltip
          contentStyle={{ fontSize: 12 }}
          labelFormatter={(v) => `${v}:00`}
          formatter={(v, _n, entry) => [v, entry?.payload?.afterHours ? 'Conversations (after hours)' : 'Conversations']}
        />
        <Bar dataKey="count" radius={[3, 3, 0, 0]}>
          {data.map((d) => (
            <Cell key={d.hour} fill={d.afterHours ? '#f59e0b' : 'var(--primary)'} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}
