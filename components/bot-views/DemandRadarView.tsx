'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { toast } from 'sonner'
import {
  ArrowRightIcon,
  BellRingIcon,
  BookOpenCheckIcon,
  BotIcon,
  CheckIcon,
  ChevronRightIcon,
  CircleHelpIcon,
  CopyIcon,
  FolderPlusIcon,
  InfoIcon,
  LanguagesIcon,
  LockKeyholeIcon,
  MessageCircleQuestionIcon,
  PencilLineIcon,
  SearchXIcon,
  ShieldCheckIcon,
  TagsIcon,
  TargetIcon,
  TrendingDownIcon,
  TrendingUpIcon,
  UsersIcon,
  WrenchIcon,
  type LucideIcon,
} from 'lucide-react'
import { AnalyticsRangeSelector } from '@/components/client/charts/AnalyticsRangeSelector'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button, buttonVariants } from '@/components/ui/button'
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSet,
} from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Separator } from '@/components/ui/separator'
import { Spinner } from '@/components/ui/spinner'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Textarea } from '@/components/ui/textarea'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'
import {
  DEMAND_ISSUE_LABELS,
  type DemandActionId,
  type DemandIssueType,
  type DemandOpportunity,
  type DemandRadarDay,
  type DemandRadarSnapshot,
} from '@/lib/demand-radar'
import type {
  DemandActionPlanInput,
  DemandActionPlanResult,
  ExecutableDemandActionId,
} from '@/lib/demand-actions'

const ISSUE_META: Record<DemandIssueType, {
  dot: string
  text: string
  soft: string
}> = {
  product_gap: {
    dot: 'bg-primary',
    text: 'text-primary',
    soft: 'bg-primary/10',
  },
  knowledge_gap: {
    dot: 'bg-[#2498ed]',
    text: 'text-[#197dca]',
    soft: 'bg-[#2498ed]/10',
  },
  store_limitation: {
    dot: 'bg-[#8b5cf6]',
    text: 'text-[#7142de]',
    soft: 'bg-[#8b5cf6]/10',
  },
}

const ACTION_ICONS: Record<DemandActionId, LucideIcon> = {
  fix_product_attributes: TagsIcon,
  add_faq: CircleHelpIcon,
  improve_product_description: PencilLineIcon,
  create_collection: FolderPlusIcon,
  add_missing_synonym: LanguagesIcon,
  notify_merchandising_team: BellRingIcon,
  publish_correction: LockKeyholeIcon,
}

function formatDateLabel(value: string): string {
  return new Date(`${value}T12:00:00Z`).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

function formatEvidenceDate(value: string): string {
  return new Date(value).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
}

function channelLabel(channel: string): string {
  if (channel === 'messenger') return 'Messenger'
  if (channel === 'voice') return 'Voice'
  return 'Web chat'
}

function Trend({ value }: { value: number }) {
  const positive = value >= 0
  const Icon = positive ? TrendingUpIcon : TrendingDownIcon
  return (
    <span className={cn('inline-flex items-center gap-1 font-medium', positive ? 'text-primary' : 'text-muted-foreground')}>
      <Icon className="size-3.5" aria-hidden="true" />
      {positive ? '+' : ''}{value}%
    </span>
  )
}

function DemandChart({ data }: { data: DemandRadarDay[] }) {
  const hasSignals = data.some((day) => day.productGaps + day.knowledgeGaps + day.storeLimitations > 0)
  if (!hasSignals) {
    return (
      <div className="flex h-[290px] flex-col items-center justify-center gap-3 text-center">
        <div className="flex size-12 items-center justify-center rounded-2xl bg-muted text-muted-foreground">
          <SearchXIcon className="size-5" aria-hidden="true" />
        </div>
        <div>
          <p className="font-medium">No unmet-demand trend yet</p>
          <p className="mt-1 max-w-sm text-sm text-muted-foreground">
            The chart will appear after the assistant records unresolved product or support requests.
          </p>
        </div>
      </div>
    )
  }

  return (
    <ResponsiveContainer width="100%" height={290}>
      <AreaChart data={data} margin={{ top: 12, right: 10, left: -22, bottom: 0 }}>
        <defs>
          <linearGradient id="demandProduct" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--primary)" stopOpacity={0.2} />
            <stop offset="100%" stopColor="var(--primary)" stopOpacity={0} />
          </linearGradient>
          <linearGradient id="demandKnowledge" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#2498ed" stopOpacity={0.14} />
            <stop offset="100%" stopColor="#2498ed" stopOpacity={0} />
          </linearGradient>
          <linearGradient id="demandLimitation" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#8b5cf6" stopOpacity={0.12} />
            <stop offset="100%" stopColor="#8b5cf6" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" className="stroke-border" vertical={false} />
        <XAxis
          dataKey="date"
          tick={{ fontSize: 11 }}
          tickFormatter={formatDateLabel}
          minTickGap={28}
          className="fill-muted-foreground"
        />
        <YAxis tick={{ fontSize: 11 }} allowDecimals={false} className="fill-muted-foreground" />
        <RechartsTooltip
          labelFormatter={(value) => formatDateLabel(String(value))}
          contentStyle={{
            borderRadius: 10,
            border: '1px solid var(--border)',
            background: 'var(--popover)',
            fontSize: 12,
          }}
        />
        <Area
          type="monotone"
          dataKey="productGaps"
          name="Product gaps"
          stroke="var(--primary)"
          fill="url(#demandProduct)"
          strokeWidth={2}
          dot={false}
        />
        <Area
          type="monotone"
          dataKey="knowledgeGaps"
          name="Knowledge gaps"
          stroke="#2498ed"
          fill="url(#demandKnowledge)"
          strokeWidth={2}
          dot={false}
        />
        <Area
          type="monotone"
          dataKey="storeLimitations"
          name="Store limitations"
          stroke="#8b5cf6"
          fill="url(#demandLimitation)"
          strokeWidth={2}
          dot={false}
        />
      </AreaChart>
    </ResponsiveContainer>
  )
}

