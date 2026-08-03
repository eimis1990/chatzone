'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import {
  BanIcon,
  CheckIcon,
  Clock3Icon,
  CopyIcon,
  LoaderCircleIcon,
  Share2Icon,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import {
  createDemoPresentationShare,
  revokeDemoPresentationShares,
} from '@/app/(owner)/owner/demos/actions'

interface DemoShareDialogProps {
  botId: string
  botName: string
  activeExpiresAt?: string
}

function formatExpiry(value: string): string {
  return new Intl.DateTimeFormat('en-GB', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'Europe/Vilnius',
  }).format(new Date(value))
}

export function DemoShareDialog({ botId, botName, activeExpiresAt }: DemoShareDialogProps) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [pending, startTransition] = useTransition()
  const [url, setUrl] = useState<string | null>(null)
  const [expiresAt, setExpiresAt] = useState<string | null>(activeExpiresAt ?? null)
  const [copied, setCopied] = useState(false)

  async function copy(value: string) {
    try {
      await navigator.clipboard.writeText(value)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
      return true
    } catch {
      return false
    }
  }

  function createLink() {
    startTransition(async () => {
      const result = await createDemoPresentationShare(botId)
      if (!result.ok) {
        toast.error(result.error)
        return
      }

      setUrl(result.url)
      setExpiresAt(result.expiresAt)
      const didCopy = await copy(result.url)
      toast.success(didCopy ? '24-hour share link copied.' : 'Share link created. Copy it below.')
      router.refresh()
    })
  }

  function revokeLink() {
    startTransition(async () => {
      const result = await revokeDemoPresentationShares(botId)
      if (!result.ok) {
        toast.error(result.error ?? 'Could not revoke the share link.')
        return
      }

      setUrl(null)
      setExpiresAt(null)
      setCopied(false)
      toast.success('Share link revoked.')
      router.refresh()
    })
  }

  function handleOpenChange(nextOpen: boolean) {
    if (!nextOpen) {
      setUrl(null)
      setCopied(false)
    }
    setOpen(nextOpen)
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger
        render={
          <Button variant="outline" size="lg" title="Create or revoke a 24-hour share link">
            <Share2Icon data-icon="inline-start" />
            Share
          </Button>
        }
      />
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Share {botName}</DialogTitle>
          <DialogDescription>
            Create a private presentation link that works without a Loqara login. It expires after
            24 hours, and creating a new link immediately revokes the previous one.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {expiresAt ? (
            <div className="flex items-start gap-3 rounded-lg border bg-muted/40 p-3 text-sm">
              <Clock3Icon className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden="true" />
              <div>
                <p className="font-medium">Share access is active</p>
                <p className="text-muted-foreground">
                  Expires {formatExpiry(expiresAt)} (Vilnius time).
                </p>
              </div>
            </div>
          ) : (
            <p className="rounded-lg border border-dashed p-3 text-sm text-muted-foreground">
              There is no active public link for this demo.
            </p>
          )}

          {url && (
            <div className="space-y-1.5">
              <div className="flex items-center gap-2">
                <Input readOnly value={url} className="font-mono text-xs" aria-label="Share URL" />
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={() => void copy(url)}
                  aria-label="Copy share link"
                >
                  {copied ? <CheckIcon className="text-green-600" /> : <CopyIcon />}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Copy it now—the same link cannot be recovered after this dialog closes.
              </p>
            </div>
          )}

          <p className="text-xs text-muted-foreground">
            Anyone with the link can view and use this demo until it expires or you revoke it. The
            link stops working automatically if the bot is transferred to a client.
          </p>
        </div>

        <DialogFooter className="sm:justify-between">
          {expiresAt ? (
            <Button type="button" variant="destructive" onClick={revokeLink} disabled={pending}>
              <BanIcon data-icon="inline-start" />
              Revoke
            </Button>
          ) : (
            <span />
          )}
          <Button type="button" onClick={createLink} disabled={pending}>
            {pending ? (
              <LoaderCircleIcon data-icon="inline-start" className="animate-spin" />
            ) : (
              <Share2Icon data-icon="inline-start" />
            )}
            {pending ? 'Working…' : expiresAt ? 'Replace & copy link' : 'Create & copy link'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
