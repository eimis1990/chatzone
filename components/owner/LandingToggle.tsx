'use client'

import { useState, useTransition } from 'react'
import { toast } from 'sonner'
import { Switch } from '@/components/ui/switch'
import { setLandingVisible } from '@/app/(owner)/owner/chatbot/actions'

/**
 * Owner-only toggle (sits next to Save in the config header) that shows/hides
 * Loqara's own bot on the public landing page. Flips instantly — independent of
 * saving the config — so you can hide it while iterating, then flip it on.
 */
export function LandingToggle({ botId, initial }: { botId: string; initial: boolean }) {
  const [on, setOn] = useState(initial)
  const [pending, startTransition] = useTransition()

  function toggle(next: boolean) {
    setOn(next) // optimistic
    startTransition(async () => {
      try {
        await setLandingVisible(botId, next)
        toast.success(next ? 'Live on the landing page' : 'Hidden from the landing page')
      } catch (err) {
        setOn(!next)
        toast.error((err as Error).message)
      }
    })
  }

  return (
    <label className="flex cursor-pointer items-center gap-2.5 rounded-lg border bg-background px-3 py-1.5">
      <span className="text-right leading-tight">
        <span className="block text-xs font-medium">Show on landing</span>
        <span className={`block text-[11px] ${on ? 'text-green-600' : 'text-muted-foreground'}`}>
          {on ? '● Live' : 'Hidden'}
        </span>
      </span>
      <Switch
        checked={on}
        onCheckedChange={toggle}
        disabled={pending}
        aria-label="Show chatbot on the landing page"
      />
    </label>
  )
}
