'use client'

import { useMemo, useState, useTransition } from 'react'
import {
  ArrowUpRightIcon,
  BotIcon,
  Building2Icon,
  CheckIcon,
  ClockAlertIcon,
  CopyIcon,
  ExternalLinkIcon,
  FilterXIcon,
  Globe2Icon,
  MailIcon,
  MapPinIcon,
  MessageSquareTextIcon,
  SearchIcon,
  SendIcon,
  SparklesIcon,
  StoreIcon,
  TargetIcon,
  UserRoundIcon,
  UsersIcon,
  XIcon,
} from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { setLeadStatus } from '@/app/(owner)/owner/leads/actions'
import {
  FOLLOW_UP_AFTER_DAYS,
  formatStatusAge,
  isContacted,
  needsFollowUp,
} from '@/lib/sales-leads'
import type { SalesLead, SalesLeadStatus } from '@/lib/types'

/** Pipeline stages, each with its own hue so progress is readable at a glance:
 *  grey (untouched) → amber/sky (waiting on them) → violet/blue/teal (demo
 *  track) → emerald (trialling) → accent (won) · red (lost). */
const STATUS_META: Record<SalesLeadStatus, { label: string; classes: string }> = {
  ready: { label: 'Ready', classes: 'border-border bg-muted text-foreground' },
  email_sent: {
    label: 'Email sent',
    classes: 'border-amber-200 bg-amber-50 text-amber-700',
  },
  follow_up_email: {
    label: 'Follow-up email',
    classes: 'border-sky-200 bg-sky-50 text-sky-700',
  },
  wants_demo: {
    label: 'Wants demo',
    classes: 'border-violet-200 bg-violet-50 text-violet-700',
  },
  demo_ready: {
    label: 'Demo ready',
    classes: 'border-blue-200 bg-blue-50 text-blue-700',
  },
  demo_presented: {
    label: 'Demo presented',
    classes: 'border-teal-200 bg-teal-50 text-teal-700',
  },
  testing_bot: {
    label: 'Testing bot',
    classes: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  },
  rejected: { label: 'Rejected', classes: 'border-red-200 bg-red-50 text-red-700' },
  client: { label: 'Our client', classes: 'border-primary bg-primary text-primary-foreground' },
}

/** Lifecycle order — drives the status dropdown. */
const STATUS_ORDER: SalesLeadStatus[] = [
  'ready',
  'email_sent',
  'follow_up_email',
  'wants_demo',
  'demo_ready',
  'demo_presented',
  'testing_bot',
  'client',
  'rejected',
]

/** Statuses grouped behind the "Emails sent" quick tab (awaiting a reply). */
const AWAITING_REPLY: SalesLeadStatus[] = ['email_sent', 'follow_up_email']

/** Status filter: a single stage, the awaiting-reply group, or everything. */
type StatusFilter = 'all' | 'awaiting_reply' | SalesLeadStatus

const QUICK_TABS: { value: StatusFilter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'ready', label: 'Ready' },
  { value: 'wants_demo', label: 'Wants demo' },
  { value: 'awaiting_reply', label: 'Emails sent' },
]

function matchesStatusFilter(lead: SalesLead, filter: StatusFilter): boolean {
  if (filter === 'all') return true
  if (filter === 'awaiting_reply') return AWAITING_REPLY.includes(lead.status)
  return lead.status === filter
}

function host(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '')
  } catch {
    return url
  }
}

/** `onAccent` = rendered on the solid-accent "Our client" row, where the usual
 *  muted/primary tints would disappear. */
function ScoreTile({ value, onAccent = false }: { value: number; onAccent?: boolean }) {
  const pct = Math.max(0, Math.min(100, value))
  return (
    <span
      className={cn(
        'flex size-10 shrink-0 items-center justify-center rounded-lg border text-xs font-semibold tabular-nums',
        onAccent
          ? 'border-white/30 bg-white/15 text-primary-foreground'
          : 'border-primary/20 bg-primary/5 text-primary',
      )}
      aria-label={`Chance to close ${pct}%`}
    >
      {pct}%
    </span>
  )
}

