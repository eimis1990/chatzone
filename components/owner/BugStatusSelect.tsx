'use client'

import { useState, useTransition } from 'react'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { updateBugStatus } from '@/app/(owner)/owner/bugs/actions'
import type { BugStatus } from '@/lib/types'

/** Owner-side status picker for a bug row (optimistic; reverts on error). */
export function BugStatusSelect({ id, status }: { id: string; status: BugStatus }) {
  const [value, setValue] = useState<BugStatus>(status)
  const [pending, startTransition] = useTransition()

  return (
    <Select
      value={value}
      onValueChange={(v) => {
        const next = v as BugStatus
        setValue(next)
        startTransition(() => {
          updateBugStatus(id, next).catch(() => setValue(status))
        })
      }}
    >
      <SelectTrigger className="h-8 w-[140px]" disabled={pending}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="open">Open</SelectItem>
        <SelectItem value="in_progress">In progress</SelectItem>
        <SelectItem value="resolved">Resolved</SelectItem>
      </SelectContent>
    </Select>
  )
}
