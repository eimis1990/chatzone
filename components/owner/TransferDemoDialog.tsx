'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowRightLeftIcon, TriangleAlertIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
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
            picks. The embed snippet keeps working. This is how a demo becomes the client&rsquo;s
            real bot.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label>Client organization</Label>
            <Select value={orgId} onValueChange={(v) => setOrgId(v ?? '')}>
              <SelectTrigger>
                <SelectValue placeholder="Choose a client…" />
              </SelectTrigger>
              <SelectContent>
                {orgs.map((o) => (
                  <SelectItem key={o.id} value={o.id} disabled={o.botsFull}>
                    {o.name} · {o.plan}
                    {o.botsFull ? ' — bot limit reached' : ''}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {usesVoice && target && !target.voiceAddon && (
            <p className="flex items-start gap-2 rounded-lg bg-amber-50 p-3 text-xs text-amber-800">
              <TriangleAlertIcon className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
              This demo uses voice, but {target.name} doesn&rsquo;t have the voice add-on — voice
              stays off until you enable it on their billing.
            </p>
          )}

          <label className="flex items-start gap-2 text-sm">
            <Checkbox
              checked={purge}
              onCheckedChange={(v) => setPurge(v === true)}
              className="mt-0.5"
            />
            <span>
              Delete demo conversations, events and leads
              <span className="block text-xs text-muted-foreground">
                Recommended — pitch transcripts would show up in the client&rsquo;s inbox and
                analytics.
              </span>
            </span>
          </label>

          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={loading}>
            Cancel
          </Button>
          <Button onClick={handleTransfer} disabled={!target || loading}>
            {loading ? 'Transferring…' : 'Transfer bot'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
