import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import Image from 'next/image'
import { requireRole, getUserOrgIds } from '@/lib/auth/guards'
import { createServerClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { getEnv } from '@/lib/env'
import { decryptSecret, encryptSecret } from '@/lib/channels/crypto'
import { fetchUserPages, subscribePageToApp } from '@/lib/channels/oauth'
import { CONNECT_COOKIE } from '@/app/api/channels/meta/oauth/callback/route'
import { Button, buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'

export const metadata = { title: 'Connect Messenger | Loqara' }

const ERRORS: Record<string, string> = {
  denied: 'Facebook authorization was canceled. Try again when ready.',
  invalid_state: 'The sign-in link expired. Start again.',
  session_mismatch: 'Please finish connecting in the same browser you started in.',
  exchange_failed: 'Facebook did not accept the authorization. Try again.',
  not_configured: 'Messenger connect is not configured yet. Contact support.',
  page_taken: 'That Facebook Page is already connected to another Loqara account.',
  connect_failed: 'Connecting the Page failed. Try again.',
}

async function pendingSession(): Promise<{ userToken: string; orgId: string } | null> {
  const jar = await cookies()
  const raw = jar.get(CONNECT_COOKIE)?.value
  if (!raw) return null
  try {
    return JSON.parse(decryptSecret(raw)) as { userToken: string; orgId: string }
  } catch {
    return null
  }
}

export default async function ConnectMessengerPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; botId?: string; connected?: string }>
}) {
  await requireRole('client')
  const orgId = (await getUserOrgIds())[0]
  if (!orgId) redirect('/app')
  const { error, botId, connected } = await searchParams

  async function connectPage(formData: FormData) {
    'use server'
    await requireRole('client')
    const userOrgId = (await getUserOrgIds())[0]
    const pending = await pendingSession()
    // The OAuth cookie must belong to this user's org — no cross-org replay.
    if (!pending || !userOrgId || pending.orgId !== userOrgId) {
      redirect('/app/channels/messenger/connect?error=invalid_state')
    }
    const pageId = String(formData.get('pageId') ?? '')
    const chosenBotId = String(formData.get('botId') ?? '')

    const sb = await createServerClient()
    const { data: bot } = await sb
      .from('bots')
      .select('id, org_id')
      .eq('id', chosenBotId)
      .eq('org_id', userOrgId)
      .single<{ id: string; org_id: string }>()
    if (!bot) redirect('/app/channels/messenger/connect?error=connect_failed')

    // Re-fetch pages rather than trusting form data for tokens/names.
    const pages = await fetchUserPages(pending.userToken).catch(() => [])
    const page = pages.find((p) => p.id === pageId)
    if (!page) redirect('/app/channels/messenger/connect?error=connect_failed')

    // One Page belongs to one organization, ever (unique provider+account).
    const svc = createServiceClient()
    const { data: taken } = await svc
      .from('channel_connections')
      .select('id, org_id')
      .eq('provider', 'messenger')
      .eq('external_account_id', page.id)
      .maybeSingle<{ id: string; org_id: string }>()
    if (taken && taken.org_id !== userOrgId) {
      redirect('/app/channels/messenger/connect?error=page_taken')
    }

    try {
      await subscribePageToApp(page.access_token)
      await svc.from('channel_connections').upsert(
        {
          org_id: userOrgId,
          bot_id: bot.id,
          provider: 'messenger',
          external_account_id: page.id,
          display_name: page.name,
          avatar_url: page.picture,
          access_token_cipher: encryptSecret(page.access_token),
          scopes: ['pages_messaging', 'pages_manage_metadata', 'pages_read_engagement'],
          status: 'active',
          last_health_check_at: new Date().toISOString(),
          last_error_code: null,
          last_error_summary: null,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'provider,external_account_id' },
      )
    } catch (err) {
      console.error('[meta-connect] failed:', err instanceof Error ? err.message : err)
      redirect('/app/channels/messenger/connect?error=connect_failed')
    }
    const jar = await cookies()
    jar.delete(CONNECT_COOKIE)
    redirect(`/app/channels/messenger/connect?connected=${encodeURIComponent(page.name)}`)
  }

  const pending = await pendingSession()
  const pages = pending && pending.orgId === orgId ? await fetchUserPages(pending.userToken).catch(() => []) : []

  const sb = await createServerClient()
  const { data: bots } = await sb
    .from('bots')
    .select('id, name')
    .eq('org_id', orgId)
    .eq('status', 'active')
    .order('name')

  const configured = Boolean(getEnv().META_APP_ID && getEnv().CHANNEL_TOKEN_KEY)

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6 p-6">
      <div>
        <h1 className="text-lg font-semibold">Connect Facebook Messenger</h1>
        <p className="text-sm text-muted-foreground">
          Link a Facebook Page to one of your chatbots. Visitors who message the Page get AI
          answers, and your team can take over from the Inbox.
        </p>
      </div>

      {error && ERRORS[error] && (
        <p className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
          {ERRORS[error]}
        </p>
      )}

      {connected ? (
        <div className="rounded-xl border bg-card p-5">
          <p className="font-medium">“{connected}” is connected 🎉</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Send the Page a message from your personal Messenger to see the bot answer. Human
            takeover works from the Inbox — Messenger conversations show a blue badge.
          </p>
        </div>
      ) : !configured ? (
        <p className="text-sm text-muted-foreground">{ERRORS.not_configured}</p>
      ) : pages.length === 0 ? (
        <div className="rounded-xl border bg-card p-5">
          <p className="text-sm text-muted-foreground">
            You’ll be asked to sign in with Facebook and choose which Page Loqara may access.
            We never see your Facebook password.
          </p>
          <a
            href={`/api/channels/meta/oauth/start${botId ? `?botId=${botId}` : ''}`}
            className={cn(buttonVariants(), 'mt-4')}
          >
            Continue with Facebook
          </a>
        </div>
      ) : (
        <form action={connectPage} className="flex flex-col gap-4 rounded-xl border bg-card p-5">
          <fieldset className="flex flex-col gap-2">
            <legend className="mb-1 text-sm font-medium">Choose a Facebook Page</legend>
            {pages.map((p, i) => (
              <label
                key={p.id}
                className="flex cursor-pointer items-center gap-3 rounded-lg border p-3 has-[:checked]:border-primary has-[:checked]:bg-primary/5"
              >
                <input type="radio" name="pageId" value={p.id} defaultChecked={i === 0} required />
                {p.picture && (
                  <Image src={p.picture} alt="" width={28} height={28} className="rounded-full" unoptimized />
                )}
                <span className="text-sm font-medium">{p.name}</span>
              </label>
            ))}
          </fieldset>
          <label className="flex flex-col gap-1 text-sm font-medium">
            Answering chatbot
            <select
              name="botId"
              required
              defaultValue={botId ?? (bots ?? [])[0]?.id}
              className="rounded-lg border bg-background p-2 text-sm"
            >
              {(bots ?? []).map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          </label>
          <Button type="submit" className="self-start">
            Connect Page
          </Button>
        </form>
      )}
    </div>
  )
}
