import Link from 'next/link'
import {
  PresentationIcon,
  PlusIcon,
  SlidersHorizontalIcon,
  Globe2Icon,
  PackageIcon,
  ShieldAlertIcon,
  ChevronDownIcon,
  ArrowUpRightIcon,
} from 'lucide-react'
import { requireRole } from '@/lib/auth/guards'
import { createServiceClient } from '@/lib/supabase/service'
import { getOrCreateDemoOrg } from '@/lib/demo-org'
import { readableTextColor } from '@/lib/utils'
import { buttonVariants } from '@/components/ui/button'
import { CreateBotDialog } from '@/components/client/CreateBotDialog'
import { createDemoBot } from './actions'
import type { BotConfig } from '@/lib/types'

function host(url?: string): string | null {
  if (!url) return null
  try {
    return new URL(url).hostname.replace(/^www\./, '')
  } catch {
    return url
  }
}

/**
 * Prospect demo bots: prepared per pitch in the Loqara Demos org (is_demo —
 * excluded from client stats), edited with the demos-scoped editor, presented
 * full-screen from /present/[botId].
 */
export default async function OwnerDemosPage() {
  await requireRole('owner')
  const org = await getOrCreateDemoOrg()
  const svc = createServiceClient()
  const { data: bots } = await svc
    .from('bots')
    .select('id, name, public_key, created_at, config')
    .eq('org_id', org.id)
    .order('created_at', { ascending: false })

  // Indexed-products count per demo — the "is this pitch-ready?" signal.
  const counts = new Map<string, number>()
  await Promise.all(
    (bots ?? []).map(async (b) => {
      const { count } = await svc
        .from('product_embeddings')
        .select('id', { count: 'exact', head: true })
        .eq('bot_id', b.id)
      counts.set(b.id, count ?? 0)
    }),
  )

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-lg font-semibold">Demo bots</h1>
        <p className="text-sm text-muted-foreground">
          Prepare a bot per prospect, then present it full-screen during the pitch. Demos never
          count toward client stats.
        </p>
      </div>

      {/* New-demo card first, then the demos — same layout as Clients. */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <CreateBotDialog
          orgId={org.id}
          action={createDemoBot}
          configureBase="/owner/demos"
          trigger={
            <button
              type="button"
              className="group flex h-full min-h-[172px] w-full flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-border bg-card/40 text-muted-foreground transition-colors hover:border-primary hover:bg-primary/5 hover:text-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <span className="flex size-11 items-center justify-center rounded-lg border border-dashed border-current">
                <PlusIcon className="size-5" aria-hidden="true" />
              </span>
              <span className="text-sm font-medium">New demo</span>
              <span className="text-xs">Usually the prospect&rsquo;s store name</span>
            </button>
          }
        />
        {(bots ?? []).map((bot) => {
            const cfg = bot.config as BotConfig
            const brand = cfg?.theme?.launcherColor || cfg?.theme?.primaryColor || '#4f46e5'
            const avatar = cfg?.avatarUrl
            const store = host(cfg?.commerce?.storeUrl)
            const indexed = counts.get(bot.id) ?? 0
            const created = new Date(bot.created_at as string).toLocaleDateString('en-GB', {
              day: 'numeric',
              month: 'short',
            })
            return (
              <div
                key={bot.id}
                className="group relative overflow-hidden rounded-2xl border bg-card p-5 transition-shadow hover:shadow-md"
              >
                {/* Whole card opens the editor; buttons sit above the overlay. */}
                <Link
                  href={`/owner/demos/${bot.id}/configure`}
                  aria-label={`Open ${bot.name}`}
                  className="absolute inset-0 z-0"
                />
                {/* Brand-colored glow so each card carries the prospect's look. */}
                <div
                  aria-hidden="true"
                  className="pointer-events-none absolute -right-10 -top-10 size-28 rounded-full opacity-20 blur-2xl transition-opacity group-hover:opacity-35"
                  style={{ backgroundColor: brand }}
                />
                <ArrowUpRightIcon
                  aria-hidden="true"
                  className="pointer-events-none absolute right-4 top-4 z-10 size-4 -translate-x-1 translate-y-1 text-gray-700 opacity-0 transition-all duration-200 group-hover:translate-x-0 group-hover:translate-y-0 group-hover:opacity-100"
                />
                <div className="pointer-events-none relative z-10 flex items-start gap-3">
                  {avatar ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={avatar}
                      alt=""
                      className="size-11 shrink-0 rounded-full border object-cover"
                    />
                  ) : (
                    <span
                      className="flex size-11 shrink-0 items-center justify-center rounded-full text-base font-semibold"
                      style={{ backgroundColor: brand, color: readableTextColor(brand) }}
                    >
                      {bot.name.trim().charAt(0).toUpperCase()}
                    </span>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold">{bot.name}</p>
                    <p className="flex items-center gap-1 truncate text-xs text-muted-foreground">
                      <Globe2Icon className="size-3 shrink-0" aria-hidden="true" />
                      {store ?? 'No store connected'}
                    </p>
                  </div>
                </div>

                <div className="pointer-events-none relative z-10 mt-4 text-xs text-muted-foreground">
                  <span
                    className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-medium ${
                      indexed > 0 ? 'bg-green-100 text-green-700' : 'bg-muted'
                    }`}
                  >
                    <PackageIcon className="size-3" aria-hidden="true" />
                    {indexed > 0 ? `${indexed.toLocaleString()} products indexed` : 'Catalog not synced'}
                  </span>
                </div>

                <div className="relative z-10 mt-4 flex items-end gap-2">
                  <Link
                    href={`/owner/demos/${bot.id}/configure`}
                    className={buttonVariants({ variant: 'outline', size: 'lg' })}
                  >
                    <SlidersHorizontalIcon data-icon="inline-start" />
                    Configure
                  </Link>
                  <Link
                    href={`/present/${bot.id}`}
                    target="_blank"
                    className={buttonVariants({ size: 'lg' })}
                  >
                    <PresentationIcon data-icon="inline-start" />
                    Present
                  </Link>
                  <span className="ml-auto pb-0.5 text-xs text-muted-foreground">
                    Created {created}
                  </span>
                </div>
              </div>
            )
          })}
      </div>

      {/* Field reference: stores that block our servers (keep — pitch-call material). */}
      <details className="group rounded-2xl border bg-card">
        <summary className="flex cursor-pointer list-none items-center gap-3 p-5 [&::-webkit-details-marker]:hidden">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-amber-100 text-amber-700">
            <ShieldAlertIcon className="size-4" aria-hidden="true" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-sm font-semibold">
              Store blocks the connection? (Cloudflare)
            </span>
            <span className="block text-xs text-muted-foreground">
              What to tell a client when &ldquo;Test connection&rdquo; fails on the live site but
              their store opens fine in a browser.
            </span>
          </span>
          <ChevronDownIcon
            className="size-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-180"
            aria-hidden="true"
          />
        </summary>
        <div className="space-y-3 border-t px-5 py-4 text-sm">
          <p>
            Some stores (e.g. dropslietuva.com) sit behind Cloudflare bot protection that blocks
            traffic from cloud servers — so product search works when you test from{' '}
            <strong>your computer</strong>, but fails from the <strong>live platform</strong>. The
            fix is a 2-minute change on the client&rsquo;s side, and it only exposes the same
            public, read-only product data their website already serves to every visitor.
          </p>
          <ol className="list-decimal space-y-1.5 pl-5">
            <li>
              Client logs into <strong>Cloudflare</strong> → selects their domain →{' '}
              <strong>Security → WAF → Custom rules</strong> → <em>Create rule</em>.
            </li>
            <li>
              Condition: <strong>URI Path</strong> <em>starts with</em>{' '}
              <code className="rounded bg-muted px-1.5 py-0.5 text-xs">/wp-json/wc/store/</code>
            </li>
            <li>
              Action: <strong>Skip</strong> → tick <em>Bot Fight Mode</em> (and{' '}
              <em>Super Bot Fight Mode</em> if shown) → Deploy.
            </li>
            <li>
              Alternative: <strong>Security → Bots</strong> → turn <em>Bot Fight Mode</em> off
              entirely — many shops have it on without knowing.
            </li>
          </ol>
          <p className="text-muted-foreground">
            What to say on the call: &ldquo;Your Cloudflare currently blocks store integrations —
            one skip-rule for the public product API fixes it, takes two minutes, and changes
            nothing for your visitors.&rdquo; Afterwards, <strong>Test connection</strong> turns
            green and one <strong>Sync catalog</strong> makes the bot fully product-aware.
          </p>
        </div>
      </details>
    </div>
  )
}
