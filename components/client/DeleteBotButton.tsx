'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Trash2Icon, SparkleIcon } from 'lucide-react'
import { toast } from 'sonner'
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'
import { deleteBot } from '@/lib/actions/deleteBot'

/**
 * Trash icon on a bot card. Confirmation required — deleting a bot removes
 * its knowledge, conversations, leads, and analytics permanently.
 */
export function DeleteBotButton({ botId, botName }: { botId: string; botName: string }) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [deleting, setDeleting] = useState(false)

  async function handleDelete() {
    setDeleting(true)
    const res = await deleteBot(botId)
    if (res.error) {
      toast.error(res.error)
      setDeleting(false)
      return
    }
    toast.success(`"${botName}" deleted`)
    setOpen(false)
    setDeleting(false)
    router.refresh()
  }

  return (
    <>
      <button
        type="button"
        aria-label={`Delete ${botName}`}
        title="Delete bot"
        // The whole card is a link — this must not navigate.
        onClick={(e) => {
          e.preventDefault()
          e.stopPropagation()
          setOpen(true)
        }}
        className="flex size-7 items-center justify-center rounded-md text-muted-foreground/60 transition-colors hover:bg-destructive/10 hover:text-destructive focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <Trash2Icon className="size-4" />
      </button>

      <Dialog open={open} onOpenChange={(next) => !deleting && setOpen(next)}>
        <DialogContent
          className="p-8"
          showCloseButton={false}
          // Also rendered inside the card link — keep dialog clicks contained.
          onClick={(e) => {
            e.preventDefault()
            e.stopPropagation()
          }}
        >
          <div className="flex flex-col items-center text-center">
            {/* Trash icon with sparkles, like a "poof" — brand accent, not red */}
            <div className="relative mt-3 text-primary" aria-hidden="true">
              <Trash2Icon className="size-9" strokeWidth={1.8} />
              <SparkleIcon className="absolute -left-4 -top-1.5 size-3 fill-current" />
              <SparkleIcon className="absolute -right-4 -top-2.5 size-3.5 fill-current" />
              <SparkleIcon className="absolute -top-4 left-2.5 size-2 fill-current" />
            </div>

            <DialogTitle className="mt-5 text-xl font-semibold">
              Delete “{botName}”?
            </DialogTitle>
            <p className="mt-2 max-w-xs text-sm leading-relaxed text-muted-foreground">
              This permanently deletes the bot with all its knowledge, conversations, leads and
              analytics. This action cannot be undone.
            </p>

            <div className="mt-7 grid w-full grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setOpen(false)}
                disabled={deleting}
                className="h-11 rounded-full border border-primary/40 text-sm font-semibold text-primary transition-colors hover:bg-primary/5 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDelete}
                disabled={deleting}
                className="h-11 rounded-full bg-primary text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/85 disabled:opacity-60"
              >
                {deleting ? 'Deleting…' : 'Delete'}
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
