'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { PlusIcon, CopyIcon, CheckIcon } from 'lucide-react'

const schema = z.object({
  email: z.string().email('Enter a valid email address'),
  orgName: z.string().min(1, 'Organisation name is required').max(120),
})

type FormValues = z.infer<typeof schema>

export function CreateClientDialog() {
  const [open, setOpen] = useState(false)
  const [inviteUrl, setInviteUrl] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [serverError, setServerError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
  } = useForm<FormValues>({ resolver: zodResolver(schema) })

  async function onSubmit(values: FormValues) {
    setServerError(null)
    try {
      const res = await fetch('/api/invites', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values),
      })
      const json = (await res.json()) as { inviteUrl?: string; error?: string }
      if (!res.ok || !json.inviteUrl) {
        setServerError(json.error ?? 'Failed to create client. Please try again.')
        return
      }
      setInviteUrl(json.inviteUrl)
    } catch {
      setServerError('Network error. Please try again.')
    }
  }

  async function handleCopy() {
    if (!inviteUrl) return
    try {
      await navigator.clipboard.writeText(inviteUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // Clipboard API may be unavailable in some contexts
    }
  }

  function handleClose(nextOpen: boolean) {
    if (!nextOpen) {
      // Reset state when closing
      setInviteUrl(null)
      setCopied(false)
      setServerError(null)
      reset()
    }
    setOpen(nextOpen)
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogTrigger
        render={
          <Button size="sm">
            <PlusIcon className="size-4" />
            Add client
          </Button>
        }
      />

      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add a new client</DialogTitle>
          <DialogDescription>
            Creates an organisation and generates an invite link. Share the link
            with the client — they use it to set up their account.
          </DialogDescription>
        </DialogHeader>

        {inviteUrl ? (
          /* ── Success state: show invite link ──────────────────────────── */
          <div className="space-y-4 py-2">
            <p className="text-sm text-muted-foreground">
              Invite link created. Copy it and send it to the client.
            </p>
            <div className="flex items-center gap-2">
              <Input
                readOnly
                value={inviteUrl}
                className="font-mono text-xs"
                aria-label="Invite URL"
              />
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={handleCopy}
                aria-label="Copy invite link"
              >
                {copied ? (
                  <CheckIcon className="size-4 text-green-600" />
                ) : (
                  <CopyIcon className="size-4" />
                )}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              This link expires in 7 days.
            </p>
            <DialogFooter>
              <Button variant="outline" onClick={() => handleClose(false)}>
                Close
              </Button>
            </DialogFooter>
          </div>
        ) : (
          /* ── Form state ────────────────────────────────────────────────── */
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="orgName">Organisation name</Label>
              <Input
                id="orgName"
                placeholder="Acme Corp"
                {...register('orgName')}
                aria-describedby={errors.orgName ? 'orgName-error' : undefined}
              />
              {errors.orgName && (
                <p id="orgName-error" className="text-xs text-destructive">
                  {errors.orgName.message}
                </p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="email">Client email</Label>
              <Input
                id="email"
                type="email"
                placeholder="client@example.com"
                {...register('email')}
                aria-describedby={errors.email ? 'email-error' : undefined}
              />
              {errors.email && (
                <p id="email-error" className="text-xs text-destructive">
                  {errors.email.message}
                </p>
              )}
            </div>

            {serverError && (
              <p className="text-sm text-destructive" role="alert">
                {serverError}
              </p>
            )}

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => handleClose(false)}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? 'Creating…' : 'Create invite'}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  )
}
