'use client'

import { useState, useTransition } from 'react'
import { DownloadIcon, ShieldCheckIcon, Trash2Icon, ClockIcon, BellIcon } from 'lucide-react'
import { SectionCard } from '@/components/client/SectionCard'
import { Button, buttonVariants } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { cn } from '@/lib/utils'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

const RETENTION_OPTIONS = [
  { value: 'forever', label: 'Keep forever' },
  { value: '30', label: '30 days' },
  { value: '90', label: '90 days' },
  { value: '180', label: '180 days' },
  { value: '365', label: '365 days' },
]

export interface NotificationPrefs {
  leadEmails: boolean
  handoffEmails: boolean
}

interface SettingsPanelProps {
  retentionDays: number | null
  setRetention: (days: number | null) => Promise<void>
  deleteData: (scope: 'conversations' | 'leads' | 'all') => Promise<{ ok: boolean }>
  /** Whether the plan allows a configurable retention window (else Scale-gated). */
  canCustomRetention: boolean
  notifications: NotificationPrefs
  setNotifications: (prefs: NotificationPrefs) => Promise<void>
}

export function SettingsPanel({
  retentionDays,
  setRetention,
  deleteData,
  canCustomRetention,
  notifications,
  setNotifications,
}: SettingsPanelProps) {
  const [prefs, setPrefs] = useState<NotificationPrefs>(notifications)
  const [value, setValue] = useState(retentionDays == null ? 'forever' : String(retentionDays))
  const [savedMsg, setSavedMsg] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  const onRetentionChange = (v: string | null) => {
    if (!v) return
    setValue(v)
    setSavedMsg(null)
    const days = v === 'forever' ? null : Number(v)
    startTransition(async () => {
      await setRetention(days)
      setSavedMsg('Saved')
    })
  }

  const onDelete = (scope: 'conversations' | 'leads' | 'all', label: string) => {
    if (!confirm(`Permanently delete ${label}? This cannot be undone.`)) return
    startTransition(async () => {
      await deleteData(scope)
      setSavedMsg(`Deleted ${label}`)
    })
  }

  const onPrefChange = (key: keyof NotificationPrefs, on: boolean) => {
    const next = { ...prefs, [key]: on }
    setPrefs(next)
    setSavedMsg(null)
    startTransition(async () => {
      await setNotifications(next)
      setSavedMsg('Saved')
    })
  }

  return (
    <div className="max-w-2xl space-y-6">
      {/* Email notifications */}
      <SectionCard
        icon={BellIcon}
        title="Email notifications"
        description="Sent to workspace admins the moment it happens."
        contentClassName="space-y-4"
      >
        <div className="flex items-center justify-between gap-4">
          <div>
            <Label htmlFor="notif-leads">New lead captured</Label>
            <p className="text-xs text-muted-foreground">
              The lead&apos;s details with a link to the leads table.
            </p>
          </div>
          <Switch
            id="notif-leads"
            checked={prefs.leadEmails}
            onCheckedChange={(on) => onPrefChange('leadEmails', on)}
          />
        </div>
        <div className="flex items-center justify-between gap-4">
          <div>
            <Label htmlFor="notif-handoff">Visitor requests a human</Label>
            <p className="text-xs text-muted-foreground">
              Their last message with a link to the inbox — they&apos;re waiting live.
            </p>
          </div>
          <Switch
            id="notif-handoff"
            checked={prefs.handoffEmails}
            onCheckedChange={(on) => onPrefChange('handoffEmails', on)}
          />
        </div>
      </SectionCard>

      {/* Retention */}
      <SectionCard
        icon={ClockIcon}
        title="Data retention"
        description="Automatically delete conversations older than this. Leads are kept."
        contentClassName="space-y-2"
      >
        <Label htmlFor="retention">Keep conversations for</Label>
        <Select value={value} onValueChange={onRetentionChange} disabled={!canCustomRetention}>
          <SelectTrigger id="retention" className="w-full max-w-xs bg-card">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {RETENTION_OPTIONS.map((o) => (
              <SelectItem key={o.value} value={o.value}>
                {o.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {canCustomRetention ? (
          savedMsg && <p className="text-xs text-muted-foreground">{pending ? 'Saving…' : savedMsg}</p>
        ) : (
          <p className="text-xs text-muted-foreground">
            A custom retention window is available on the Scale plan.{' '}
            <a href="/app/subscription" className="text-primary hover:underline">
              Upgrade
            </a>
            .
          </p>
        )}
      </SectionCard>

      {/* Export */}
      <SectionCard
        icon={DownloadIcon}
        title="Export data"
        description="Download all of your organization's bots, conversations, and leads as JSON."
      >
        <a href="/api/account/export" download className={cn(buttonVariants(), 'h-10 rounded-md px-6')}>
          <DownloadIcon />
          Export JSON
        </a>
      </SectionCard>

      {/* Danger zone */}
      <SectionCard
        icon={Trash2Icon}
        accent="danger"
        title="Delete data"
        description="Erase stored data on request (right to be forgotten). This is permanent."
        contentClassName="flex flex-wrap gap-2"
      >
        <Button
          variant="outline"
          disabled={pending}
          onClick={() => onDelete('conversations', 'all conversations')}
          className="text-destructive hover:text-destructive"
        >
          <Trash2Icon />
          Delete conversations
        </Button>
        <Button
          variant="outline"
          disabled={pending}
          onClick={() => onDelete('leads', 'all leads')}
          className="text-destructive hover:text-destructive"
        >
          <Trash2Icon />
          Delete leads
        </Button>
      </SectionCard>

      {/* Privacy */}
      <SectionCard
        icon={ShieldCheckIcon}
        title="Privacy & security"
        description="How we handle data and who processes it."
      >
        <a
          href="/privacy"
          target="_blank"
          rel="noopener noreferrer"
          className={cn(buttonVariants({ variant: 'outline' }))}
        >
          <ShieldCheckIcon />
          View privacy &amp; data handling
        </a>
      </SectionCard>
    </div>
  )
}
