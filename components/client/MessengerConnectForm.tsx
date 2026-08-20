'use client'

import Image from 'next/image'
import { useState } from 'react'
import { useFormStatus } from 'react-dom'
import { CheckIcon, BotIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Spinner } from '@/components/ui/spinner'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { cn } from '@/lib/utils'

interface PageOption {
  id: string
  name: string
  picture: string | null
}

function SubmitButton() {
  const { pending } = useFormStatus()
  return (
    <Button type="submit" disabled={pending} className="h-10 self-start px-6">
      {pending ? (
        <>
          <Spinner />
          Connecting…
        </>
      ) : (
        'Connect Page'
      )}
    </Button>
  )
}

/** Page picker + answering-bot select for the Messenger connect flow. */
export function MessengerConnectForm({
  pages,
  bots,
  defaultBotId,
  action,
}: {
  pages: PageOption[]
  bots: { id: string; name: string }[]
  defaultBotId?: string
  action: (formData: FormData) => Promise<void>
}) {
  const [pageId, setPageId] = useState(pages[0]?.id ?? '')
  const [botId, setBotId] = useState(defaultBotId ?? bots[0]?.id ?? '')

  return (
    <form action={action} className="flex flex-col gap-6 rounded-xl border bg-card p-5">
      <input type="hidden" name="pageId" value={pageId} />
      <input type="hidden" name="botId" value={botId} />

      <fieldset className="flex flex-col gap-2">
        <legend className="mb-2 text-sm font-medium">
          Facebook Page
          <span className="ml-2 font-normal text-muted-foreground">
            {pages.length === 1 ? '1 Page available' : `${pages.length} Pages available`}
          </span>
        </legend>
        {pages.map((p) => {
          const selected = p.id === pageId
          return (
            <button
              key={p.id}
              type="button"
              role="radio"
              aria-checked={selected}
              onClick={() => setPageId(p.id)}
              className={cn(
                'flex items-center gap-3 rounded-lg border p-3 text-left transition-colors',
                selected ? 'border-primary bg-primary/5' : 'hover:bg-muted/50',
              )}
            >
              {p.picture ? (
                <Image
                  src={p.picture}
                  alt=""
                  width={36}
                  height={36}
                  className="size-9 rounded-full border"
                  unoptimized
                />
              ) : (
                <span className="flex size-9 items-center justify-center rounded-full bg-muted text-sm font-semibold text-muted-foreground">
                  {p.name.slice(0, 1)}
                </span>
              )}
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-medium">{p.name}</span>
                <span className="block text-xs text-muted-foreground">Facebook Page</span>
              </span>
              <span
                aria-hidden="true"
                className={cn(
                  'flex size-5 items-center justify-center rounded-full border transition-colors',
                  selected ? 'border-primary bg-primary text-primary-foreground' : 'border-input',
                )}
              >
                {selected && <CheckIcon className="size-3" />}
              </span>
            </button>
          )
        })}
      </fieldset>

      <div className="space-y-1.5">
        <Label htmlFor="connect-bot">Answering chatbot</Label>
        <Select value={botId} onValueChange={(v) => v && setBotId(v as string)}>
          <SelectTrigger id="connect-bot" className="w-full bg-card">
            <BotIcon className="size-4 text-muted-foreground" aria-hidden="true" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {bots.map((b) => (
              <SelectItem key={b.id} value={b.id}>
                {b.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <p className="text-xs text-muted-foreground">
          This bot answers every Messenger conversation on the selected Page.
        </p>
      </div>

      <SubmitButton />
    </form>
  )
}