function PlatformBadge({ platform, onAccent = false }: { platform: string | null; onAccent?: boolean }) {
  return (
    <Badge
      variant="outline"
      className={cn(
        'font-normal',
        onAccent ? 'border-white/30 bg-white/10 text-primary-foreground' : 'text-muted-foreground',
      )}
    >
      {platform || 'Other'}
    </Badge>
  )
}

/** The lead's category chip — secondary normally, translucent on the accent row. */
function VerticalBadge({ vertical, onAccent = false }: { vertical: string; onAccent?: boolean }) {
  return (
    <Badge
      variant={onAccent ? 'outline' : 'secondary'}
      className={onAccent ? 'border-white/30 bg-white/10 text-primary-foreground' : undefined}
    >
      {vertical}
    </Badge>
  )
}

function BotBadge({ has }: { has: boolean | null }) {
  if (has === null) return <span className="text-muted-foreground">Unknown</span>
  return has ? (
    <Badge variant="outline" className="border-primary/25 bg-primary/5 text-primary">
      <BotIcon data-icon="inline-start" />
      Has bot
    </Badge>
  ) : (
    <Badge variant="secondary">
      <SparklesIcon data-icon="inline-start" />
      Open
    </Badge>
  )
}

function CopyButton({
  text,
  label,
  compact = false,
  onAccent = false,
}: {
  text: string
  label: string
  compact?: boolean
  onAccent?: boolean
}) {
  const [copied, setCopied] = useState(false)

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 1400)
    } catch {
      toast.error('Could not copy to clipboard')
    }
  }

  return (
    <Button
      type="button"
      variant={compact ? 'ghost' : 'outline'}
      size={compact ? 'icon-xs' : 'sm'}
      className={onAccent ? 'text-primary-foreground hover:bg-white/15 hover:text-primary-foreground' : undefined}
      aria-label={label}
      title={label}
      onClick={(event) => {
        event.stopPropagation()
        void copy()
      }}
    >
      {copied ? <CheckIcon data-icon={compact ? undefined : 'inline-start'} /> : <CopyIcon data-icon={compact ? undefined : 'inline-start'} />}
      {!compact && (copied ? 'Copied' : label)}
    </Button>
  )
}

function StatusSelect({
  lead,
  onChange,
  onAccent = false,
}: {
  lead: SalesLead
  onChange: (id: string, status: SalesLeadStatus) => void
  onAccent?: boolean
}) {
  return (
    <span onClick={(event) => event.stopPropagation()}>
      <Select value={lead.status} onValueChange={(value) => onChange(lead.id, value as SalesLeadStatus)}>
        <SelectTrigger
          size="sm"
          aria-label={`Status for ${lead.name}`}
          className={cn(
            'h-8 min-w-36 rounded-lg font-medium',
            onAccent
              ? 'border-white/40 bg-white/15 text-primary-foreground hover:bg-white/25'
              : STATUS_META[lead.status].classes,
          )}
        >

          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectGroup>
            {STATUS_ORDER.map((status) => (
              <SelectItem key={status} value={status}>
                {STATUS_META[status].label}
              </SelectItem>
            ))}
          </SelectGroup>
        </SelectContent>
      </Select>
    </span>
  )
}

function StatusAge({
  lead,
  asOf,
  onAccent = false,
}: {
  lead: SalesLead
  asOf: string
  onAccent?: boolean
}) {
  return (
    <time
      dateTime={lead.status_updated_at}
      title={new Date(lead.status_updated_at).toLocaleString('en-GB', {
        dateStyle: 'medium',
        timeStyle: 'short',
        timeZone: 'Europe/Vilnius',
      })}
      className={cn(
        'whitespace-nowrap text-xs tabular-nums',
        onAccent ? 'text-primary-foreground/75' : 'text-muted-foreground',
      )}
    >
      {formatStatusAge(lead.status_updated_at, asOf)}
    </time>
  )
}

