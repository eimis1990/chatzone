'use client'

import { useState } from 'react'
import { usePathname } from 'next/navigation'
import { BugIcon, SendIcon } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

/**
 * "Report a bug" — lives in the sidebar footer (owner + client). Opens a dialog,
 * posts to /api/bug-reports, and auto-captures the current page + user agent so
 * the owner has context. Styled to sit in the dark footer card next to Sign out.
 */
export function ReportBugButton({ compact = false }: { compact?: boolean }) {
  const pathname = usePathname()
  const [open, setOpen] = useState(false)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const tooShort = title.trim().length < 3 || description.trim().length < 10

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (submitting || tooShort) return
    setSubmitting(true)
    try {
      const res = await fetch('/api/bug-reports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          description,
          page: pathname,
          userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : undefined,
        }),
      })
      const data = (await res.json().catch(() => ({}))) as { ok?: boolean; error?: string }
      if (res.ok && data.ok) {
        toast.success('Thanks! Your bug report was sent.')
        setOpen(false)
        setTitle('')
        setDescription('')
      } else {
        toast.error(data.error ?? 'Something went wrong. Please try again.')
      }
    } catch {
      toast.error('Network error — please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setOpen(true)}
        aria-label="Report a bug"
        title={compact ? 'Report a bug' : undefined}
        className={compact
          ? 'size-11 justify-center rounded-xl p-0 text-white/70 hover:bg-white/10 hover:text-white'
          : 'mb-1 w-full justify-start text-white/80 hover:bg-white/10 hover:text-white'}
      >
        <BugIcon />
        <span className={compact ? 'sr-only' : undefined}>Report a bug</span>
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="rounded-3xl sm:max-w-lg">
          <DialogHeader>
            <div className="flex items-center gap-3">
              <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-[#101213] text-white">
                <BugIcon className="size-5" aria-hidden="true" />
              </span>
              <div className="space-y-1">
                <DialogTitle className="text-lg">Bug Report</DialogTitle>
                <DialogDescription>Found a problem? Let us know so we can fix it.</DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <form onSubmit={submit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="bug-title">Bug title</Label>
              <Input
                id="bug-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Feedback form submission fails (Chrome desktop)"
                maxLength={140}
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="bug-desc">Bug description</Label>
              <Textarea
                id="bug-desc"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="What happened, what you expected, and the steps to reproduce it…"
                className="h-36 resize-none"
                maxLength={5000}
                required
              />
              <p className="text-xs text-muted-foreground">
                Describe the issue, steps to reproduce, and browser/device.
              </p>
            </div>
            <DialogFooter className="rounded-b-3xl sm:justify-between">
              <Button
                type="button"
                variant="outline"
                className="h-11 rounded-xl"
                onClick={() => setOpen(false)}
              >
                Cancel
              </Button>
              {/* Same sliding-tray treatment as the sign-in / signup buttons. */}
              <Button
                type="submit"
                disabled={submitting || tooShort}
                className="group relative h-11 overflow-hidden rounded-xl bg-[#101213] px-4 text-white hover:bg-[#101213]/90"
              >
                <span className="mr-9 transition-opacity duration-500 group-hover:opacity-0">
                  {submitting ? 'Sending…' : 'Send bug report'}
                </span>
                <i
                  aria-hidden="true"
                  className="absolute bottom-1 right-1 top-1 z-10 grid w-9 place-items-center rounded-lg bg-white/15 transition-all duration-500 group-hover:w-[calc(100%-0.5rem)] group-active:scale-95"
                >
                  <SendIcon className="size-4" strokeWidth={2} />
                </i>
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  )
}
