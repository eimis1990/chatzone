import Link from 'next/link'
import { PresentationIcon, PlusIcon, SlidersHorizontalIcon } from 'lucide-react'
import { requireRole } from '@/lib/auth/guards'
import { createServiceClient } from '@/lib/supabase/service'
import { getOrCreateDemoOrg } from '@/lib/demo-org'
import { Button, buttonVariants } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { createDemoBot } from './actions'

/**
 * Prospect demo bots: prepared per pitch in the Loqara Demos org (is_demo —
 * excluded from client stats), edited with the normal done-for-you editor,
 * presented full-screen from /present/[botId].
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

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-lg font-semibold">Demo bots</h1>
        <p className="text-sm text-muted-foreground">
          Prepare a bot per prospect, then present it full-screen during the pitch. Demos never
          count toward client stats.
        </p>
      </div>

      <Card size="sm">
        <CardHeader>
          <CardTitle>New demo</CardTitle>
          <CardDescription>Usually the prospect&rsquo;s store name.</CardDescription>
        </CardHeader>
        <CardContent>
          <form action={createDemoBot} className="flex max-w-md gap-2">
            <Input name="name" placeholder="e.g. The House of DROPS" required maxLength={60} />
            <Button type="submit">
              <PlusIcon data-icon="inline-start" />
              Create
            </Button>
          </form>
        </CardContent>
      </Card>

      {(bots ?? []).length === 0 ? (
        <p className="text-sm text-muted-foreground">No demo bots yet.</p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {(bots ?? []).map((bot) => {
            const store = (bot.config as { commerce?: { storeUrl?: string } })?.commerce?.storeUrl
            return (
              <Card key={bot.id} size="sm">
                <CardHeader>
                  <CardTitle className="truncate">{bot.name}</CardTitle>
                  <CardDescription className="truncate">
                    {store || 'No store connected yet'}
                  </CardDescription>
                </CardHeader>
                <CardContent className="flex gap-2">
                  <Link
                    href={`/owner/demos/${bot.id}/configure`}
                    className={buttonVariants({ variant: 'outline', size: 'sm' })}
                  >
                    <SlidersHorizontalIcon data-icon="inline-start" />
                    Configure
                  </Link>
                  <Link
                    href={`/present/${bot.id}`}
                    target="_blank"
                    className={buttonVariants({ size: 'sm' })}
                  >
                    <PresentationIcon data-icon="inline-start" />
                    Present
                  </Link>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
