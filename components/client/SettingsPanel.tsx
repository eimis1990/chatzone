'use client'

import { type ReactNode, useState, useTransition } from 'react'
import { MotionConfig, motion } from 'framer-motion'
import {
  BellIcon,
  Clock3Icon,
  DatabaseIcon,
  DownloadIcon,
  ExternalLinkIcon,
  KeyRoundIcon,
  ShieldCheckIcon,
  Trash2Icon,
} from 'lucide-react'
import { toast } from 'sonner'
import { ChangePasswordCard } from '@/components/client/ChangePasswordCard'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogMedia,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Badge } from '@/components/ui/badge'
import { Button, buttonVariants } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from '@/components/ui/field'
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import { Spinner } from '@/components/ui/spinner'
import { Switch } from '@/components/ui/switch'
import { Tabs, TabsContent, TabsIndicator, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { cn } from '@/lib/utils'

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
  usageEmails: boolean
}

type DeleteScope = 'conversations' | 'leads'

interface SettingsPanelProps {
  retentionDays: number | null
  setRetention: (days: number | null) => Promise<void>
  deleteData: (scope: 'conversations' | 'leads' | 'all') => Promise<{ ok: boolean }>
  /** Whether the plan allows a configurable retention window (else Scale-gated). */
  canCustomRetention: boolean
  notifications: NotificationPrefs
  setNotifications: (prefs: NotificationPrefs) => Promise<void>
  email?: string
}

function SettingsCardHeading({
  icon: Icon,
  title,
  description,
  destructive = false,
}: {
  icon: typeof BellIcon
  title: string
  description: string
  destructive?: boolean
}) {
  return (
    <div className="flex items-start gap-3">
      <span
        className={cn(
          'flex size-10 shrink-0 items-center justify-center rounded-xl',
          destructive ? 'bg-destructive/10 text-destructive' : 'bg-primary/10 text-primary',
        )}
      >
        <Icon className="size-5" aria-hidden="true" />
      </span>
      <div className="min-w-0">
        <CardTitle className={cn(destructive && 'text-destructive')}>{title}</CardTitle>
        <CardDescription className="mt-0.5">{description}</CardDescription>
      </div>
    </div>
  )
}

function SettingsTabPanel({ children, value }: { children: ReactNode; value: string }) {
  return (
    <TabsContent value={value} className="w-full pt-5">
      <MotionConfig reducedMotion="user">
        <motion.div
          initial={{ filter: 'blur(4px)', opacity: 0.72, y: 6 }}
          animate={{ filter: 'blur(0px)', opacity: 1, y: 0 }}
          transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
          className="w-full"
        >
          {children}
        </motion.div>
      </MotionConfig>
    </TabsContent>
  )
}

