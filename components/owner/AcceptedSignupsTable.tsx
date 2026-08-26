import { CheckIcon, GlobeIcon, MailIcon } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  SignupDeleteButton,
  type SignupCardData,
} from '@/components/owner/SignupCard'
import { formatDistanceToNow } from '@/lib/date-utils'

function websiteHref(website: string): string {
  return /^https?:\/\//i.test(website) ? website : `https://${website}`
}

/** Dense, responsive presentation for signups whose onboarding is complete. */
export function AcceptedSignupsTable({ signups }: { signups: SignupCardData[] }) {
  if (signups.length === 0) return null

  return (
    <section className="flex flex-col gap-3">
      <h2 className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
        Accepted
        <Badge variant="secondary">{signups.length}</Badge>
      </h2>

      <div className="overflow-hidden rounded-xl border bg-card shadow-xs">
        <Table className="table-fixed">
          <TableCaption className="sr-only">
            Accepted signups, their contact details, acquisition source, and signup timeline.
          </TableCaption>
          <TableHeader className="bg-muted/40">
            <TableRow className="hover:bg-transparent">
              <TableHead className="w-auto px-4">Client</TableHead>
              <TableHead className="hidden w-[27%] px-4 md:table-cell">Website</TableHead>
              <TableHead className="hidden w-[15%] px-4 lg:table-cell">Source</TableHead>
              <TableHead className="hidden w-[20%] px-4 sm:table-cell">Timeline</TableHead>
              <TableHead className="w-14 px-2 text-right">
                <span className="sr-only">Actions</span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {signups.map((signup) => {
              const href = signup.website ? websiteHref(signup.website) : null

              return (
                <TableRow key={signup.id}>
                  <TableCell className="min-w-0 px-4 py-3 whitespace-normal">
                    <div className="flex min-w-0 items-start gap-3">
                      <div className="relative flex size-9 shrink-0 items-center justify-center rounded-full bg-muted font-semibold text-muted-foreground">
                        {(signup.suggestedName || signup.email).charAt(0).toUpperCase()}
                        <span className="absolute -right-0.5 -bottom-0.5 flex size-4 items-center justify-center rounded-full border-2 border-card bg-primary text-primary-foreground">
                          <CheckIcon className="size-2.5" aria-hidden="true" />
                        </span>
                      </div>

                      <div className="min-w-0 flex-1">
                        <p className="truncate font-medium text-foreground" title={signup.suggestedName || undefined}>
                          {signup.suggestedName || signup.email.split('@')[0]}
                        </p>
                        <a
                          href={`mailto:${signup.email}`}
                          className="flex min-w-0 items-center gap-1 text-xs text-muted-foreground hover:text-foreground hover:underline"
                        >
                          <MailIcon className="size-3 shrink-0" aria-hidden="true" />
                          <span className="truncate">{signup.email}</span>
                        </a>

                        <div className="mt-1 flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground lg:hidden">
                          {href && (
                            <a
                              href={href}
                              target="_blank"
                              rel="noreferrer"
                              className="flex min-w-0 items-center gap-1 hover:text-foreground hover:underline md:hidden"
                            >
                              <GlobeIcon className="size-3 shrink-0" aria-hidden="true" />
                              <span className="max-w-44 truncate">{signup.website}</span>
                            </a>
                          )}
                          <Badge variant="outline">{signup.source ?? 'unknown'}</Badge>
                          <span className="sm:hidden">
                            Signed up {formatDistanceToNow(signup.created_at)}
                          </span>
                        </div>
                      </div>
                    </div>
                  </TableCell>

                  <TableCell className="hidden px-4 py-3 md:table-cell">
                    {href ? (
                      <a
                        href={href}
                        target="_blank"
                        rel="noreferrer"
                        className="flex min-w-0 items-center gap-1.5 text-muted-foreground hover:text-foreground hover:underline"
                      >
                        <GlobeIcon className="size-4 shrink-0" aria-hidden="true" />
                        <span className="truncate">{signup.website}</span>
                      </a>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </TableCell>

                  <TableCell className="hidden px-4 py-3 lg:table-cell">
                    <div className="flex flex-col items-start gap-1">
                      <Badge variant="outline">{signup.source ?? 'unknown'}</Badge>
                      {signup.acquisition_source && (
                        <span className="max-w-full truncate text-xs text-muted-foreground">
                          {signup.acquisition_source} / {signup.acquisition_medium ?? 'unknown'}
                        </span>
                      )}
                    </div>
                  </TableCell>

                  <TableCell className="hidden px-4 py-3 sm:table-cell">
                    <p className="font-medium">Signed up {formatDistanceToNow(signup.created_at)}</p>
                    {signup.invited_at && (
                      <p className="text-xs text-muted-foreground">
                        Invited {formatDistanceToNow(signup.invited_at)}
                      </p>
                    )}
                  </TableCell>

                  <TableCell className="px-2 py-2 text-right">
                    <SignupDeleteButton signup={signup} />
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </div>
    </section>
  )
}
