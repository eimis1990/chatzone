'use client'

import { useEffect, useState } from 'react'
import { XIcon, BugIcon } from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { BugStatusSelect } from '@/components/owner/BugStatusSelect'
import { formatDistanceToNow } from '@/lib/date-utils'
import type { BugReport, BugStatus } from '@/lib/types'

const STATUS_STYLES: Record<BugStatus, { label: string; dot: string; pill: string }> = {
  open: { label: 'Open', dot: 'bg-amber-500', pill: 'bg-amber-50 text-amber-700 ring-amber-600/20' },
  in_progress: { label: 'In progress', dot: 'bg-blue-500', pill: 'bg-blue-50 text-blue-700 ring-blue-600/20' },
  resolved: { label: 'Resolved', dot: 'bg-emerald-500', pill: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20' },
}

function StatusPill({ status }: { status: BugStatus }) {
  const s = STATUS_STYLES[status]
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset',
        s.pill,
      )}
    >
      <span className={cn('size-1.5 rounded-full', s.dot)} aria-hidden="true" />
      {s.label}
    </span>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
      <div>{children}</div>
    </div>
  )
}

export function BugReportsTable({ rows }: { rows: BugReport[] }) {
  const [selected, setSelected] = useState<BugReport | null>(null)
  const [open, setOpen] = useState(false)

  // Close on Escape while the drawer is open.
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open])

  const headCls = 'px-4 text-xs font-medium uppercase tracking-wide text-muted-foreground'

  return (
    <>
      <div className="overflow-hidden rounded-xl border bg-card">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className={headCls}>Reported</TableHead>
              <TableHead className={headCls}>Reporter</TableHead>
              <TableHead className={headCls}>Bug</TableHead>
              <TableHead className={headCls}>Page</TableHead>
              <TableHead className={cn(headCls, 'text-right')}>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((b) => (
              <TableRow
                key={b.id}
                onClick={() => {
                  setSelected(b)
                  setOpen(true)
                }}
                className="cursor-pointer"
              >
                <TableCell
                  className="px-4 py-3 text-muted-foreground"
                  title={new Date(b.created_at).toLocaleString()}
                >
                  {formatDistanceToNow(b.created_at)}
                </TableCell>
                <TableCell className="max-w-[200px] truncate px-4 py-3">
                  {b.reporter_email ?? '—'}
                </TableCell>
                <TableCell className="max-w-[360px] truncate px-4 py-3 font-medium text-foreground">
                  {b.title}
                </TableCell>
                <TableCell className="px-4 py-3">
                  {b.page ? (
                    <code className="rounded bg-muted px-1.5 py-0.5 text-xs text-muted-foreground">
                      {b.page}
                    </code>
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </TableCell>
                <TableCell className="px-4 py-3 text-right">
                  <StatusPill status={b.status} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Backdrop */}
      <div
        className={cn(
          'fixed inset-0 z-50 bg-black/30 transition-opacity duration-300',
          open ? 'opacity-100' : 'pointer-events-none opacity-0',
        )}
        onClick={() => setOpen(false)}
        aria-hidden="true"
      />

      {/* Right-side detail drawer (slides in) */}
      <aside
        role="dialog"
        aria-modal="true"
        aria-label="Bug report details"
        className={cn(
          'fixed inset-y-0 right-0 z-50 flex w-full max-w-md flex-col border-l bg-background shadow-2xl transition-transform duration-300 ease-out',
          open ? 'translate-x-0' : 'translate-x-full',
        )}
      >
        {selected && (
          <>
            <div className="flex items-start justify-between gap-3 border-b p-5">
              <div className="flex items-start gap-3">
                <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                  <BugIcon className="size-4" aria-hidden="true" />
                </span>
                <div>
                  <h2 className="text-base font-semibold leading-snug">{selected.title}</h2>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    Reported {formatDistanceToNow(selected.created_at)}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Close"
                className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              >
                <XIcon className="size-4" />
              </button>
            </div>

            <div className="flex-1 space-y-5 overflow-y-auto p-5">
              <div className="flex items-center justify-between gap-3">
                <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Status
                </span>
                <BugStatusSelect id={selected.id} status={selected.status} />
              </div>

              <Field label="Reporter">
                {selected.reporter_email ? (
                  <a href={`mailto:${selected.reporter_email}`} className="text-sm hover:underline">
                    {selected.reporter_email}
                  </a>
                ) : (
                  <span className="text-sm text-muted-foreground">Unknown</span>
                )}
              </Field>

              <Field label="Page">
                {selected.page ? (
                  <code className="rounded bg-muted px-1.5 py-0.5 text-xs">{selected.page}</code>
                ) : (
                  <span className="text-sm text-muted-foreground">—</span>
                )}
              </Field>

              <Field label="Description">
                <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground">
                  {selected.description}
                </p>
              </Field>

              <Field label="Reported at">
                <p className="text-sm text-muted-foreground">
                  {new Date(selected.created_at).toLocaleString()}
                </p>
              </Field>

              {selected.user_agent && (
                <Field label="Browser / device">
                  <p className="font-mono text-xs break-words text-muted-foreground">
                    {selected.user_agent}
                  </p>
                </Field>
              )}
            </div>
          </>
        )}
      </aside>
    </>
  )
}
