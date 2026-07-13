'use client'

import { useMemo, useState, useTransition } from 'react'
import {
  ArrowUpRightIcon,
  BotIcon,
  Building2Icon,
  CheckIcon,
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
import type { SalesLead, SalesLeadStatus } from '@/lib/types'

const STATUS_META: Record<SalesLeadStatus, { label: string; classes: string }> = {
  ready: { label: 'Ready', classes: 'border-border bg-muted text-foreground' },
  email_sent: {
    label: 'Email sent',
    classes: 'border-amber-200 bg-amber-50 text-amber-700',
  },
  rejected: { label: 'Rejected', classes: 'border-red-200 bg-red-50 text-red-700' },
  accepted: { label: 'Accepted', classes: 'border-emerald-200 bg-emerald-50 text-emerald-700' },
  client: { label: 'Our client', classes: 'border-primary bg-primary text-primary-foreground' },
}

const STATUS_ORDER: SalesLeadStatus[] = ['ready', 'email_sent', 'rejected', 'accepted', 'client']

function host(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '')
  } catch {
    return url
  }
}

function ScoreTile({ value }: { value: number }) {
  const pct = Math.max(0, Math.min(100, value))
  return (
    <span
      className="flex size-10 shrink-0 items-center justify-center rounded-lg border border-primary/20 bg-primary/5 text-xs font-semibold tabular-nums text-primary"
      aria-label={`Chance to close ${pct}%`}
    >
      {pct}%
    </span>
  )
}

