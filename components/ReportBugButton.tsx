'use client'

import { useState } from 'react'
import { usePathname } from 'next/navigation'
import { BugIcon } from 'lucide-react'
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
export function ReportBugButton() {
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
        className="mb-1 w-full justify-start text-white/80 hover:bg-white/10 hover:text-white"
      >
        <BugIcon />
        Report a bug
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Report a bug</DialogTitle>
          <DialogDescription>
            Found something broken? Tell us what happened and we&apos;ll look into it.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="bug-title">Summary</Label>
            <Input
              id="bug-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Save button does nothing on the config page"
              maxLength={140}
              required
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="bug-desc">What happened?</Label>
            <Textarea
              id="bug-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Steps to reproduce, what you expected, and what you saw instead…"
              className="h-32 resize-none"
              maxLength={5000}
              required
            />
          </div>
          <DialogFooter>
            <Button type="submit" disabled={submitting || tooShort}>
              {submitting ? 'Sending…' : 'Send report'}
            </Button>
          </DialogFooter>
        </form>
        </DialogContent>
      </Dialog>
    </>
  )
}
