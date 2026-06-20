'use client'

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts'

export interface QuestionCount {
  question: string
  count: number
}

interface TopQuestionsChartProps {
  data: QuestionCount[]
}

export function TopQuestionsChart({ data }: TopQuestionsChartProps) {
  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-48 text-muted-foreground text-sm">
        No user questions yet
      </div>
    )
  }

  return (
    <ol className="space-y-2">
      {data.map((item, i) => (
        <li key={i} className="flex items-center gap-3">
          <span className="shrink-0 w-5 text-right text-xs text-muted-foreground font-mono">
            {i + 1}.
          </span>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-2 mb-1">
              <span className="text-sm truncate">{item.question}</span>
              <span className="shrink-0 text-xs font-medium tabular-nums text-muted-foreground">
                {item.count}
              </span>
            </div>
            <div className="w-full bg-muted rounded-full h-1.5">
              <div
                className="bg-primary h-1.5 rounded-full transition-all"
                style={{ width: `${Math.round((item.count / (data[0]?.count ?? 1)) * 100)}%` }}
              />
            </div>
          </div>
        </li>
      ))}
    </ol>
  )
}
