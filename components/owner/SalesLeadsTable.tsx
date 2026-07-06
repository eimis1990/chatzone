'use client'

import { useMemo, useState, useTransition } from 'react'
import {
  SearchIcon,
  XIcon,
  CopyIcon,
  CheckIcon,
  MailIcon,
  ExternalLinkIcon,
  BotIcon,
  SparklesIcon,
} from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { setLeadStatus } from '@/app/(owner)/owner/leads/actions'
import type { SalesLead, SalesLeadStatus } from '@/lib/types'

const STATUS_META: Record<SalesLeadStatus, { label: string; classes: string }> = {
  ready: { label: 'Ready', classes: 'bg-primary/10 text-primary border-primary/20' },
  email_sent: {
    label: 'Email sent',
    classes: 'bg-amber-500/15 text-amber-700 border-amber-500/20 dark:text-amber-400',
  },
  rejected: { label: 'Rejected', classes: 'bg-muted text-muted-foreground border-border' },
  accepted: {
    label: 'Accepted',
    classes: 'bg-emerald-500/15 text-emerald-700 border-emerald-500/20 dark:text-emerald-400',
  },
  client: {
    label: 'Our client',
    classes: 'bg-violet-500/15 text-violet-700 border-violet-500/20 dark:text-violet-400',
  },
}
const STATUS_ORDER: SalesLeadStatus[] = ['ready', 'email_sent', 'rejected', 'accepted', 'client']

function host(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '')
  } catch {
    return url
  }
}

/** Chance score as a ~270° arc gauge showing just the percentage. */
function ScoreGauge({ value }: { value: number }) {
  const pct = Math.max(0, Math.min(100, value))
  // 270° sweep with a gap at the bottom, starting bottom-left (135°).
  const R = 15
  const C = 2 * Math.PI * R
  const sweep = 0.75 // 270° of the full circle
  const dash = C * sweep
  return (
    <span className="inline-flex flex-col items-center" title={`${pct} / 100`}>
      <svg width="44" height="38" viewBox="0 0 40 40" aria-hidden="true">
        <g transform="rotate(135 20 20)">
          <circle
            cx="20" cy="20" r={R} fill="none" strokeWidth="5" strokeLinecap="round"
            className="stroke-muted" strokeDasharray={`${dash} ${C}`}
          />
          <circle
            cx="20" cy="20" r={R} fill="none" strokeWidth="5" strokeLinecap="round"
            className="stroke-primary" strokeDasharray={`${(dash * pct) / 100} ${C}`}
          />
        </g>
        <text x="20" y="20" textAnchor="middle" dominantBaseline="central" className="fill-foreground text-[11px] font-semibold tabular-nums">
          {pct}%
        </text>
      </svg>
    </span>
  )
}

const PLATFORM_STYLE: Record<string, string> = {
  WooCommerce: 'bg-[#7f54b3]/12 text-[#7f54b3] dark:text-[#c9a6ec]',
  Shopify: 'bg-[#5e8e3e]/15 text-[#4a7a2f] dark:text-[#95bf47]',
  Magento: 'bg-[#ee672f]/15 text-[#d1571f] dark:text-[#f5915f]',
}
function PlatformBadge({ platform }: { platform: string | null }) {
  if (!platform) return null
  const cls = PLATFORM_STYLE[platform] ?? 'bg-muted text-muted-foreground'
  return (
    <span className={cn('rounded px-1.5 py-0.5 text-[10px] font-medium leading-none', cls)}>
      {platform}
    </span>
  )
}

/** Existing-chatbot indicator. No bot = green (easy win); has bot = amber (switch). */
function BotBadge({ has }: { has: boolean | null }) {
  if (has === null) return <span className="text-muted-foreground/50">—</span>
  return has ? (
    <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/15 px-2 py-0.5 text-xs font-medium text-amber-700 dark:text-amber-400">
      <BotIcon className="size-3" /> Has bot
    </span>
  ) : (
    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-2 py-0.5 text-xs font-medium text-emerald-700 dark:text-emerald-400">
      <SparklesIcon className="size-3" /> Open
    </span>
  )
}

