'use client'

import { useState, useTransition } from 'react'
import { SparklesIcon } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Spinner } from '@/components/ui/spinner'

interface DemoOption {
  id: string
  name: string
}

export function DuplicateDemoBotForm({
  demos,
  action,
}: {
  demos: DemoOption[]
  action: (demoBotId: string) => Promise<{ id?: string; error?: string }>
}) {
  const [demoBotId, setDemoBotId] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  function duplicateDemo() {
    if (!demoBotId) return

    startTransition(async () => {
      const result = await action(demoBotId)
      if (result?.error) toast.error(result.error)
    })
  }

  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
      <Select value={demoBotId} onValueChange={(value) => setDemoBotId(value)}>
        <SelectTrigger className="w-full sm:w-52" aria-label="Prepared demo bot">
          <SelectValue placeholder="Choose a demo" />
        </SelectTrigger>
        <SelectContent alignItemWithTrigger={false}>
          <SelectGroup>
            {demos.map((demo) => (
              <SelectItem key={demo.id} value={demo.id}>
                {demo.name}
              </SelectItem>
            ))}
          </SelectGroup>
        </SelectContent>
      </Select>
      <Button variant="outline" className="h-10" onClick={duplicateDemo} disabled={!demoBotId || pending}>
        {pending ? (
          <Spinner data-icon="inline-start" />
        ) : (
          <SparklesIcon data-icon="inline-start" />
        )}
        {pending ? 'Creating…' : 'Use demo'}
      </Button>
    </div>
  )
}
