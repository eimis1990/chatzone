'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Trash2Icon } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { deleteOrganization } from '@/app/(owner)/owner/clients/[orgId]/actions'

/** Type-the-name confirmation before wiping a client org and its member accounts. */
export function DeleteClientButton({ orgId, orgName }: { orgId: string; orgName: string }) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [typed, setTyped] = useState('')
  const [deleting, setDeleting] = useState(false)
  const confirmed = typed.trim() === orgName.trim()

  async function handleDelete() {
    setDeleting(true)
    const res = await deleteOrganization(orgId)
    if (!res.ok) {
      toast.error(res.error)
      setDeleting(false)
      return
    }
    toast.success(`"${orgName}" deleted`)
    router.push('/owner/clients')
    router.refresh()
  }

  return (
    <>
      <Button
        type="button"
        variant="ghost"
        className="h-11 text-muted-foreground hover:text-destructive"
        onClick={() => setOpen(true)}
      >
        <Trash2Icon data-icon="inline-start" />
        Delete client
      </Button>

      <Dialog
        open={open}
        onOpenChange={(next) => {
          if (deleting) return
          setOpen(next)
          if (!next) setTyped('')
        }}
      >
        <DialogContent className="p-8" showCloseButton={false}>
          <div className="flex flex-col gap-4">
            <div className="flex size-11 items-center justify-center rounded-xl bg-destructive/10 text-destructive">
              <Trash2Icon className="size-5" aria-hidden="true" />
            </div>
            <div>
              <DialogTitle className="text-xl font-semibold">Delete “{orgName}”?</DialogTitle>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                This permanently removes the workspace: every bot with its knowledge, conversations,
                leads and analytics, plus the client&apos;s login accounts. Clients with a live
                subscription must be cancelled in Stripe first. This cannot be undone.
              </p>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="confirm-org-name">
                Type <span className="font-semibold text-foreground">{orgName}</span> to confirm
              </Label>
              <Input
                id="confirm-org-name"
                value={typed}
                onChange={(e) => setTyped(e.target.value)}
                autoComplete="off"
                disabled={deleting}
              />
            </div>
            <div className="grid grid-cols-2 gap-3 pt-2">
              <Button
                type="button"
                variant="outline"
                className="h-11"
                onClick={() => setOpen(false)}
                disabled={deleting}
              >
                Cancel
              </Button>
              <Button
                type="button"
                variant="destructive"
                className="h-11"
                onClick={handleDelete}
                disabled={!confirmed || deleting}
              >
                {deleting ? 'Deleting…' : 'Delete client'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