function MetricStrip({ snapshot }: { snapshot: DemandRadarSnapshot }) {
  const topLabel = snapshot.topIssueType ? DEMAND_ISSUE_LABELS[snapshot.topIssueType] : 'No dominant gap'
  const metrics = [
    {
      label: 'Unmet shoppers',
      value: snapshot.totalShoppers,
      sub: 'unique visitors in this period',
      Icon: UsersIcon,
      iconClass: 'bg-primary/10 text-primary',
    },
    {
      label: 'Evidence signals',
      value: snapshot.totalSignals,
      sub: `${snapshot.totalConversations} affected conversations`,
      Icon: MessageCircleQuestionIcon,
      iconClass: ISSUE_META.knowledge_gap.soft + ' ' + ISSUE_META.knowledge_gap.text,
    },
    {
      label: 'Top intent cluster',
      value: topLabel,
      sub: snapshot.opportunities.length > 0 ? `${snapshot.opportunities.length} opportunities detected` : 'waiting for enough evidence',
      Icon: TargetIcon,
      iconClass: ISSUE_META.store_limitation.soft + ' ' + ISSUE_META.store_limitation.text,
    },
  ]

  return (
    <Card className="py-0">
      <CardContent className="grid p-0 md:grid-cols-3">
        {metrics.map(({ label, value, sub, Icon, iconClass }, index) => (
          <div
            key={label}
            className={cn('flex min-w-0 items-center gap-3 p-4 lg:p-5', index > 0 && 'border-t md:border-l md:border-t-0')}
          >
            <div className={cn('flex size-11 shrink-0 items-center justify-center rounded-2xl', iconClass)}>
              <Icon className="size-5" aria-hidden="true" />
            </div>
            <div className="min-w-0">
              <p className="text-xs text-muted-foreground">{label}</p>
              <p className="truncate text-xl font-semibold tracking-tight">{value}</p>
              <p className="truncate text-xs text-muted-foreground">{sub}</p>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  )
}

function OpportunityTable({
  opportunities,
  selectedId,
  onSelect,
}: {
  opportunities: DemandOpportunity[]
  selectedId: string
  onSelect: (opportunity: DemandOpportunity) => void
}) {
  return (
    <Card>
      <CardHeader className="border-b">
        <CardTitle className="flex items-center gap-2">
          Fastest-growing demand
          <Tooltip>
            <TooltipTrigger aria-label="About fastest-growing demand">
              <InfoIcon className="size-4 text-muted-foreground" aria-hidden="true" />
            </TooltipTrigger>
            <TooltipContent>Ranked by affected shoppers, then recent growth.</TooltipContent>
          </Tooltip>
        </CardTitle>
        <CardDescription>Unresolved needs detected in shopper conversations</CardDescription>
      </CardHeader>
      <CardContent className="px-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12 pl-4 text-xs text-muted-foreground">Rank</TableHead>
              <TableHead className="text-xs text-muted-foreground">Intent cluster</TableHead>
              <TableHead className="hidden text-xs text-muted-foreground sm:table-cell">Issue</TableHead>
              <TableHead className="text-right text-xs text-muted-foreground">Shoppers</TableHead>
              <TableHead className="hidden text-right text-xs text-muted-foreground md:table-cell">Trend</TableHead>
              <TableHead className="w-12"><span className="sr-only">Open</span></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {opportunities.slice(0, 8).map((opportunity, index) => {
              const meta = ISSUE_META[opportunity.issueType]
              const selected = selectedId === opportunity.id
              return (
                <TableRow
                  key={opportunity.id}
                  data-state={selected ? 'selected' : undefined}
                  tabIndex={0}
                  role="button"
                  aria-label={`Open ${opportunity.title}`}
                  onClick={() => onSelect(opportunity)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault()
                      onSelect(opportunity)
                    }
                  }}
                  className="cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <TableCell className="pl-4 text-muted-foreground">{index + 1}</TableCell>
                  <TableCell className="max-w-72 whitespace-normal font-medium">{opportunity.title}</TableCell>
                  <TableCell className="hidden sm:table-cell">
                    <span className="inline-flex items-center gap-2 text-xs text-muted-foreground">
                      <span className={cn('size-2 rounded-full', meta.dot)} aria-hidden="true" />
                      {DEMAND_ISSUE_LABELS[opportunity.issueType]}
                    </span>
                  </TableCell>
                  <TableCell className="text-right font-medium">{opportunity.shoppers}</TableCell>
                  <TableCell className="hidden text-right md:table-cell"><Trend value={opportunity.trendPercent} /></TableCell>
                  <TableCell>
                    <ChevronRightIcon className={cn('size-4 text-muted-foreground', selected && 'text-primary')} aria-hidden="true" />
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  )
}

function OpportunityDetail({
  botId,
  opportunity,
  createActionPlanAction,
}: {
  botId: string
  opportunity: DemandOpportunity
  createActionPlanAction: (input: DemandActionPlanInput) => Promise<DemandActionPlanResult>
}) {
  const recommended = opportunity.actions.filter((action) => action.recommended && action.id !== 'publish_correction')
  const secondary = opportunity.actions.filter((action) => !action.recommended && action.id !== 'publish_correction')
  const [selectedIds, setSelectedIds] = useState<Set<DemandActionId>>(
    () => new Set(recommended.map((action) => action.id)),
  )
  const [reviewOpen, setReviewOpen] = useState(false)
  const [faqQuestion, setFaqQuestion] = useState(opportunity.evidence[0]?.question ?? opportunity.title)
  const [faqAnswer, setFaqAnswer] = useState('')
  const [synonymPhrase, setSynonymPhrase] = useState(opportunity.title)
  const [synonymReplacement, setSynonymReplacement] = useState('')
  const [saving, setSaving] = useState(false)
  const [lastResult, setLastResult] = useState<DemandActionPlanResult | null>(null)
  const meta = ISSUE_META[opportunity.issueType]

  const toggleAction = (id: DemandActionId) => {
    setSelectedIds((current) => {
      const next = new Set(current)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const selectedActions = opportunity.actions.filter((action) => selectedIds.has(action.id))
  const summary = [
    `Demand Radar: ${opportunity.title}`,
    `${opportunity.shoppers} shoppers · ${opportunity.trendPercent >= 0 ? '+' : ''}${opportunity.trendPercent}% vs previous 7 days`,
    '',
    'Detected issue:',
    opportunity.detectedIssue,
    '',
    'Proposed actions:',
    ...selectedActions.map((action) => `- ${action.label}`),
  ].join('\n')

  const copySummary = async () => {
    try {
      await navigator.clipboard.writeText(summary)
      toast.success('Opportunity summary copied')
    } catch {
      toast.error('Could not copy the summary')
    }
  }

  const createPlan = async () => {
    const selected = [...selectedIds].filter((id): id is ExecutableDemandActionId => id !== 'publish_correction')
    if (selected.includes('add_faq') && (faqQuestion.trim().length < 5 || faqAnswer.trim().length < 10)) {
      toast.error('Complete the FAQ question and answer before applying the plan')
      return
    }
    if (selected.includes('add_missing_synonym') && (
      synonymPhrase.trim().length < 2 ||
      synonymReplacement.trim().length < 2 ||
      synonymPhrase.trim().toLocaleLowerCase('lt-LT') === synonymReplacement.trim().toLocaleLowerCase('lt-LT')
    )) {
      toast.error('Add different shopper and catalogue terms for the synonym')
      return
    }

    setSaving(true)
    try {
      const result = await createActionPlanAction({
        planId: crypto.randomUUID(),
        botId,
        opportunity: {
          key: opportunity.id,
          title: opportunity.title,
          issueType: opportunity.issueType,
          evidence: opportunity.evidence,
        },
        selectedActions: selected,
        ...(selected.includes('add_faq') ? {
          faq: { question: faqQuestion.trim(), answer: faqAnswer.trim() },
        } : {}),
        ...(selected.includes('add_missing_synonym') ? {
          synonym: { phrase: synonymPhrase.trim(), replacement: synonymReplacement.trim() },
        } : {}),
      })
      if (!result.ok) {
        toast.error(result.error ?? 'Could not save the action plan')
        return
      }

      setLastResult(result)
      setReviewOpen(false)
      const appliedCount = Object.values(result.actions ?? {}).filter((action) => action?.status === 'applied').length
      toast.success(appliedCount > 0 ? 'Plan saved and Loqara updated' : 'Action plan saved', {
        description: appliedCount > 0
          ? `${appliedCount} approved ${appliedCount === 1 ? 'change is' : 'changes are'} active. The connected store was not modified.`
          : 'The selected store changes are saved for review; nothing was published.',
      })
    } catch {
      toast.error('Could not save the action plan')
    } finally {
      setSaving(false)
    }
  }

  const actionRow = (action: DemandOpportunity['actions'][number]) => {
    const Icon = ACTION_ICONS[action.id]
    const checked = selectedIds.has(action.id)
    return (
      <button
        key={action.id}
        type="button"
        title={action.description}
        onClick={() => toggleAction(action.id)}
        className={cn(
          'flex w-full items-center gap-3 rounded-lg border px-3 py-2.5 text-left transition-colors hover:bg-muted/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
          checked && 'border-primary/35 bg-primary/5',
        )}
        aria-pressed={checked}
      >
        <div className={cn('flex size-8 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground', checked && 'bg-primary/10 text-primary')}>
          <Icon className="size-4" aria-hidden="true" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium">{action.label}</p>
        </div>
        <div className={cn('flex size-5 shrink-0 items-center justify-center rounded-full border', checked && 'border-primary bg-primary text-primary-foreground')}>
          {checked ? <CheckIcon className="size-3" aria-hidden="true" /> : null}
        </div>
      </button>
    )
  }

  return (
    <>
      <Card className="xl:sticky xl:top-6">
        <CardHeader className="border-b">
          <div className="mb-2 flex items-center gap-2">
            <Badge variant="outline" className={cn(meta.soft, meta.text)}>
              {DEMAND_ISSUE_LABELS[opportunity.issueType]}
            </Badge>
            <span className="text-xs text-muted-foreground">Top opportunity</span>
          </div>
          <CardTitle className="text-lg">{opportunity.title}</CardTitle>
          <CardDescription className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <span>{opportunity.shoppers} shoppers</span>
            <span aria-hidden="true">·</span>
            <Trend value={opportunity.trendPercent} />
            <span className="text-xs">vs. previous 7 days</span>
          </CardDescription>
        </CardHeader>

        <CardContent className="flex flex-col gap-4">
          <section>
            <div className="mb-2 flex items-center gap-2">
              <WrenchIcon className="size-4 text-primary" aria-hidden="true" />
              <h3 className="font-medium">Detected issue</h3>
            </div>
            <p className="text-sm leading-5 text-muted-foreground">{opportunity.detectedIssue}</p>
          </section>

          <Separator />

          <section>
            <div className="mb-3 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <MessageCircleQuestionIcon className="size-4 text-primary" aria-hidden="true" />
                <h3 className="font-medium">Evidence from conversations</h3>
              </div>
              <Button variant="ghost" size="icon-sm" onClick={copySummary} aria-label="Copy opportunity summary">
                <CopyIcon />
              </Button>
            </div>
            <div className="flex flex-col gap-2">
              {opportunity.evidence.slice(0, 2).map((evidence) => (
                <blockquote key={`${evidence.date}-${evidence.question}`} className="rounded-lg bg-muted/60 px-3 py-2">
                  <p className="text-sm italic leading-5">“{evidence.question}”</p>
                  <footer className="mt-1.5 text-xs text-muted-foreground">
                    {formatEvidenceDate(evidence.date)} · {channelLabel(evidence.channel)}
                  </footer>
                </blockquote>
              ))}
            </div>
          </section>

          <Separator />

          <section>
            <div className="mb-3">
              <h3 className="font-medium">Recommended actions</h3>
              <p className="mt-1 text-xs leading-4 text-muted-foreground">
                Generated from conversation evidence. Choose what should enter review.
              </p>
            </div>
            <div className="flex flex-col gap-2">{recommended.map(actionRow)}</div>
            {secondary.length > 0 ? (
              <details className="group mt-3">
                <summary className="cursor-pointer list-none rounded-md py-1 text-sm font-medium text-muted-foreground hover:text-foreground">
                  Other actions <span className="ml-1 text-xs">({secondary.length})</span>
                </summary>
                <div className="mt-2 flex flex-col gap-2">{secondary.map(actionRow)}</div>
              </details>
            ) : null}
          </section>

          <Button onClick={() => setReviewOpen(true)} disabled={selectedIds.size === 0}>
            Review &amp; apply plan
            <ArrowRightIcon data-icon="inline-end" />
          </Button>
          <p className="-mt-3 text-center text-xs text-muted-foreground">FAQ and synonym changes apply to Loqara only.</p>

          {lastResult?.ok ? (
            <Alert>
              <ShieldCheckIcon />
              <AlertTitle>Plan saved</AlertTitle>
              <AlertDescription className="space-y-2">
                <p>
                  {lastResult.status === 'partial'
                    ? 'Some Loqara changes need attention. Store tasks are still safely saved.'
                    : 'Approved Loqara changes are active. Your connected store is unchanged.'}
                </p>
                <ul className="space-y-1">
                  {Object.entries(lastResult.actions ?? {}).map(([id, result]) => {
                    if (!result) return null
                    const action = opportunity.actions.find((candidate) => candidate.id === id)
                    return (
                      <li key={id} className="flex items-start gap-2">
                        <span
                          className={cn(
                            'mt-1.5 size-1.5 shrink-0 rounded-full',
                            result.status === 'failed' ? 'bg-destructive' : result.status === 'applied' ? 'bg-primary' : 'bg-muted-foreground',
                          )}
                          aria-hidden="true"
                        />
                        <span><span className="font-medium text-foreground">{action?.label ?? id}:</span> {result.message}</span>
                      </li>
                    )
                  })}
                </ul>
              </AlertDescription>
            </Alert>
          ) : null}

          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger
                render={<span className="block" />}
              >
                <Button variant="outline" className="w-full" disabled>
                  <LockKeyholeIcon data-icon="inline-start" />
                  Publish correction to store
                </Button>
              </TooltipTrigger>
              <TooltipContent>Available after review and a supported write-back connection.</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </CardContent>
      </Card>

      <Dialog open={reviewOpen} onOpenChange={setReviewOpen}>
        <DialogContent className="max-h-[calc(100svh-2rem)] grid-rows-[auto_minmax(0,1fr)_auto] overflow-hidden sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>Review proposed actions</DialogTitle>
            <DialogDescription>
              FAQ and synonym changes apply to Loqara after approval. Product and merchandising work is saved as a task; nothing is published to the store.
            </DialogDescription>
          </DialogHeader>
          <div className="flex min-h-0 flex-col gap-5 overflow-y-auto py-2 pr-1">
            <FieldSet>
              <FieldLegend>Actions in this plan</FieldLegend>
              <FieldGroup data-slot="checkbox-group">
                {opportunity.actions
                  .filter((action) => action.id !== 'publish_correction')
                  .map((action) => {
                    const Icon = ACTION_ICONS[action.id]
                    const checked = selectedIds.has(action.id)
                    const inputId = `${opportunity.id}-${action.id}`
                    return (
                      <Field key={action.id} orientation="horizontal" className="rounded-lg border p-3 hover:bg-muted/50">
                        <Checkbox
                          id={inputId}
                          checked={checked}
                          onCheckedChange={() => toggleAction(action.id)}
                          aria-label={action.label}
                          disabled={saving}
                        />
                        <Icon className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                        <FieldContent>
                          <FieldLabel htmlFor={inputId}>{action.label}</FieldLabel>
                          <FieldDescription>{action.description}</FieldDescription>
                        </FieldContent>
                      </Field>
                    )
                  })}
              </FieldGroup>
            </FieldSet>

            {selectedIds.has('add_faq') ? (
              <FieldSet className="rounded-xl border bg-muted/30 p-4">
                <FieldLegend>FAQ draft</FieldLegend>
                <FieldDescription>This becomes searchable bot knowledge as soon as ingestion finishes.</FieldDescription>
                <FieldGroup>
                  <Field>
                    <FieldLabel htmlFor={`${opportunity.id}-faq-question`}>Question</FieldLabel>
                    <Input
                      id={`${opportunity.id}-faq-question`}
                      value={faqQuestion}
                      onChange={(event) => setFaqQuestion(event.target.value)}
                      disabled={saving}
                      maxLength={500}
                    />
                  </Field>
                  <Field>
                    <FieldLabel htmlFor={`${opportunity.id}-faq-answer`}>Approved answer</FieldLabel>
                    <Textarea
                      id={`${opportunity.id}-faq-answer`}
                      value={faqAnswer}
                      onChange={(event) => setFaqAnswer(event.target.value)}
                      placeholder="Write the verified store answer shoppers should receive…"
                      disabled={saving}
                      maxLength={4000}
                      className="min-h-28"
                    />
                    <FieldDescription>Use confirmed store information only; Loqara will ground future answers in this text.</FieldDescription>
                  </Field>
                </FieldGroup>
              </FieldSet>
            ) : null}

            {selectedIds.has('add_missing_synonym') ? (
              <FieldSet className="rounded-xl border bg-muted/30 p-4">
                <FieldLegend>Product-search synonym</FieldLegend>
                <FieldDescription>Translate shopper language into the exact wording used by this catalogue.</FieldDescription>
                <FieldGroup>
                  <Field>
                    <FieldLabel htmlFor={`${opportunity.id}-synonym-phrase`}>Shopper phrase</FieldLabel>
                    <Input
                      id={`${opportunity.id}-synonym-phrase`}
                      value={synonymPhrase}
                      onChange={(event) => setSynonymPhrase(event.target.value)}
                      disabled={saving}
                      maxLength={120}
                    />
                  </Field>
                  <Field>
                    <FieldLabel htmlFor={`${opportunity.id}-synonym-replacement`}>Catalogue term</FieldLabel>
                    <Input
                      id={`${opportunity.id}-synonym-replacement`}
                      value={synonymReplacement}
                      onChange={(event) => setSynonymReplacement(event.target.value)}
                      placeholder="e.g. removable covers"
                      disabled={saving}
                      maxLength={120}
                    />
                    <FieldDescription>Future product searches replace the shopper phrase with this canonical term.</FieldDescription>
                  </Field>
                </FieldGroup>
              </FieldSet>
            ) : null}

            {[...selectedIds].some((id) => !['add_faq', 'add_missing_synonym', 'publish_correction'].includes(id)) ? (
              <Alert>
                <LockKeyholeIcon />
                <AlertTitle>Store changes remain tasks</AlertTitle>
                <AlertDescription>
                  Product attributes, descriptions, collections, and merchandising notifications are recorded in the plan but do not edit or contact the connected store yet.
                </AlertDescription>
              </Alert>
            ) : null}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setReviewOpen(false)} disabled={saving}>Cancel</Button>
            <Button onClick={createPlan} disabled={selectedIds.size === 0 || saving}>
              {saving ? <Spinner data-icon="inline-start" /> : <BookOpenCheckIcon data-icon="inline-start" />}
              {saving ? 'Applying plan…' : 'Save & apply plan'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

function EmptyRadar({ botId }: { botId: string }) {
  return (
    <Card className="min-h-[420px] justify-center">
      <CardContent className="mx-auto flex max-w-lg flex-col items-center gap-4 py-14 text-center">
        <div className="flex size-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
          <TargetIcon className="size-6" aria-hidden="true" />
        </div>
        <div>
          <h2 className="text-lg font-semibold">Demand Radar is listening</h2>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            There are no unresolved demand patterns in this period yet. As shoppers ask questions, Loqara will surface repeated product gaps, knowledge gaps, and store limitations here.
          </p>
        </div>
        <div className="flex flex-wrap justify-center gap-2">
          <Link
            href={`/app/bots/${botId}/conversations`}
            className={buttonVariants({ size: 'lg', className: 'h-11 px-4' })}
          >
            View conversations <ArrowRightIcon data-icon="inline-end" aria-hidden="true" />
          </Link>
          <Link
            href={`/app/bots/${botId}/knowledge`}
            className={buttonVariants({ variant: 'outline', size: 'lg', className: 'h-11 px-4' })}
          >
            Improve knowledge
          </Link>
        </div>
      </CardContent>
    </Card>
  )
}

function DemandRadarHelpDialog() {
  return (
    <Dialog>
      <DialogTrigger
        render={(
          <Button
            variant="outline"
            size="lg"
            className="h-10 border-[var(--info-border)] bg-[var(--info-soft)] px-3 text-[var(--info-foreground)] hover:bg-[var(--info-soft)] hover:text-[var(--info-foreground)] hover:brightness-[0.98]"
          />
        )}
      >
        <InfoIcon data-icon="inline-start" />
        How it works
      </DialogTrigger>
      <DialogContent className="max-h-[min(82svh,42rem)] grid-rows-[auto_minmax(0,1fr)_auto] gap-0 overflow-hidden p-0 sm:max-w-[31rem]">
        <DialogHeader className="border-b px-5 py-5 pr-12">
          <DialogTitle>How Demand Radar works</DialogTitle>
          <DialogDescription className="leading-6">
            It turns repeated unresolved shopper questions into evidence-backed opportunities for your team.
          </DialogDescription>
        </DialogHeader>

        <div className="flex min-h-0 flex-col gap-6 overflow-y-auto px-5 py-5">
          <Alert className="border-[var(--info-border)] bg-[var(--info-soft)] text-[var(--info-foreground)]">
            <LockKeyholeIcon />
            <AlertTitle>Store edits stay protected</AlertTitle>
            <AlertDescription className="text-[var(--info-foreground)] opacity-80 leading-6">
              Demand Radar does not change your products. It saves recommended catalogue work for review until store write-back is enabled.
            </AlertDescription>
          </Alert>

          <section className="flex flex-col gap-4" aria-labelledby="demand-radar-process">
            <div>
              <h3 id="demand-radar-process" className="font-medium">From conversation to action</h3>
              <p className="mt-1 text-sm text-muted-foreground">A simple, review-first workflow.</p>
            </div>
            <ol className="flex flex-col gap-4">
              <li className="flex items-start gap-3">
                <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground" aria-hidden="true">
                  <MessageCircleQuestionIcon className="size-4" />
                </span>
                <div className="pt-0.5">
                  <p className="font-medium">1. Detect patterns</p>
                  <p className="mt-1 text-sm leading-5 text-muted-foreground">Groups repeated unresolved questions from recent conversations.</p>
                </div>
              </li>
              <li className="flex items-start gap-3">
                <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground" aria-hidden="true">
                  <TargetIcon className="size-4" />
                </span>
                <div className="pt-0.5">
                  <p className="font-medium">2. Show the evidence</p>
                  <p className="mt-1 text-sm leading-5 text-muted-foreground">Shows shopper examples, demand size, and recent growth.</p>
                </div>
              </li>
              <li className="flex items-start gap-3">
                <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground" aria-hidden="true">
                  <ShieldCheckIcon className="size-4" />
                </span>
                <div className="pt-0.5">
                  <p className="font-medium">3. You decide what happens</p>
                  <p className="mt-1 text-sm leading-5 text-muted-foreground">Nothing changes until you review and approve a plan.</p>
                </div>
              </li>
            </ol>
          </section>

          <section className="flex flex-col gap-4" aria-labelledby="demand-radar-capabilities">
            <div>
              <h3 id="demand-radar-capabilities" className="font-medium">What actions do today</h3>
              <p className="mt-1 text-sm text-muted-foreground">Each approved item has a clear outcome.</p>
            </div>
            <div className="grid gap-3">
              <Card size="sm" className="gap-2 bg-muted/20 py-3">
                <CardHeader>
                  <CardTitle>Improves Loqara now</CardTitle>
                  <CardAction><Badge>Active</Badge></CardAction>
                </CardHeader>
                <CardContent className="leading-5 text-muted-foreground">
                  FAQs add grounded knowledge. Synonyms improve future product searches.
                </CardContent>
              </Card>
              <Card size="sm" className="gap-2 bg-muted/20 py-3">
                <CardHeader>
                  <CardTitle>Saves work for your team</CardTitle>
                  <CardAction><Badge variant="secondary">Review task</Badge></CardAction>
                </CardHeader>
                <CardContent className="leading-5 text-muted-foreground">
                  Attributes, descriptions, collections, and merchandising notifications are saved as actionable tasks.
                </CardContent>
              </Card>
              <Card size="sm" className="gap-2 bg-muted/20 py-3">
                <CardHeader>
                  <CardTitle>Publishing to the store</CardTitle>
                  <CardAction><Badge variant="outline">Not yet</Badge></CardAction>
                </CardHeader>
                <CardContent className="leading-5 text-muted-foreground">
                  Approved corrections need a supported store write-back integration before they can be published here.
                </CardContent>
              </Card>
            </div>
          </section>
        </div>

        <DialogFooter className="mx-0 mb-0 rounded-none px-5 py-4">
          <DialogClose render={<Button size="lg" className="h-10 px-4" />}>Got it</DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export function DemandRadarView({
  bot,
  snapshot,
  rangeDays,
  rangeLabel,
  createActionPlanAction,
}: {
  bot: { id: string; name: string }
  snapshot: DemandRadarSnapshot
  rangeDays: number
  rangeLabel: string
  createActionPlanAction: (input: DemandActionPlanInput) => Promise<DemandActionPlanResult>
}) {
  const [selectedId, setSelectedId] = useState(snapshot.opportunities[0]?.id ?? '')
  const selected = useMemo(
    () => snapshot.opportunities.find((opportunity) => opportunity.id === selectedId) ?? snapshot.opportunities[0] ?? null,
    [selectedId, snapshot.opportunities],
  )

  return (
    <TooltipProvider>
      <div className="flex min-h-full flex-col gap-5 p-4 sm:p-6 lg:p-8">
        <header className="flex flex-col justify-between gap-4 lg:flex-row lg:items-start">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">Demand Radar</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              See what shoppers want, where the store falls short, and what to fix next.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <DemandRadarHelpDialog />
            <div className="inline-flex h-10 max-w-56 items-center gap-2 rounded-md border bg-card px-3 text-sm">
              <BotIcon className="size-4 shrink-0 text-primary" aria-hidden="true" />
              <span className="truncate">{bot.name}</span>
              <span className="size-1.5 shrink-0 rounded-full bg-primary" aria-label="Bot active" />
            </div>
            <AnalyticsRangeSelector range={rangeDays} rangeLabel={rangeLabel} />
          </div>
        </header>

        {selected ? (
          <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_380px]">
            <div className="flex min-w-0 flex-col gap-5">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    Unmet demand over time
                    <Tooltip>
                      <TooltipTrigger aria-label="About unmet demand over time">
                        <InfoIcon className="size-4 text-muted-foreground" aria-hidden="true" />
                      </TooltipTrigger>
                      <TooltipContent>Conversations with fallbacks, low success, negative feedback, or missed product results.</TooltipContent>
                    </Tooltip>
                  </CardTitle>
                  <CardDescription className="flex flex-wrap gap-x-4 gap-y-2 pt-1">
                    {(Object.keys(ISSUE_META) as DemandIssueType[]).map((issue) => (
                      <span key={issue} className="inline-flex items-center gap-2">
                        <span className={cn('size-2 rounded-full', ISSUE_META[issue].dot)} aria-hidden="true" />
                        {DEMAND_ISSUE_LABELS[issue]}
                      </span>
                    ))}
                  </CardDescription>
                  <CardAction>
                    <Badge variant="outline">Daily</Badge>
                  </CardAction>
                </CardHeader>
                <CardContent><DemandChart data={snapshot.daily} /></CardContent>
              </Card>

              <MetricStrip snapshot={snapshot} />

              <OpportunityTable
                opportunities={snapshot.opportunities}
                selectedId={selected.id}
                onSelect={(opportunity) => setSelectedId(opportunity.id)}
              />
            </div>

            <OpportunityDetail
              key={selected.id}
              botId={bot.id}
              opportunity={selected}
              createActionPlanAction={createActionPlanAction}
            />
          </div>
        ) : (
          <>
            <MetricStrip snapshot={snapshot} />
            <EmptyRadar botId={bot.id} />
          </>
        )}
      </div>
    </TooltipProvider>
  )
}
