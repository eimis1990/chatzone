'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { PlusIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '@/components/ui/dialog'
import { GridLoader } from '@/components/ui/GridLoader'
import { createBot } from '@/lib/actions/createBot'
import { trackEvent } from '@/lib/analytics'

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

interface CreateBotDialogProps {
  orgId: string
  /** Custom trigger element. Falls back to the default "Create BOT" button. */
  trigger?: React.ReactElement
  /**
   * Server action that creates the bot and returns its id. Defaults to the
   * client action (own org). The owner console passes a bound action that
   * creates the bot for a client org instead.
   */
  action?: (name: string) => Promise<{ id?: string; error?: string }>
  /** Base path for the post-create configure redirect. Default: /app/bots. */
  configureBase?: string
}

export function CreateBotDialog({
  orgId,
  trigger,
  action = createBot,
  configureBase = '/app/bots',
}: CreateBotDialogProps) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [name, setName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!name.trim()) return

    setError(null)
    setLoading(true)
    // Swap the dialog for the loader overlay immediately — no in-button state.
    setOpen(false)

    // Creation is fast — hold the loader ~2s so the transition reads as
    // deliberate rather than a flicker, then land on the new bot.
    const [res] = await Promise.all([action(name), sleep(2000)])

    if (res.error || !res.id) {
      // Bring the dialog back with the error so the user can retry.
      setLoading(false)
      setError(res.error ?? 'Failed to create bot. Please try again.')
      setOpen(true)
      return
    }

    trackEvent('bot_created', { orgId })
    // Keep `name` — the overlay shows it as its title until navigation lands.
    router.push(`${configureBase}/${res.id}/configure`)
    router.refresh()
    // Keep `loading` true — the overlay stays up until navigation unmounts us.
  }

  function handleOpenChange(next: boolean) {
    if (!loading) {
      setOpen(next)
      if (!next) {
        setName('')
        setError(null)
      }
    }
  }

  return (
    <>
      {/* Creation overlay — compact white card with the grid-cube loader. */}
      {loading && (
        <div
          className="fixed inset-0 z-[70] flex items-center justify-center bg-black/20 backdrop-blur-[2px] duration-200 animate-in fade-in-0"
          role="status"
          aria-label={`Creating ${name.trim()}`}
        >
          <div className="flex min-w-48 max-w-64 flex-col items-center rounded-2xl bg-white px-8 pb-9 pt-6 shadow-2xl duration-200 animate-in zoom-in-95">
            <p className="max-w-full truncate text-base font-semibold text-gray-900">
              {name.trim()}
            </p>
            <GridLoader size="sm" className="mt-7 h-auto" />
          </div>
        </div>
      )}

      <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger
        render={
          trigger ?? (
            <Button className="h-10 rounded-md px-7">
              <PlusIcon />
              Create BOT
            </Button>
          )
        }
      />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create a new bot</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="bot-name">Bot name</Label>
            <Input
              id="bot-name"
              type="text"
              placeholder="e.g. Acme Support Assistant"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              disabled={loading}
              autoFocus
            />
          </div>

          {error && (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          )}

          <DialogFooter>
            <Button type="submit" disabled={loading || !name.trim()}>
              Create bot
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
    </>
  )
}