export function SettingsPanel({
  retentionDays,
  setRetention,
  deleteData,
  canCustomRetention,
  notifications,
  setNotifications,
  email,
}: SettingsPanelProps) {
  const initialRetention = retentionDays == null ? 'forever' : String(retentionDays)
  const [prefs, setPrefs] = useState<NotificationPrefs>(notifications)
  const [retentionValue, setRetentionValue] = useState(initialRetention)
  const [prefsSaved, setPrefsSaved] = useState(false)
  const [retentionSaved, setRetentionSaved] = useState(false)
  const [deleteScope, setDeleteScope] = useState<DeleteScope | null>(null)
  const [prefsPending, startPrefsTransition] = useTransition()
  const [retentionPending, startRetentionTransition] = useTransition()
  const [deletePending, startDeleteTransition] = useTransition()

  function onPrefChange(key: keyof NotificationPrefs, enabled: boolean) {
    const previous = prefs
    const next = { ...prefs, [key]: enabled }
    setPrefs(next)
    setPrefsSaved(false)

    startPrefsTransition(async () => {
      try {
        await setNotifications(next)
        setPrefsSaved(true)
      } catch {
        setPrefs(previous)
        toast.error('Could not save notification settings. Please try again.')
      }
    })
  }

  function onRetentionChange(nextValue: string | null) {
    if (!nextValue) return
    const previous = retentionValue
    setRetentionValue(nextValue)
    setRetentionSaved(false)
    const days = nextValue === 'forever' ? null : Number(nextValue)

    startRetentionTransition(async () => {
      try {
        await setRetention(days)
        setRetentionSaved(true)
      } catch {
        setRetentionValue(previous)
        toast.error('Could not save the retention window. Please try again.')
      }
    })
  }

  function confirmDelete() {
    if (!deleteScope) return

    startDeleteTransition(async () => {
      try {
        const result = await deleteData(deleteScope)
        if (!result.ok) throw new Error('Delete failed')
        toast.success(
          deleteScope === 'conversations'
            ? 'All conversations were deleted.'
            : 'All leads were deleted.',
        )
        setDeleteScope(null)
      } catch {
        toast.error('Could not delete the selected data. Please try again.')
      }
    })
  }

  return (
    <>
      <Tabs defaultValue="notifications" className="w-full gap-0">
        <TabsList
          variant="line"
          className="relative h-auto w-full justify-start gap-0 overflow-x-auto border-b p-0"
        >
          <TabsTrigger
            value="notifications"
            className="h-12 flex-none rounded-none px-4 after:hidden sm:px-5"
          >
            <BellIcon aria-hidden="true" />
            <span className="hidden sm:inline">Notifications</span>
            <span className="sm:hidden">Alerts</span>
          </TabsTrigger>
          <TabsTrigger
            value="data"
            className="h-12 flex-none rounded-none px-4 after:hidden sm:px-5"
          >
            <DatabaseIcon aria-hidden="true" />
            <span className="hidden sm:inline">Data &amp; privacy</span>
            <span className="sm:hidden">Data</span>
          </TabsTrigger>
          <TabsTrigger
            value="security"
            className="h-12 flex-none rounded-none px-4 after:hidden sm:px-5"
            disabled={!email}
          >
            <KeyRoundIcon aria-hidden="true" />
            Security
          </TabsTrigger>
          <TabsIndicator />
        </TabsList>

        <SettingsTabPanel value="notifications">
          <Card>
            <CardHeader>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <SettingsCardHeading
                  icon={BellIcon}
                  title="Email notifications"
                  description="Choose which workspace events should reach administrators by email."
                />
                <Badge variant="secondary" className="self-start">
                  {prefsPending ? (
                    <>
                      <Spinner /> Saving
                    </>
                  ) : prefsSaved ? (
                    'Saved'
                  ) : (
                    'Auto-save'
                  )}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <FieldGroup className="gap-0">
                <Field orientation="horizontal" className="py-4 first:pt-0 last:pb-0">
                  <FieldContent>
                    <FieldLabel htmlFor="notif-leads">New lead captured</FieldLabel>
                    <FieldDescription id="notif-leads-description">
                      Send the lead&apos;s details with a direct link to the leads table.
                    </FieldDescription>
                  </FieldContent>
                  <Switch
                    id="notif-leads"
                    checked={prefs.leadEmails}
                    onCheckedChange={(enabled) => onPrefChange('leadEmails', enabled)}
                    disabled={prefsPending}
                    aria-describedby="notif-leads-description"
                  />
                </Field>
                <Separator />
                <Field orientation="horizontal" className="py-4">
                  <FieldContent>
                    <FieldLabel htmlFor="notif-handoff">Visitor requests a human</FieldLabel>
                    <FieldDescription id="notif-handoff-description">
                      Include their latest message and a link to the live inbox.
                    </FieldDescription>
                  </FieldContent>
                  <Switch
                    id="notif-handoff"
                    checked={prefs.handoffEmails}
                    onCheckedChange={(enabled) => onPrefChange('handoffEmails', enabled)}
                    disabled={prefsPending}
                    aria-describedby="notif-handoff-description"
                  />
                </Field>
                <Separator />
                <Field orientation="horizontal" className="py-4 first:pt-0 last:pb-0">
                  <FieldContent>
                    <FieldLabel htmlFor="notif-usage">Usage warning</FieldLabel>
                    <FieldDescription id="notif-usage-description">
                      Send one monthly warning after 80% of the conversation allowance is used.
                    </FieldDescription>
                  </FieldContent>
                  <Switch
                    id="notif-usage"
                    checked={prefs.usageEmails}
                    onCheckedChange={(enabled) => onPrefChange('usageEmails', enabled)}
                    disabled={prefsPending}
                    aria-describedby="notif-usage-description"
                  />
                </Field>
              </FieldGroup>
            </CardContent>
          </Card>
        </SettingsTabPanel>

        <SettingsTabPanel value="data">
          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <SettingsCardHeading
                    icon={Clock3Icon}
                    title="Conversation retention"
                    description="Automatically remove conversation history after a chosen period. Leads are kept."
                  />
                  <Badge variant="secondary" className="self-start">
                    {canCustomRetention ? 'Scale enabled' : 'Scale plan'}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <Field data-disabled={!canCustomRetention || undefined}>
                  <FieldLabel htmlFor="retention">Keep conversations for</FieldLabel>
                  <Select
                    items={RETENTION_OPTIONS}
                    value={retentionValue}
                    onValueChange={onRetentionChange}
                    disabled={!canCustomRetention || retentionPending}
                  >
                    <SelectTrigger
                      id="retention"
                      className="h-11 w-full"
                      aria-label="Conversation retention window"
                    >
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent alignItemWithTrigger={false}>
                      <SelectGroup>
                        {RETENTION_OPTIONS.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                  <FieldDescription>
                    {retentionPending
                      ? 'Saving retention window…'
                      : retentionSaved
                        ? 'Retention window saved.'
                        : canCustomRetention
                          ? 'New conversations follow this rule automatically.'
                          : 'Custom retention is available on the Scale plan.'}
                  </FieldDescription>
                </Field>
              </CardContent>
              {!canCustomRetention && (
                <CardFooter>
                  <a
                    href="/app/subscription"
                    className={cn(buttonVariants({ variant: 'outline' }), 'h-11')}
                  >
                    View Scale plan
                  </a>
                </CardFooter>
              )}
            </Card>

            <Card>
              <CardHeader>
                <SettingsCardHeading
                  icon={ShieldCheckIcon}
                  title="Your workspace data"
                  description="Download a portable copy or review how Loqara handles and processes it."
                />
              </CardHeader>
              <CardContent className="flex flex-col gap-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="font-medium">Export workspace</p>
                    <p className="text-sm text-muted-foreground">Bots, conversations, and leads in JSON format.</p>
                  </div>
                  <a href="/api/account/export" download className={cn(buttonVariants(), 'h-11 shrink-0')}>
                    <DownloadIcon data-icon="inline-start" />
                    Export JSON
                  </a>
                </div>
                <Separator />
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="font-medium">Privacy &amp; data handling</p>
                    <p className="text-sm text-muted-foreground">Read about retention, processors, and your rights.</p>
                  </div>
                  <a
                    href="/privacy"
                    target="_blank"
                    rel="noopener noreferrer"
                    className={cn(buttonVariants({ variant: 'outline' }), 'h-11 shrink-0')}
                  >
                    View policy
                    <ExternalLinkIcon data-icon="inline-end" />
                  </a>
                </div>
              </CardContent>
            </Card>

            <Card className="lg:col-span-2">
              <CardHeader>
                <SettingsCardHeading
                  icon={Trash2Icon}
                  title="Danger zone"
                  description="These actions permanently erase workspace data and cannot be undone."
                  destructive
                />
              </CardHeader>
              <CardContent className="flex flex-col gap-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="font-medium">Delete conversations</p>
                    <p className="text-sm text-muted-foreground">Remove every conversation and its messages.</p>
                  </div>
                  <Button
                    variant="destructive"
                    className="h-11 shrink-0"
                    disabled={deletePending}
                    onClick={() => setDeleteScope('conversations')}
                  >
                    <Trash2Icon data-icon="inline-start" />
                    Delete conversations
                  </Button>
                </div>
                <Separator />
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="font-medium">Delete leads</p>
                    <p className="text-sm text-muted-foreground">Remove all contact details captured by your bots.</p>
                  </div>
                  <Button
                    variant="destructive"
                    className="h-11 shrink-0"
                    disabled={deletePending}
                    onClick={() => setDeleteScope('leads')}
                  >
                    <Trash2Icon data-icon="inline-start" />
                    Delete leads
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </SettingsTabPanel>

        <SettingsTabPanel value="security">
          {email && <ChangePasswordCard email={email} />}
        </SettingsTabPanel>
      </Tabs>

      <AlertDialog
        open={deleteScope !== null}
        onOpenChange={(open) => {
          if (!open && !deletePending) setDeleteScope(null)
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogMedia className="bg-destructive/10 text-destructive">
              <Trash2Icon aria-hidden="true" />
            </AlertDialogMedia>
            <AlertDialogTitle>
              Delete all {deleteScope === 'conversations' ? 'conversations' : 'leads'}?
            </AlertDialogTitle>
            <AlertDialogDescription>
              {deleteScope === 'conversations'
                ? 'Every conversation and message in this workspace will be permanently deleted.'
                : 'Every lead and its captured contact details will be permanently deleted.'}{' '}
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="h-11" disabled={deletePending}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              className="h-11"
              disabled={deletePending}
              onClick={confirmDelete}
            >
              {deletePending ? <Spinner data-icon="inline-start" /> : <Trash2Icon data-icon="inline-start" />}
              {deletePending ? 'Deleting…' : 'Delete permanently'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
