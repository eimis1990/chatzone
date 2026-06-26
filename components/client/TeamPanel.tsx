'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { CheckIcon, CopyIcon, Loader2Icon, Trash2Icon, UserPlusIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import type { MemberRole } from '@/lib/types'

export interface TeamMember {
  userId: string
  name: string | null
  email: string
  role: MemberRole
  isSelf: boolean
}
export interface TeamInvite {
  id: string
  email: string
  role: MemberRole
  url: string
}

interface TeamPanelProps {
  isAdmin: boolean
  members: TeamMember[]
  invites: TeamInvite[]
  inviteTeammate: (email: string, role: MemberRole) => Promise<{ url?: string; error?: string }>
  revokeInvite: (inviteId: string) => Promise<{ ok?: boolean; error?: string }>
  removeMember: (userId: string) => Promise<{ ok?: boolean; error?: string }>
}

function RolePill({ role }: { role: MemberRole }) {
  return (
    <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium capitalize text-muted-foreground">
      {role}
    </span>
  )
}

function CopyLink({ url }: { url: string }) {
  const [copied, setCopied] = useState(false)
  return (
    <Button
      variant="outline"
      size="sm"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(url)
          setCopied(true)
          setTimeout(() => setCopied(false), 1500)
        } catch {
          toast.error('Could not copy — copy it manually.')
        }
      }}
    >
      {copied ? <CheckIcon className="size-3.5" /> : <CopyIcon className="size-3.5" />}
      {copied ? 'Copied' : 'Copy link'}
    </Button>
  )
}

export function TeamPanel({
  isAdmin,
  members,
  invites,
  inviteTeammate,
  revokeInvite,
  removeMember,
}: TeamPanelProps) {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [role, setRole] = useState<MemberRole>('member')
  const [pending, startTransition] = useTransition()
  const [busyId, setBusyId] = useState<string | null>(null)

  const submitInvite = (e: React.FormEvent) => {
    e.preventDefault()
    if (!email.trim()) return
    setBusyId('invite')
    startTransition(async () => {
      const res = await inviteTeammate(email, role)
      setBusyId(null)
      if (res.url) {
        setEmail('')
        toast.success('Invite created — share the link to add them.')
        router.refresh()
      } else {
        toast.error(res.error ?? 'Could not create the invite.')
      }
    })
  }

  const onRevoke = (id: string) => {
    setBusyId(id)
    startTransition(async () => {
      const res = await revokeInvite(id)
      setBusyId(null)
      if (res.ok) {
        toast.success('Invite revoked.')
        router.refresh()
      } else toast.error(res.error ?? 'Could not revoke the invite.')
    })
  }

  const onRemove = (m: TeamMember) => {
    if (!confirm(`Remove ${m.name || m.email} from the team?`)) return
    setBusyId(m.userId)
    startTransition(async () => {
      const res = await removeMember(m.userId)
      setBusyId(null)
      if (res.ok) {
        toast.success('Member removed.')
        router.refresh()
      } else toast.error(res.error ?? 'Could not remove the member.')
    })
  }

  return (
    <div className="max-w-3xl space-y-6">
      {/* Invite form */}
      {isAdmin && (
        <form onSubmit={submitInvite} className="space-y-3 rounded-xl border bg-card p-5">
          <div>
            <h2 className="text-base font-semibold">Invite a teammate</h2>
            <p className="text-sm text-muted-foreground">
              We&apos;ll generate a sign-up link to share with them.
            </p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
            <div className="flex-1 space-y-1.5">
              <Label htmlFor="invite-email">Email</Label>
              <Input
                id="invite-email"
                type="email"
                placeholder="teammate@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={pending}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="invite-role">Role</Label>
              <Select value={role} onValueChange={(v) => v && setRole(v as MemberRole)}>
                <SelectTrigger id="invite-role" className="w-36 bg-card">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="member">Member</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button type="submit" disabled={pending || !email.trim()}>
              {busyId === 'invite' ? <Loader2Icon className="size-4 animate-spin" /> : <UserPlusIcon className="size-4" />}
              Invite
            </Button>
          </div>
        </form>
      )}

      {/* Pending invites */}
      {invites.length > 0 && (
        <div className="rounded-xl border bg-card p-5">
          <h2 className="text-base font-semibold">Pending invites</h2>
          <ul className="mt-3 divide-y">
            {invites.map((inv) => (
              <li key={inv.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{inv.email}</p>
                  <RolePill role={inv.role} />
                </div>
                {isAdmin && (
                  <div className="flex items-center gap-2">
                    <CopyLink url={inv.url} />
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-destructive hover:text-destructive"
                      disabled={pending}
                      onClick={() => onRevoke(inv.id)}
                    >
                      {busyId === inv.id ? <Loader2Icon className="size-3.5 animate-spin" /> : <Trash2Icon className="size-3.5" />}
                      Revoke
                    </Button>
                  </div>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Members */}
      <div className="rounded-xl border bg-card p-5">
        <h2 className="text-base font-semibold">Members</h2>
        <ul className="mt-3 divide-y">
          {members.map((m) => (
            <li key={m.userId} className="flex flex-wrap items-center justify-between gap-3 py-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">
                  {m.name || m.email}
                  {m.isSelf && <span className="ml-1 text-xs text-muted-foreground">(you)</span>}
                </p>
                {m.name && <p className="truncate text-xs text-muted-foreground">{m.email}</p>}
              </div>
              <div className="flex items-center gap-2">
                <RolePill role={m.role} />
                {isAdmin && !m.isSelf && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-destructive hover:text-destructive"
                    disabled={pending}
                    onClick={() => onRemove(m)}
                  >
                    {busyId === m.userId ? <Loader2Icon className="size-3.5 animate-spin" /> : <Trash2Icon className="size-3.5" />}
                    Remove
                  </Button>
                )}
              </div>
            </li>
          ))}
        </ul>
      </div>

      {!isAdmin && (
        <p className="text-xs text-muted-foreground">
          Only organization admins can invite or remove teammates.
        </p>
      )}
    </div>
  )
}