function PlatformBadge({ platform }: { platform: string | null }) {
  return (
    <Badge variant="outline" className="font-normal text-muted-foreground">
      {platform || 'Other'}
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
}: {
  text: string
  label: string
  compact?: boolean
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
}: {
  lead: SalesLead
  onChange: (id: string, status: SalesLeadStatus) => void
}) {
  return (
    <span onClick={(event) => event.stopPropagation()}>
      <Select value={lead.status} onValueChange={(value) => onChange(lead.id, value as SalesLeadStatus)}>
        <SelectTrigger
          size="sm"
          aria-label={`Status for ${lead.name}`}
          className={cn('h-8 min-w-32 rounded-lg font-medium', STATUS_META[lead.status].classes)}
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

function MetricCard({
  label,
  value,
  detail,
  icon: Icon,
}: {
  label: string
  value: number | string
  detail: string
  icon: typeof UsersIcon
}) {
  return (
    <Card size="sm" className="shadow-sm ring-foreground/5">
      <CardHeader>
        <CardDescription>{label}</CardDescription>
        <CardAction className="flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <Icon className="size-4" aria-hidden="true" />
        </CardAction>
      </CardHeader>
      <CardContent className="flex flex-col gap-1">
        <CardTitle className="text-2xl font-semibold tabular-nums">{value}</CardTitle>
        <p className="text-xs text-muted-foreground">{detail}</p>
      </CardContent>
    </Card>
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

export function SalesLeadsTable({ leads: initialLeads }: { leads: SalesLead[] }) {
  const [leads, setLeads] = useState(initialLeads)
  const [query, setQuery] = useState('')
  const [vertical, setVertical] = useState<string | null>(null)
  const [statusFilter, setStatusFilter] = useState<SalesLeadStatus | 'all'>('all')
  const [botFilter, setBotFilter] = useState<'all' | 'no' | 'yes'>('all')
  const [openLead, setOpenLead] = useState<SalesLead | null>(null)
  const [isDetailOpen, setIsDetailOpen] = useState(false)
  const [, startTransition] = useTransition()

  const verticals = useMemo(() => [...new Set(leads.map((lead) => lead.vertical))], [leads])
  const noBotCount = useMemo(() => leads.filter((lead) => !lead.has_chatbot).length, [leads])
  const hasBotCount = leads.length - noBotCount
  const readyCount = useMemo(() => leads.filter((lead) => lead.status === 'ready').length, [leads])
  const averageScore = leads.length
    ? Math.round(leads.reduce((sum, lead) => sum + lead.score, 0) / leads.length)
    : 0

  const hasActiveFilters = Boolean(query.trim() || vertical || statusFilter !== 'all' || botFilter !== 'all')

  const changeStatus = (id: string, status: SalesLeadStatus) => {
    const previous = leads
    setLeads(leads.map((lead) => (lead.id === id ? { ...lead, status } : lead)))
    setOpenLead((lead) => (lead?.id === id ? { ...lead, status } : lead))
    startTransition(async () => {
      try {
        await setLeadStatus(id, status)
      } catch {
        setLeads(previous)
        toast.error('Failed to update status')
      }
    })
  }

  const filtered = useMemo(() => {
    let list = leads
    if (vertical) list = list.filter((lead) => lead.vertical === vertical)
    if (statusFilter !== 'all') list = list.filter((lead) => lead.status === statusFilter)
    if (botFilter === 'no') list = list.filter((lead) => !lead.has_chatbot)
    if (botFilter === 'yes') list = list.filter((lead) => lead.has_chatbot)
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
  }, [leads, vertical, statusFilter, botFilter, query])

  const resetFilters = () => {
    setQuery('')
    setVertical(null)
    setStatusFilter('all')
    setBotFilter('all')
  }

  const openDetails = (lead: SalesLead) => {
    setOpenLead(lead)
    setIsDetailOpen(true)
  }

  return (
    <div className="flex flex-col gap-5">
      <section className="grid grid-cols-2 gap-3 xl:grid-cols-4" aria-label="Pipeline summary">
        <MetricCard label="Total prospects" value={leads.length} detail="Researched companies" icon={UsersIcon} />
        <MetricCard label="Open opportunities" value={noBotCount} detail="No existing chatbot" icon={SparklesIcon} />
        <MetricCard label="Switch opportunities" value={hasBotCount} detail="Already using chat" icon={BotIcon} />
        <MetricCard label="Ready to contact" value={readyCount} detail={`Average priority ${averageScore}%`} icon={SendIcon} />
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
          <div className="grid gap-3 lg:grid-cols-[minmax(260px,1fr)_190px_230px]">
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

            <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value as SalesLeadStatus | 'all')}>
              <SelectTrigger aria-label="Filter by status" className="h-10 w-full bg-background">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectItem value="all">All statuses</SelectItem>
                  {STATUS_ORDER.map((status) => (
                    <SelectItem key={status} value={status}>
                      {STATUS_META[status].label} ({leads.filter((lead) => lead.status === status).length})
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>

            <Select value={botFilter} onValueChange={(value) => setBotFilter(value as 'all' | 'no' | 'yes')}>
              <SelectTrigger aria-label="Filter by existing chatbot" className="h-10 w-full bg-background">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectItem value="all">Any chatbot status</SelectItem>
                  <SelectItem value="no">Open opportunity ({noBotCount})</SelectItem>
                  <SelectItem value="yes">Switch opportunity ({hasBotCount})</SelectItem>
                </SelectGroup>
              </SelectContent>
            </Select>
          </div>

          <div className="flex gap-2 overflow-x-auto pb-1" aria-label="Filter by category">
            <Button
              type="button"
              variant={vertical === null ? 'default' : 'outline'}
              size="sm"
              onClick={() => setVertical(null)}
            >
              All {leads.length}
            </Button>
            {verticals.map((item) => (
              <Button
                key={item}
                type="button"
                variant={vertical === item ? 'default' : 'outline'}
                size="sm"
                onClick={() => setVertical(vertical === item ? null : item)}
              >
                {item} {leads.filter((lead) => lead.vertical === item).length}
              </Button>
            ))}
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
            <Table className="min-w-[1040px]">
              <TableHeader className="bg-muted/30">
                <TableRow className="hover:bg-muted/30">
                  <TableHead className="w-20 border-r pl-4 text-xs uppercase tracking-wide text-muted-foreground">Score</TableHead>
                  <TableHead className="border-r text-xs uppercase tracking-wide text-muted-foreground">Company</TableHead>
                  <TableHead className="border-r text-xs uppercase tracking-wide text-muted-foreground">Platform</TableHead>
                  <TableHead className="border-r text-xs uppercase tracking-wide text-muted-foreground">Category</TableHead>
                  <TableHead className="border-r text-xs uppercase tracking-wide text-muted-foreground">Chatbot</TableHead>
                  <TableHead className="border-r text-xs uppercase tracking-wide text-muted-foreground">Contact</TableHead>
                  <TableHead className="text-xs uppercase tracking-wide text-muted-foreground">Status</TableHead>
                  <TableHead className="w-10"><span className="sr-only">Open</span></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((lead) => (
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
                    className="group cursor-pointer focus-visible:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <TableCell className="border-r pl-4"><ScoreTile value={lead.score} /></TableCell>
                    <TableCell className="border-r">
                      <div className="min-w-52">
                        <span className="block font-medium text-foreground">{lead.name}</span>
                        {lead.legal_name && (
                          <span className="mt-0.5 block max-w-56 truncate text-xs text-muted-foreground">{lead.legal_name}</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="border-r"><PlatformBadge platform={lead.platform} /></TableCell>
                    <TableCell className="border-r"><Badge variant="secondary">{lead.vertical}</Badge></TableCell>
                    <TableCell className="border-r"><BotBadge has={lead.has_chatbot} /></TableCell>
                    <TableCell className="border-r">
                      <div className="flex min-w-44 flex-col gap-0.5">
                        {lead.email ? (
                          <span className="flex items-center gap-1 text-xs">
                            <span className="max-w-44 truncate">{lead.email}</span>
                            <CopyButton text={lead.email} label="Copy email address" compact />
                          </span>
                        ) : (
                          <span className="text-xs text-muted-foreground">No email</span>
                        )}
                        {lead.phone && <span className="text-xs tabular-nums text-muted-foreground">{lead.phone}</span>}
                      </div>
                    </TableCell>
                    <TableCell><StatusSelect lead={lead} onChange={changeStatus} /></TableCell>
                    <TableCell>
                      <ArrowUpRightIcon className="size-4 text-muted-foreground transition-colors group-hover:text-primary" aria-hidden="true" />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          <div className="flex flex-col divide-y md:hidden">
            {filtered.map((lead) => (
              <div key={lead.id} className="flex flex-col gap-3 p-4">
                <button type="button" className="flex w-full items-start gap-3 text-left" onClick={() => openDetails(lead)}>
                  <ScoreTile value={lead.score} />
                  <span className="min-w-0 flex-1">
                    <span className="font-medium">{lead.name}</span>
                    <span className="mt-1 flex flex-wrap items-center gap-2">
                      <PlatformBadge platform={lead.platform} />
                      <Badge variant="secondary">{lead.vertical}</Badge>
                      <BotBadge has={lead.has_chatbot} />
                    </span>
                  </span>
                </button>
                <div className="flex items-center justify-between gap-3 pl-13">
                  <span className="truncate text-xs text-muted-foreground">{lead.email || lead.phone || 'No contact details'}</span>
                  <StatusSelect lead={lead} onChange={changeStatus} />
                </div>
              </div>
            ))}
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
              <div className="ml-auto"><StatusSelect lead={openLead} onChange={changeStatus} /></div>
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