/**
 * Pipeline headline stat — same card language as the Demos screen: rounded
 * surface, a tinted corner glow that brightens on hover, icon tile, big number.
 * `tone` is a hex so the glow and the tile share one hue.
 */
function StatCard({
  label,
  value,
  detail,
  icon: Icon,
  tone,
}: {
  label: string
  value: number | string
  detail: string
  icon: typeof UsersIcon
  tone: string
}) {
  return (
    <div className="group relative overflow-hidden rounded-2xl border bg-card p-5 transition-shadow hover:shadow-md">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-10 -top-10 size-28 rounded-full opacity-20 blur-2xl transition-opacity group-hover:opacity-35"
        style={{ backgroundColor: tone }}
      />
      <div className="relative z-10 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-xs font-medium text-muted-foreground">{label}</p>
          <p className="mt-2 text-3xl font-semibold leading-none tabular-nums">{value}</p>
        </div>
        <span
          className="flex size-10 shrink-0 items-center justify-center rounded-xl"
          style={{ backgroundColor: `color-mix(in srgb, ${tone} 14%, transparent)`, color: tone }}
        >
          <Icon className="size-4.5" aria-hidden="true" />
        </span>
      </div>
      <p className="relative z-10 mt-3 text-xs text-muted-foreground">{detail}</p>
    </div>
  )
}

function DetailItem({
  label,
  value,
  icon: Icon,
  href,
  copyable,
}: {
  label: string
  value: string | null | undefined
  icon: typeof Building2Icon
  href?: string
  /** Show a copy button next to the value. */
  copyable?: boolean
}) {
  return (
    <div className="group/detail relative flex min-w-0 gap-3 rounded-xl bg-muted/50 p-3">
      {copyable && value && (
        <span className="absolute right-2 top-2">
          <CopyButton text={value} label={`Copy ${label.toLowerCase()}`} compact />
        </span>
      )}
      <Icon className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
      <div className="min-w-0">
        <dt className="text-xs text-muted-foreground">{label}</dt>
        <dd className="mt-0.5 break-words text-sm font-medium">
          {href && value ? (
            <a
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-primary underline-offset-4 hover:underline focus-visible:rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              {value}
              <ExternalLinkIcon className="size-3.5" aria-hidden="true" />
            </a>
          ) : (
            value || '—'
          )}
        </dd>
      </div>
    </div>
  )
}