function CopyButton({ text, label }: { text: string; label?: string }) {
  const [copied, setCopied] = useState(false)
  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation()
        void navigator.clipboard.writeText(text).then(() => {
          setCopied(true)
          setTimeout(() => setCopied(false), 1200)
        })
      }}
      className="inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-xs text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
      title="Copy"
    >
      {copied ? <CheckIcon className="size-3 text-primary" /> : <CopyIcon className="size-3" />}
      {label}
    </button>
  )
}

/** Per-lead status picker — themed Select with the status color on the trigger. */
function StatusSelect({
  lead,
  onChange,
}: {
  lead: SalesLead
  onChange: (id: string, status: SalesLeadStatus) => void
}) {
  return (
    // Rows open the drawer on click — the picker must not bubble.
    <span onClick={(e) => e.stopPropagation()}>
      <Select value={lead.status} onValueChange={(v) => onChange(lead.id, v as SalesLeadStatus)}>
        <SelectTrigger
          size="sm"
          aria-label={`Status for ${lead.name}`}
          className={cn('h-8 w-[128px] rounded-md font-medium', STATUS_META[lead.status].classes)}
        >
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {STATUS_ORDER.map((s) => (
            <SelectItem key={s} value={s}>
              {STATUS_META[s].label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </span>
  )
}

export function SalesLeadsTable({ leads: initialLeads }: { leads: SalesLead[] }) {
  const [leads, setLeads] = useState(initialLeads)
  const [query, setQuery] = useState('')
  const [vertical, setVertical] = useState<string | null>(null)
  const [statusFilter, setStatusFilter] = useState<SalesLeadStatus | 'all'>('all')
  const [botFilter, setBotFilter] = useState<'all' | 'no' | 'yes'>('all')
  const [openLead, setOpenLead] = useState<SalesLead | null>(null)
  const [, startTransition] = useTransition()

  const verticals = useMemo(() => [...new Set(leads.map((l) => l.vertical))], [leads])

  const changeStatus = (id: string, status: SalesLeadStatus) => {
    // Optimistic: flip locally, persist in the background, roll back on failure.
    const prev = leads
    setLeads(leads.map((l) => (l.id === id ? { ...l, status } : l)))
    setOpenLead((o) => (o && o.id === id ? { ...o, status } : o))
    startTransition(async () => {
      try {
        await setLeadStatus(id, status)
      } catch {
        setLeads(prev)
        toast.error('Failed to update status')
      }
    })
  }

  const filtered = useMemo(() => {
    let list = leads
    if (vertical) list = list.filter((l) => l.vertical === vertical)
    if (statusFilter !== 'all') list = list.filter((l) => l.status === statusFilter)
    if (botFilter === 'no') list = list.filter((l) => !l.has_chatbot)
    else if (botFilter === 'yes') list = list.filter((l) => l.has_chatbot)
    if (query.trim()) {
      const q = query.trim().toLowerCase()
      list = list.filter((l) =>
        [l.name, l.legal_name, l.city, l.ceo, l.email, l.vertical, l.platform]
          .filter(Boolean)
          .join(' ')
          .toLowerCase()
          .includes(q),
      )
    }
    return list
  }, [leads, vertical, statusFilter, botFilter, query])

  const noBotCount = useMemo(() => leads.filter((l) => !l.has_chatbot).length, [leads])

  const chip = (active: boolean) =>
    cn(
      'rounded-full border px-3 py-1 text-xs font-medium transition-colors',
      active
        ? 'border-primary bg-primary text-primary-foreground'
        : 'border-border bg-card text-muted-foreground hover:border-primary/50 hover:text-foreground',
    )

  return (
    <div className="space-y-4">
      {/* Toolbar: search + status filter side by side, category chips below */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative w-full max-w-xs">
          <SearchIcon className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search company, city, CEO…"
            className="bg-card pl-8"
          />
        </div>
        <Select
          value={statusFilter}
          onValueChange={(v) => setStatusFilter(v as SalesLeadStatus | 'all')}
        >
          <SelectTrigger aria-label="Filter by status" className="w-44 bg-card">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            {STATUS_ORDER.map((s) => (
              <SelectItem key={s} value={s}>
                {STATUS_META[s].label} ({leads.filter((l) => l.status === s).length})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={botFilter} onValueChange={(v) => setBotFilter(v as 'all' | 'no' | 'yes')}>
          <SelectTrigger aria-label="Filter by existing chatbot" className="w-52 bg-card">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Any chatbot status</SelectItem>
            <SelectItem value="no">No chatbot — easy win ({noBotCount})</SelectItem>
            <SelectItem value="yes">Has chatbot — switch ({leads.length - noBotCount})</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="flex flex-wrap gap-1.5">
        <button type="button" className={chip(vertical === null)} onClick={() => setVertical(null)}>
          All ({leads.length})
        </button>
        {verticals.map((v) => (
          <button
            key={v}
            type="button"
            className={chip(vertical === v)}
            onClick={() => setVertical(vertical === v ? null : v)}
          >
            {v} ({leads.filter((l) => l.vertical === v).length})
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-xl border bg-card">
        <table className="w-full min-w-[900px] text-sm">
          <thead>
            <tr className="border-b text-left text-xs uppercase tracking-wide text-muted-foreground">
              <th className="px-3 py-2.5 font-medium">#</th>
              <th className="px-3 py-2.5 font-medium">Company</th>
              <th className="px-3 py-2.5 font-medium">Chance</th>
              <th className="px-3 py-2.5 font-medium">Category</th>
              <th className="px-3 py-2.5 font-medium">City</th>
              <th className="px-3 py-2.5 font-medium">Bot</th>
              <th className="px-3 py-2.5 font-medium">Contact</th>
              <th className="px-3 py-2.5 font-medium">Status</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((l, i) => (
              <tr
                key={l.id}
                onClick={() => setOpenLead(l)}
                className="cursor-pointer border-b transition-colors last:border-b-0 hover:bg-muted/40"
              >
                <td className="px-3 py-2.5 tabular-nums text-muted-foreground">{i + 1}</td>
                <td className="px-3 py-2.5">
                  <div className="font-medium">{l.name}</div>
                  {(l.platform || l.legal_name) && (
                    <div className="mt-0.5 flex items-center gap-1.5 text-xs text-muted-foreground">
                      <PlatformBadge platform={l.platform} />
                      {l.legal_name && <span>{l.legal_name}</span>}
                    </div>
                  )}
                </td>
                <td className="px-3 py-2.5">
                  <ScoreGauge value={l.score} />
                </td>
                <td className="px-3 py-2.5">
                  <span className="rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium">{l.vertical}</span>
                </td>
                <td className="px-3 py-2.5">{l.city ?? <span className="text-muted-foreground/50">—</span>}</td>
                <td className="px-3 py-2.5">
                  <BotBadge has={l.has_chatbot} />
                </td>
                <td className="px-3 py-2.5">
                  <div className="text-xs">
                    {l.email ? (
                      <span className="inline-flex items-center">
                        {l.email} <CopyButton text={l.email} />
                      </span>
                    ) : (
                      <span className="text-muted-foreground/50">no email</span>
                    )}
                  </div>
                  {l.phone && <div className="text-xs text-muted-foreground tabular-nums">{l.phone}</div>}
                </td>
                <td className="px-3 py-2.5">
                  <StatusSelect lead={l} onChange={changeStatus} />
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={8} className="px-3 py-10 text-center text-muted-foreground">
                  No leads match the current filters.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-muted-foreground">
        Showing {filtered.length} of {leads.length}. Chance (0–100) weighs commerce fit, revenue,
        known decision-maker, reachable email, existing chat tooling, and after-hours pain.
      </p>

      {/* Detail drawer */}
      {openLead && (
        <>
          <div
            className="fixed inset-0 z-40 bg-black/30 duration-200 animate-in fade-in-0"
            onClick={() => setOpenLead(null)}
            aria-hidden="true"
          />
          <aside
            role="dialog"
            aria-modal="true"
            aria-label={openLead.name}
            className="fixed inset-y-0 right-0 z-50 flex w-full max-w-2xl flex-col border-l bg-background shadow-2xl duration-300 ease-out animate-in slide-in-from-right"
          >
            <div className="flex items-start gap-3 border-b p-5">
              <div className="min-w-0 flex-1">
                <h2 className="text-lg font-semibold leading-tight">{openLead.name}</h2>
                {openLead.legal_name && (
                  <p className="text-sm text-muted-foreground">{openLead.legal_name}</p>
                )}
              </div>
              <StatusSelect lead={openLead} onChange={changeStatus} />
              <button
                type="button"
                onClick={() => setOpenLead(null)}
                aria-label="Close"
                className="rounded-md border p-1.5 text-muted-foreground transition-colors hover:text-foreground"
              >
                <XIcon className="size-4" />
              </button>
            </div>

            <div className="flex-1 space-y-5 overflow-y-auto p-5">
              <dl className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
                {[
                  ['Priority', `${openLead.score}/100`],
                  ['Category', openLead.vertical],
                  ['City', openLead.city],
                  ['CEO', openLead.ceo],
                  ['Email', openLead.email],
                  ['Phone', openLead.phone],
                  ['Size', openLead.size_info],
                  ['Platform', openLead.platform],
                  ['Existing chatbot', openLead.has_chatbot === null ? null : openLead.has_chatbot ? 'Yes — switch target' : 'No — easy win'],
                ].map(([k, v]) => (
                  <div key={k}>
                    <dt className="text-xs uppercase tracking-wide text-muted-foreground">{k}</dt>
                    <dd className="font-medium break-words">{v || '—'}</dd>
                  </div>
                ))}
                <div className="col-span-2">
                  <dt className="text-xs uppercase tracking-wide text-muted-foreground">Website</dt>
                  <dd>
                    <a
                      href={openLead.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 font-medium text-primary hover:underline"
                    >
                      {host(openLead.website)} <ExternalLinkIcon className="size-3.5" />
                    </a>
                  </dd>
                </div>
              </dl>

              {openLead.fit_note && (
                <div className="rounded-lg bg-emerald-500/10 p-3 text-sm text-emerald-800 dark:text-emerald-300">
                  {openLead.fit_note}
                </div>
              )}
              {openLead.score_why && (
                <p className="text-xs text-muted-foreground">
                  <b>Why this priority:</b> {openLead.score_why}
                </p>
              )}
              {openLead.source && (
                <p className="text-xs text-muted-foreground">Sources: {openLead.source}</p>
              )}

              {openLead.email_body && (
                <div className="overflow-hidden rounded-xl border">
                  <div className="flex items-center gap-2 border-b bg-muted/40 px-4 py-2.5">
                    <MailIcon className="size-4 text-primary" />
                    <span className="text-sm font-semibold">Cold email</span>
                    <div className="ml-auto flex items-center gap-1">
                      {openLead.email && (
                        <a
                          href={`mailto:${encodeURIComponent(openLead.email)}?subject=${encodeURIComponent(openLead.email_subject ?? '')}&body=${encodeURIComponent(openLead.email_body)}`}
                          className="rounded-md border bg-background px-2.5 py-1 text-xs font-medium transition-colors hover:border-primary hover:text-primary"
                        >
                          Open in mail app
                        </a>
                      )}
                      <CopyButton
                        text={`Tema: ${openLead.email_subject ?? ''}\n\n${openLead.email_body}`}
                        label="Copy"
                      />
                    </div>
                  </div>
                  {openLead.email_subject && (
                    <div className="border-b px-4 py-2 text-sm">
                      <span className="text-muted-foreground">Subject: </span>
                      {openLead.email_subject}
                    </div>
                  )}
                  <pre className="max-w-full whitespace-pre-wrap p-4 font-sans text-sm leading-relaxed">
                    {openLead.email_body}
                  </pre>
                </div>
              )}
            </div>
          </aside>
        </>
      )}
    </div>
  )
}
