'use client'

import { useRouter, usePathname } from 'next/navigation'
import { CalendarIcon } from 'lucide-react'
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select'

interface AnalyticsRangeSelectorProps {
  /** Active window in days (7 | 30 | 90). */
  range: number
  /** Human date span, e.g. "Jun 17 – Jun 23, 2026". */
  rangeLabel: string
}

/** Interval picker that scopes the analytics window via the `range` query param. */
export function AnalyticsRangeSelector({ range, rangeLabel }: AnalyticsRangeSelectorProps) {
  const router = useRouter()
  const pathname = usePathname()

  return (
    <div className="flex items-center gap-2">
      <span className="hidden items-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm text-muted-foreground md:inline-flex">
        <CalendarIcon className="size-4" aria-hidden="true" />
        {rangeLabel}
      </span>
      <Select
        value={String(range)}
        onValueChange={(v) => router.push(`${pathname}?range=${v}`)}
      >
        <SelectTrigger className="w-[150px]">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="7">Last 7 days</SelectItem>
          <SelectItem value="30">Last 30 days</SelectItem>
          <SelectItem value="90">Last 90 days</SelectItem>
        </SelectContent>
      </Select>
    </div>
  )
}
