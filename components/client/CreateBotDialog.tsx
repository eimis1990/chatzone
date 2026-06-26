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
import { createBot } from '@/lib/actions/createBot'
import { trackEvent } from '@/lib/analytics'

interface CreateBotDialogProps {
  orgId: string
  /** Custom trigger element. Falls back to the default "Create BOT" button. */
  trigger?: React.ReactElement
}

export function CreateBotDialog({ orgId, trigger }: CreateBotDialogProps) {
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

    const res = await createBot(name)

    if (res.error || !res.id) {
      setError(res.error ?? 'Failed to create bot. Please try again.')
      setLoading(false)
      return
    }

    trackEvent('bot_created', { orgId })
    setOpen(false)
    setName('')
    router.push(`/app/bots/${res.id}/configure`)
    router.refresh()
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
              {loading ? 'Creating…' : 'Create bot'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