export function SalesLeadsTable({
  leads: initialLeads,
  asOf,
}: {
  leads: SalesLead[]
  /** Server-render timestamp keeps relative labels stable through hydration. */
  asOf: string
}) {
  const [leads, setLeads] = useState(initialLeads)
  const [query, setQuery] = useState('')
  const [vertical, setVertical] = useState<string | null>(null)
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [openLead, setOpenLead] = useState<SalesLead | null>(null)
  const [isDetailOpen, setIsDetailOpen] = useState(false)
  const [, startTransition] = useTransition()

  const verticals = useMemo(
    () => [...new Set(leads.map((lead) => lead.vertical))].sort((a, b) => a.localeCompare(b)),
    [leads],
  )
  const counts = useMemo(() => {
    const byStatus = new Map<SalesLeadStatus, number>()
    let contacted = 0
    let hasBot = 0
    let followUpDue = 0
    let scoreSum = 0
    for (const lead of leads) {
      byStatus.set(lead.status, (byStatus.get(lead.status) ?? 0) + 1)
      if (isContacted(lead.status)) contacted += 1
      if (lead.has_chatbot) hasBot += 1
      if (needsFollowUp(lead, asOf)) followUpDue += 1
      scoreSum += lead.score
    }
    return {
      byStatus,
      contacted,
      hasBot,
      noBot: leads.length - hasBot,
      followUpDue,
      awaitingReply: AWAITING_REPLY.reduce((sum, status) => sum + (byStatus.get(status) ?? 0), 0),
      averageScore: leads.length ? Math.round(scoreSum / leads.length) : 0,
    }
  }, [leads, asOf])

  /** Count for a quick tab / dropdown entry. */
  const statusCount = (filter: StatusFilter) =>
    filter === 'all'
      ? leads.length
      : filter === 'awaiting_reply'
        ? counts.awaitingReply
        : (counts.byStatus.get(filter) ?? 0)

  const hasActiveFilters = Boolean(query.trim() || vertical || statusFilter !== 'all')

  const changeStatus = (id: string, status: SalesLeadStatus) => {
    const previous = leads
    const changedAt = new Date().toISOString()
    setLeads(leads.map((lead) => (
      lead.id === id ? { ...lead, status, status_updated_at: changedAt } : lead
    )))
    setOpenLead((lead) => (
      lead?.id === id ? { ...lead, status, status_updated_at: changedAt } : lead
    ))
    startTransition(async () => {
      try {
        await setLeadStatus(id, status)
      } catch {
        setLeads(previous)
        setOpenLead((lead) => previous.find((item) => item.id === lead?.id) ?? lead)
        toast.error('Failed to update status')
      }
    })
  }

  const filtered = useMemo(() => {
    let list = leads
    if (vertical) list = list.filter((lead) => lead.vertical === vertical)
    if (statusFilter !== 'all') list = list.filter((lead) => matchesStatusFilter(lead, statusFilter))
    if (query.trim()) {
      const normalized = query.trim().toLowerCase()
      list = list.filter((lead) =>
        [lead.name, lead.legal_name, lead.city, lead.ceo, lead.email, lead.vertical, lead.platform]
          .filter(Boolean)
          .join(' ')
          .toLowerCase()
          .includes(normalized),
      )
    }
    return list
  }, [leads, vertical, statusFilter, query])

  const resetFilters = () => {
    setQuery('')
    setVertical(null)
    setStatusFilter('all')
  }

  const openDetails = (lead: SalesLead) => {
    setOpenLead(lead)
    setIsDetailOpen(true)
  }

  return (
    <div className="flex flex-col gap-5">
      <section className="grid grid-cols-2 gap-3 xl:grid-cols-4" aria-label="Pipeline summary">
        <StatCard
          label="Total leads"
          value={leads.length}
          detail={`${counts.noBot} without a chatbot · ${counts.hasBot} switch`}
          icon={UsersIcon}
          tone="#e8590c"
        />
        <StatCard
          label="Emails sent"
          value={counts.contacted}
          detail={
            counts.followUpDue > 0
              ? `${counts.followUpDue} waiting ${FOLLOW_UP_AFTER_DAYS}+ days — follow up`
              : `${counts.awaitingReply} awaiting a reply`
          }
          icon={SendIcon}
          tone="#f59e0b"
        />
        <StatCard
          label="Ready to contact"
          value={statusCount('ready')}
          detail={`Not emailed yet · average priority ${counts.averageScore}%`}
          icon={TargetIcon}
          tone="#0ea5e9"
        />
        <StatCard
          label="Switch opportunities"
          value={counts.hasBot}
          detail="Already using a chatbot"
          icon={BotIcon}
          tone="#8b5cf6"
        />
      </section>

      <Card className="shadow-none">
        <CardHeader>
          <CardTitle>Find the next lead</CardTitle>
          <CardDescription>Search and narrow the pipeline before opening a prepared email.</CardDescription>
          {hasActiveFilters && (
            <CardAction>
              <Button variant="ghost" size="sm" onClick={resetFilters}>
                <FilterXIcon data-icon="inline-start" />
                Clear filters
              </Button>
            </CardAction>
          )}
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {/* Quick tabs — the three stages worth one click, plus All. */}
          <div
            className="flex w-full flex-wrap gap-1 rounded-xl bg-muted/60 p-1"
            role="group"
            aria-label="Quick status filter"
          >
            {QUICK_TABS.map((tab) => {
              const active = statusFilter === tab.value
              return (
                <button
                  key={tab.value}
                  type="button"
                  aria-pressed={active}
                  onClick={() => setStatusFilter(tab.value)}
                  className={cn(
                    'flex-1 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors',
                    active
                      ? 'bg-background text-foreground shadow-sm'
                      : 'text-muted-foreground hover:text-foreground',
                  )}
                >
                  {tab.label}
                  <span className="ml-1.5 tabular-nums opacity-60">{statusCount(tab.value)}</span>
                </button>
              )
            })}
          </div>

          <div className="grid gap-3 sm:grid-cols-[minmax(220px,1fr)_220px_200px]">
            <label className="relative block">
              <span className="sr-only">Search sales leads</span>
              <SearchIcon className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
              <Input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search company, city, CEO…"
                className="h-10 bg-background pl-9"
              />
            </label>

            {/* Categories moved off the horizontal scroller into a dropdown. */}
            <Select
              value={vertical ?? 'all'}
              onValueChange={(value) => setVertical(value === 'all' ? null : value)}
            >
              <SelectTrigger aria-label="Filter by category" className="h-10 w-full bg-background">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectItem value="all">All categories ({leads.length})</SelectItem>
                  {verticals.map((item) => (
                    <SelectItem key={item} value={item}>
                      {item} ({leads.filter((lead) => lead.vertical === item).length})
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>

            {/* Full stage list — the tabs cover the common three, this reaches
                the demo track, clients, and rejections. */}
            <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value as StatusFilter)}>
              <SelectTrigger aria-label="Filter by status" className="h-10 w-full bg-background">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectItem value="all">All statuses ({leads.length})</SelectItem>
                  <SelectItem value="awaiting_reply">Emails sent ({counts.awaitingReply})</SelectItem>
                  {STATUS_ORDER.map((status) => (
                    <SelectItem key={status} value={status}>
                      {STATUS_META[status].label} ({statusCount(status)})
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card className="overflow-hidden shadow-none">
        <CardHeader>
          <CardTitle>Pipeline</CardTitle>
          <CardDescription>{filtered.length} of {leads.length} prospects match the current view.</CardDescription>
          <CardAction>
            <Badge variant="outline">
              <TargetIcon data-icon="inline-start" />
              Ranked by fit
            </Badge>
          </CardAction>
        </CardHeader>

        <CardContent className="px-0">
          <div className="hidden md:block">
            <Table className="min-w-[1020px]">
              <TableHeader className="bg-muted/30">
                <TableRow className="hover:bg-muted/30">
                  <TableHead className="w-20 border-r pl-4 text-xs uppercase tracking-wide text-muted-foreground">Score</TableHead>
                  <TableHead className="w-48 border-r text-xs uppercase tracking-wide text-muted-foreground">Company</TableHead>
                  <TableHead className="border-r text-xs uppercase tracking-wide text-muted-foreground">Platform</TableHead>
                  <TableHead className="border-r text-xs uppercase tracking-wide text-muted-foreground">Category</TableHead>
                  <TableHead className="border-r text-xs uppercase tracking-wide text-muted-foreground">Contact</TableHead>
                  <TableHead className="border-r text-xs uppercase tracking-wide text-muted-foreground">Status</TableHead>
                  <TableHead className="w-28 text-xs uppercase tracking-wide text-muted-foreground">Updated</TableHead>
                  <TableHead className="w-10"><span className="sr-only">Open</span></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((lead) => {
                  // Won leads own the whole row in the accent color; a first
                  // email left unanswered past the threshold gets a faint amber
                  // wash so follow-ups are easy to spot while scanning.
                  const isClient = lead.status === 'client'
                  const stale = needsFollowUp(lead, asOf)
                  const cellBorder = isClient ? 'border-r border-white/20' : 'border-r'
                  return (
                    <TableRow
                      key={lead.id}
                      tabIndex={0}
                      aria-label={`Open ${lead.name}`}
                      onClick={() => openDetails(lead)}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter' || event.key === ' ') {
                          event.preventDefault()
                          openDetails(lead)
                        }
                      }}
                      className={cn(
                        'group cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                        isClient &&
                          'bg-primary text-primary-foreground hover:bg-primary/90 has-aria-expanded:bg-primary/90 focus-visible:bg-primary/90',
                        !isClient && stale && 'bg-amber-50/60 hover:bg-amber-100/70 focus-visible:bg-amber-100/70',
                        !isClient && !stale && 'focus-visible:bg-muted/50',
                      )}
                    >
                      <TableCell className={cn(cellBorder, 'pl-4')}>
                        <ScoreTile value={lead.score} onAccent={isClient} />
                      </TableCell>
                      <TableCell className={cellBorder}>
                        <div className="w-44 min-w-0">
                          <span className="block truncate font-medium">{lead.name}</span>
                          {lead.legal_name && (
                            <span
                              className={cn(
                                'mt-0.5 block truncate text-xs',
                                isClient ? 'text-primary-foreground/75' : 'text-muted-foreground',
                              )}
                            >
                              {lead.legal_name}
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className={cellBorder}>
                        <PlatformBadge platform={lead.platform} onAccent={isClient} />
                      </TableCell>
                      <TableCell className={cellBorder}>
                        <VerticalBadge vertical={lead.vertical} onAccent={isClient} />
                      </TableCell>
                      <TableCell className={cellBorder}>
                        <div className="flex min-w-44 flex-col gap-0.5">
                          {lead.email ? (
                            <span className="flex items-center gap-1 text-xs">
                              <span className="max-w-44 truncate">{lead.email}</span>
                              <CopyButton
                                text={lead.email}
                                label="Copy email address"
                                compact
                                onAccent={isClient}
                              />
                            </span>
                          ) : (
                            <span
                              className={cn(
                                'text-xs',
                                isClient ? 'text-primary-foreground/75' : 'text-muted-foreground',
                              )}
                            >
                              No email
                            </span>
                          )}
                          {lead.phone && (
                            <span
                              className={cn(
                                'text-xs tabular-nums',
                                isClient ? 'text-primary-foreground/75' : 'text-muted-foreground',
                              )}
                            >
                              {lead.phone}
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className={cellBorder}>
                        <StatusSelect lead={lead} onChange={changeStatus} onAccent={isClient} />
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col gap-0.5">
                          <StatusAge lead={lead} asOf={asOf} onAccent={isClient} />
                          {stale && !isClient && (
                            <span className="flex items-center gap-1 text-xs font-medium text-amber-700">
                              <ClockAlertIcon className="size-3" aria-hidden="true" />
                              Follow up
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <ArrowUpRightIcon
                          className={cn(
                            'size-4 transition-colors',
                            isClient
                              ? 'text-primary-foreground/70'
                              : 'text-muted-foreground group-hover:text-primary',
                          )}
                          aria-hidden="true"
                        />
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </div>

          <div className="flex flex-col divide-y md:hidden">
            {filtered.map((lead) => {
              const isClient = lead.status === 'client'
              const stale = needsFollowUp(lead, asOf)
              return (
                <div
                  key={lead.id}
                  className={cn(
                    'flex flex-col gap-3 p-4',
                    isClient && 'bg-primary text-primary-foreground',
                    !isClient && stale && 'bg-amber-50/60',
                  )}
                >
                  <button type="button" className="flex w-full items-start gap-3 text-left" onClick={() => openDetails(lead)}>
                    <ScoreTile value={lead.score} onAccent={isClient} />
                    <span className="min-w-0 flex-1">
                      <span className="font-medium">{lead.name}</span>
                      <span className="mt-1 flex flex-wrap items-center gap-2">
                        <PlatformBadge platform={lead.platform} onAccent={isClient} />
                        <VerticalBadge vertical={lead.vertical} onAccent={isClient} />
                        {!isClient && <BotBadge has={lead.has_chatbot} />}
                      </span>
                    </span>
                  </button>
                  <div className="flex items-end justify-between gap-3 pl-13">
                    <span
                      className={cn(
                        'truncate pb-1.5 text-xs',
                        isClient ? 'text-primary-foreground/75' : 'text-muted-foreground',
                      )}
                    >
                      {stale && !isClient ? (
                        <span className="flex items-center gap-1 font-medium text-amber-700">
                          <ClockAlertIcon className="size-3 shrink-0" aria-hidden="true" />
                          Follow up due
                        </span>
                      ) : (
                        lead.email || lead.phone || 'No contact details'
                      )}
                    </span>
                    <span className="flex shrink-0 flex-col items-end gap-1">
                      <StatusSelect lead={lead} onChange={changeStatus} onAccent={isClient} />
                      <StatusAge lead={lead} asOf={asOf} onAccent={isClient} />
                    </span>
                  </div>
                </div>
              )
            })}
          </div>

          {filtered.length === 0 && (
            <div className="flex flex-col items-center gap-3 px-4 py-16 text-center">
              <span className="flex size-11 items-center justify-center rounded-xl bg-muted">
                <SearchIcon className="size-5 text-muted-foreground" aria-hidden="true" />
              </span>
              <div>
                <p className="font-medium">No leads found</p>
                <p className="mt-1 text-sm text-muted-foreground">Try clearing a filter or using a broader search.</p>
              </div>
              <Button variant="outline" size="sm" onClick={resetFilters}>Clear filters</Button>
            </div>
          )}
        </CardContent>
        <CardFooter className="justify-between text-xs text-muted-foreground">
          <span>Showing {filtered.length} of {leads.length}</span>
          <span className="hidden sm:inline">Priority weighs fit, reachability, revenue, and service pressure.</span>
        </CardFooter>
      </Card>

      <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
        {openLead && (
          <DialogContent
            showCloseButton={false}
            className="lead-detail-panel inset-y-0 right-0 left-auto top-0 flex h-dvh w-full max-w-2xl translate-x-0 translate-y-0 flex-col gap-0 overflow-hidden rounded-none border-l bg-background p-0 shadow-2xl sm:max-w-2xl"
            overlayClassName="lead-detail-backdrop bg-black/35 supports-backdrop-filter:backdrop-blur-[2px]"
          >
            <DialogHeader className="shrink-0 border-b bg-card p-5 pr-16">
              <div className="flex items-start gap-3">
                <ScoreTile value={openLead.score} />
                <div className="min-w-0 flex-1">
                  <DialogTitle className="text-xl leading-tight">{openLead.name}</DialogTitle>
                  <DialogDescription className="mt-1">{openLead.legal_name || host(openLead.website)}</DialogDescription>
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <PlatformBadge platform={openLead.platform} />
                    <BotBadge has={openLead.has_chatbot} />
                    <Badge variant="secondary">{openLead.vertical}</Badge>
                  </div>
                </div>
              </div>
            </DialogHeader>

            <Button
              variant="ghost"
              size="icon"
              className="absolute right-4 top-4"
              aria-label="Close lead details"
              onClick={() => setIsDetailOpen(false)}
            >
              <XIcon />
            </Button>

            <div className="flex shrink-0 flex-wrap items-center gap-2 border-b bg-muted/30 px-5 py-3">
              {openLead.email_body && <CopyButton text={openLead.email_body} label="Copy email body" />}
              {openLead.email && openLead.email_body && (
                <Button
                  variant="outline"
                  size="sm"
                  nativeButton={false}
                  render={
                    <a
                      href={`mailto:${encodeURIComponent(openLead.email)}?subject=${encodeURIComponent(openLead.email_subject ?? '')}&body=${encodeURIComponent(openLead.email_body)}`}
                    />
                  }
                >
                  <MailIcon data-icon="inline-start" />
                  Open mail app
                </Button>
              )}
              <Button
                variant="ghost"
                size="sm"
                nativeButton={false}
                render={<a href={openLead.website} target="_blank" rel="noopener noreferrer" />}
              >
                <ExternalLinkIcon data-icon="inline-start" />
                Visit website
              </Button>
              <div className="ml-auto flex flex-col items-end gap-1">
                <StatusSelect lead={openLead} onChange={changeStatus} />
                <StatusAge lead={openLead} asOf={asOf} />
              </div>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-5 [scrollbar-gutter:stable]">
              <div className="flex min-h-full flex-col gap-5">
                <dl className="grid shrink-0 gap-3 sm:grid-cols-2">
                  <DetailItem label="Company" value={openLead.legal_name} icon={Building2Icon} />
                  <DetailItem label="City" value={openLead.city} icon={MapPinIcon} />
                  <DetailItem label="Decision-maker" value={openLead.ceo} icon={UserRoundIcon} />
                  <DetailItem label="Platform" value={openLead.platform} icon={StoreIcon} />
                  <DetailItem label="Email" value={openLead.email} icon={MailIcon} copyable />
                  <DetailItem label="Phone" value={openLead.phone} icon={MessageSquareTextIcon} copyable />
                  <DetailItem label="Company size" value={openLead.size_info} icon={UsersIcon} />
                  <DetailItem
                    label="Website"
                    value={host(openLead.website)}
                    icon={Globe2Icon}
                    href={openLead.website}
                  />
                </dl>

                {openLead.fit_note && (
                  <Card size="sm" className="shrink-0 overflow-visible bg-primary/5 ring-primary/15">
                    <CardHeader>
                      <CardTitle className="text-base">Why Loqara fits</CardTitle>
                      <CardDescription>What makes this company a relevant prospect.</CardDescription>
                      <CardAction className="flex size-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
                        <SparklesIcon className="size-4" aria-hidden="true" />
                      </CardAction>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm leading-6 text-foreground/90">{openLead.fit_note}</p>
                    </CardContent>
                  </Card>
                )}

                {openLead.score_why && (
                  <Card size="sm" className="shrink-0 overflow-visible">
                    <CardHeader>
                      <CardTitle className="text-base">Priority reasoning</CardTitle>
                      <CardDescription>Why this lead ranks at {openLead.score}%.</CardDescription>
                      <CardAction className="flex size-8 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                        <TargetIcon className="size-4" aria-hidden="true" />
                      </CardAction>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm leading-6 text-foreground/90">{openLead.score_why}</p>
                    </CardContent>
                    {openLead.source && <CardFooter className="text-xs text-muted-foreground">Sources: {openLead.source}</CardFooter>}
                  </Card>
                )}

                {openLead.email_body && (
                  <Card className="shrink-0 overflow-visible ring-primary/20">
                    <CardHeader className="border-b bg-primary/5">
                      <CardTitle className="flex items-center gap-2">
                        <MailIcon className="size-4 text-primary" aria-hidden="true" />
                        Prepared email
                      </CardTitle>
                      <CardDescription className="flex items-center gap-1.5">
                        <span className="min-w-0 truncate">{openLead.email_subject || 'No subject prepared'}</span>
                        {openLead.email_subject && (
                          <CopyButton text={openLead.email_subject} label="Copy subject" compact />
                        )}
                      </CardDescription>
                      <CardAction><CopyButton text={openLead.email_body} label="Copy email body" /></CardAction>
                    </CardHeader>
                    <CardContent>
                      <div className="min-h-64 whitespace-pre-wrap rounded-lg bg-muted/30 p-5 text-[15px] leading-7 sm:p-6">
                        {openLead.email_body}
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            </div>
          </DialogContent>
        )}
      </Dialog>
    </div>
  )
}
