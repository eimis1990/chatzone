'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowRightLeftIcon, CheckIcon, TriangleAlertIcon } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { transferDemoBot } from '@/app/(owner)/owner/demos/actions'

/** A client org the demo can move to — flags precomputed server-side. */
export interface TransferTargetOrg {
  id: string
  name: string
  plan: string
  /** Org already at its plan's bot limit — transfer would be rejected. */
  botsFull: boolean
  /** Org lacks the voice add-on (matters only if the demo uses voice). */
  voiceAddon: boolean
}

export function TransferDemoDialog({
  botId,
  botName,
  usesVoice,
  orgs,
}: {
  botId: string
  botName: string
  usesVoice: boolean
  orgs: TransferTargetOrg[]
}) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [orgId, setOrgId] = useState('')
  const [purge, setPurge] = useState(true)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const target = orgs.find((o) => o.id === orgId)

  async function handleTransfer() {
    if (!target) return
    setError(null)
    setLoading(true)
    const res = await transferDemoBot(botId, target.id, { keepHistory: !purge })
    setLoading(false)
    if (!res.success) {
      setError(res.error ?? 'Transfer failed.')
      return
    }
    setOpen(false)
    router.refresh()
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); setError(null) }}>
      {/* Icon-only: the card's button row already holds Configure + Present. */}
      <DialogTrigger
        render={
          <Button
            variant="outline"
            size="icon-lg"
            title="Transfer to a client"
            aria-label={`Transfer ${botName} to a client`}
          >
            <ArrowRightLeftIcon aria-hidden="true" />
          </Button>
        }
      />
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Transfer “{botName}” to a client</DialogTitle>
          <DialogDescription>
            The whole prepared bot moves — synced catalog, knowledge, prompt, look, component
            picks — and the embed snippet keeps working.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <p className="text-sm font-medium">Client organization</p>
            <div
              role="radiogroup"
              aria-label="Client organization"
              className="max-h-56 space-y-1.5 overflow-y-auto pr-0.5"
              style={{ scrollbarWidth: 'thin' }}
            >
              {orgs.map((o) => {
                const selected = o.id === orgId
                return (
                  <button
                    key={o.id}
                    type="button"
                    role="radio"
                    aria-checked={selected}
                    disabled={o.botsFull}
                    onClick={() => setOrgId(o.id)}
                    className={cn(
                      'flex w-full items-center gap-3 rounded-xl border bg-card p-2.5 text-left transition-all outline-none focus-visible:ring-2 focus-visible:ring-primary/40',
                      selected
                        ? 'border-primary ring-2 ring-primary/30'
                        : 'hover:border-foreground/20',
                      o.botsFull && 'cursor-not-allowed opacity-50 hover:border-border',
                    )}
                  >
                    <span
                      className={cn(
                        'flex size-9 shrink-0 items-center justify-center rounded-full text-sm font-semibold',
                        selected ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground',
                      )}
                    >
                      {o.name.trim().charAt(0).toUpperCase()}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium">{o.name}</span>
                      <span className="block text-xs text-muted-foreground">
                        {o.botsFull ? 'Bot limit reached on this plan' : 'Ready to receive the bot'}
                      </span>
                    </span>
                    <span
                      className={cn(
                        'shrink-0 rounded-full px-2 py-0.5 text-xs font-medium capitalize',
                        selected ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground',
                      )}
                    >
                      {o.plan}
                    </span>
                    {selected && (
                      <CheckIcon className="size-4 shrink-0 text-primary" aria-hidden="true" />
                    )}
                  </button>
                )
              })}
              {orgs.length === 0 && (
                <p className="rounded-xl border border-dashed p-3 text-sm text-muted-foreground">
                  No client organizations yet — the client needs to sign up first.
                </p>
              )}
            </div>
          </div>

          {usesVoice && target && !target.voiceAddon && (
            <p className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
              <TriangleAlertIcon className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
              This demo uses voice, but {target.name} doesn&rsquo;t have the voice add-on — voice
              stays off until you enable it on their billing.
            </p>
          )}

          <label className="flex cursor-pointer items-start gap-2.5 rounded-xl border bg-card p-3 text-sm transition-colors hover:border-foreground/20">
            <Checkbox
              checked={purge}
              onCheckedChange={(v) => setPurge(v === true)}
              className="mt-0.5"
            />
            <span>
              Delete demo conversations, events and leads
              <span className="mt-0.5 block text-xs font-normal text-muted-foreground">
                Recommended — pitch transcripts would show up in the client&rsquo;s inbox and
                analytics.
              </span>
            </span>
          </label>

          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>

        <DialogFooter>
          <Button variant="outline" size="lg" onClick={() => setOpen(false)} disabled={loading}>
            Cancel
          </Button>
          <Button size="lg" onClick={handleTransfer} disabled={!target || loading}>
            <ArrowRightLeftIcon data-icon="inline-start" />
            {loading ? 'Transferring…' : 'Transfer bot'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
