'use client'

import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'

export interface OrgBotComparisonDatum {
  name: string
  opens: number
  conversations: number
  leads: number
  linkClicks: number
}

/** Compact grouped bars for comparing the same engagement signals across bots. */
export function OrgBotComparisonChart({
  data,
}: {
  data: OrgBotComparisonDatum[]
}) {
  const chartHeight = Math.max(220, data.length * 64)
  const summary = data
    .map(
      (bot) =>
        `${bot.name}: ${bot.opens} opens, ${bot.conversations} conversations, ${bot.leads} leads, ${bot.linkClicks} link clicks`,
    )
    .join('. ')

  return (
    <div role="img" aria-label={`Bot engagement comparison. ${summary}`}>
      <ResponsiveContainer width="100%" height={chartHeight} minHeight={220}>
        <BarChart
          data={data}
          layout="vertical"
          margin={{ top: 4, right: 8, bottom: 4, left: 8 }}
          barCategoryGap="24%"
        >
          <CartesianGrid
            horizontal={false}
            stroke="var(--border)"
            strokeDasharray="3 3"
          />
          <XAxis
            type="number"
            allowDecimals={false}
            axisLine={false}
            tickLine={false}
            tick={{ fill: 'var(--muted-foreground)', fontSize: 12 }}
          />
          <YAxis
            type="category"
            dataKey="name"
            width={104}
            axisLine={false}
            tickLine={false}
            tick={{ fill: 'var(--foreground)', fontSize: 12, fontWeight: 500 }}
          />
          <Tooltip
            cursor={{ fill: 'var(--muted)' }}
            contentStyle={{
              borderColor: 'var(--border)',
              borderRadius: 'var(--radius)',
              background: 'var(--popover)',
              color: 'var(--popover-foreground)',
              boxShadow:
                '0 8px 24px color-mix(in srgb, var(--foreground) 10%, transparent)',
            }}
            formatter={(value, name) => [
              Number(value).toLocaleString(),
              String(name),
            ]}
          />
          <Legend
            iconType="circle"
            iconSize={8}
            wrapperStyle={{ color: 'var(--muted-foreground)', fontSize: 12 }}
          />
          <Bar
            dataKey="opens"
            name="Opens"
            fill="var(--chart-3)"
            radius={[0, 4, 4, 0]}
          />
          <Bar
            dataKey="conversations"
            name="Conversations"
            fill="var(--primary)"
            radius={[0, 4, 4, 0]}
          />
          <Bar
            dataKey="leads"
            name="Leads"
            fill="var(--chart-4)"
            radius={[0, 4, 4, 0]}
          />
          <Bar
            dataKey="linkClicks"
            name="Link clicks"
            fill="var(--chart-2)"
            radius={[0, 4, 4, 0]}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
