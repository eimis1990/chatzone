'use client'

import { useState, useTransition } from 'react'
import { DownloadIcon, ShieldCheckIcon, Trash2Icon } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button, buttonVariants } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
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

interface SettingsPanelProps {
  retentionDays: number | null
  setRetention: (days: number | null) => Promise<void>
  deleteData: (scope: 'conversations' | 'leads' | 'all') => Promise<{ ok: boolean }>
}

export function SettingsPanel({ retentionDays, setRetention, deleteData }: SettingsPanelProps) {
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

  return (
    <div className="space-y-6">
      {/* Retention */}
      <Card>
        <CardHeader>
          <CardTitle>Data retention</CardTitle>
          <CardDescription>
            Automatically delete conversations older than this. Leads are kept.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          <Label htmlFor="retention">Keep conversations for</Label>
          <Select value={value} onValueChange={onRetentionChange}>
            <SelectTrigger id="retention" className="w-full max-w-xs">
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
          {savedMsg && <p className="text-xs text-muted-foreground">{pending ? 'Saving…' : savedMsg}</p>}
        </CardContent>
      </Card>

      {/* Export */}
      <Card>
        <CardHeader>
          <CardTitle>Export data</CardTitle>
          <CardDescription>
            Download all of your organization&apos;s bots, conversations, and leads as JSON.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <a href="/api/account/export" download className={cn(buttonVariants({ variant: 'outline' }))}>
            <DownloadIcon />
            Export JSON
          </a>
        </CardContent>
      </Card>

      {/* Danger zone */}
      <Card className="border-destructive/30">
        <CardHeader>
          <CardTitle className="text-destructive">Delete data</CardTitle>
          <CardDescription>
            Erase stored data on request (right to be forgotten). This is permanent.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            disabled={pending}
            onClick={() => onDelete('conversations', 'all conversations')}
          >
            <Trash2Icon />
            Delete conversations
          </Button>
          <Button
            variant="outline"
            disabled={pending}
            onClick={() => onDelete('leads', 'all leads')}
          >
            <Trash2Icon />
            Delete leads
          </Button>
        </CardContent>
      </Card>

      {/* Privacy */}
      <Card>
        <CardHeader>
          <CardTitle>Privacy &amp; security</CardTitle>
          <CardDescription>How we handle data and who processes it.</CardDescription>
        </CardHeader>
        <CardContent>
          <a
            href="/privacy"
            target="_blank"
            rel="noopener noreferrer"
            className={cn(buttonVariants({ variant: 'outline' }))}
          >
            <ShieldCheckIcon />
            View privacy &amp; data handling
          </a>
        </CardContent>
      </Card>
    </div>
  )
}
