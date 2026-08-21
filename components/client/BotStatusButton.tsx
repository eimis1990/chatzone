'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { PauseIcon, PlayIcon, Loader2Icon } from 'lucide-react'
import { toast } from 'sonner'
import { setBotStatus } from '@/lib/actions/setBotStatus'
import type { BotStatus } from '@/lib/types'

/**
 * Pause/activate toggle on a bot card. Pausing stops the bot everywhere
 * (widget, voice, Messenger) without deleting anything; activating is
 * refused server-side when the plan's active-bot allowance is full.
 */
export function BotStatusButton({
  botId,
  botName,
  status,
}: {
  botId: string
  botName: string
  status: BotStatus
}) {
  const router = useRouter()
  const [busy, setBusy] = useState(false)
  const paused = status === 'paused'

  async function toggle() {
    setBusy(true)
    const next: BotStatus = paused ? 'active' : 'paused'
    const res = await setBotStatus(botId, next)
    if (res.error) toast.error(res.error)
    else {
      toast.success(next === 'paused' ? `"${botName}" paused — it stops answering everywhere` : `"${botName}" is active again`)
      router.refresh()
    }
    setBusy(false)
  }

  return (
    <button
      type="button"
      aria-label={paused ? `Activate ${botName}` : `Pause ${botName}`}
      title={paused ? 'Activate bot' : 'Pause bot (stops answering everywhere)'}
      disabled={busy}
      // The whole card is a link — this must not navigate.
      onClick={(e) => {
        e.preventDefault()
        e.stopPropagation()
        void toggle()
      }}
      className="flex size-7 items-center justify-center rounded-md text-muted-foreground/60 transition-colors hover:bg-muted hover:text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
    >
      {busy ? (
        <Loader2Icon className="size-4 animate-spin" />
      ) : paused ? (
        <PlayIcon className="size-4" />
      ) : (
        <PauseIcon className="size-4" />
      )}
    </button>
  )
}
