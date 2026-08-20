import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import {
  CheckCircle2Icon,
  MessageCircleIcon,
  ShieldCheckIcon,
  InboxIcon,
  ExternalLinkIcon,
} from 'lucide-react'
import { requireRole, getUserOrgIds } from '@/lib/auth/guards'
import { createServerClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { getEnv } from '@/lib/env'
import { decryptSecret, encryptSecret } from '@/lib/channels/crypto'
import { fetchUserPages, subscribePageToApp } from '@/lib/channels/oauth'
import { CONNECT_COOKIE } from '@/app/api/channels/meta/oauth/callback/route'
import { MessengerConnectForm } from '@/components/client/MessengerConnectForm'
import { buttonVariants } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
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
    redirect('/app/channels/messenger/connect?connected=1')
  }

  const pending = await pendingSession()
  const pages =
    pending && pending.orgId === orgId ? await fetchUserPages(pending.userToken).catch(() => []) : []

  const sb = await createServerClient()
  const { data: bots } = await sb
    .from('bots')
    .select('id, name')
    .eq('org_id', orgId)
    .eq('status', 'active')
    .order('name')

  // The freshly connected (or most recent) connection for the success state.
  const connection = connected
    ? ((
        await createServiceClient()
          .from('channel_connections')
          .select('display_name, avatar_url, external_account_id, bot_id, status')
          .eq('org_id', orgId)
          .eq('provider', 'messenger')
          .order('updated_at', { ascending: false })
          .limit(1)
          .maybeSingle<{
            display_name: string | null
            avatar_url: string | null
            external_account_id: string
            bot_id: string
            status: string
          }>()
      ).data ?? null)
    : null
  const connectionBot = connection ? (bots ?? []).find((b) => b.id === connection.bot_id) : null

  const configured = Boolean(getEnv().META_APP_ID && getEnv().CHANNEL_TOKEN_KEY)

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6 p-6">
      <div className="flex items-start gap-3">
        <span className="mt-0.5 flex size-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
          <MessageCircleIcon className="size-5" fill="currentColor" aria-hidden="true" />
        </span>
        <div>
          <h1 className="text-lg font-semibold">Connect Facebook Messenger</h1>
          <p className="text-sm text-muted-foreground">
            Link a Facebook Page to one of your chatbots. Visitors who message the Page get AI
            answers, and your team can take over from the Inbox.
          </p>
        </div>
      </div>

      {error && ERRORS[error] && (
        <p
          role="alert"
          className="rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive"
        >
          {ERRORS[error]}
        </p>
      )}

      {connection ? (
        <div className="overflow-hidden rounded-xl border bg-card">
          <div className="flex items-center gap-3 border-b bg-green-50/60 px-5 py-4">
            <CheckCircle2Icon className="size-5 shrink-0 text-green-600" aria-hidden="true" />
            <p className="text-sm font-medium text-green-900">
              Messenger is connected and answering
            </p>
          </div>
          <div className="flex flex-col gap-5 p-5">
            <div className="flex items-center gap-3">
              {connection.avatar_url ? (
                <Image
                  src={connection.avatar_url}
                  alt=""
                  width={44}
                  height={44}
                  className="size-11 rounded-full border"
                  unoptimized
                />
              ) : (
                <span className="flex size-11 items-center justify-center rounded-full bg-muted text-base font-semibold text-muted-foreground">
                  {(connection.display_name ?? 'P').slice(0, 1)}
                </span>
              )}
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium">{connection.display_name}</p>
                <p className="text-sm text-muted-foreground">
                  Answered by <span className="font-medium text-foreground">{connectionBot?.name ?? 'your chatbot'}</span>
                </p>
              </div>
              <Badge className="bg-green-100 text-green-800 hover:bg-green-100">Active</Badge>
            </div>
            <div className="rounded-lg bg-muted/50 px-4 py-3 text-sm text-muted-foreground">
              Try it: send your Page a message from your personal Messenger — the bot replies in
              a few seconds. Conversations appear in your Inbox with a Messenger badge.
            </div>
            <div className="flex flex-wrap gap-2">
              <Link href="/app/inbox" className={cn(buttonVariants(), 'h-10 px-5')}>
                <InboxIcon className="size-4" aria-hidden="true" />
                Open Inbox
              </Link>
              <a
                href={`https://m.me/${connection.external_account_id}`}
                target="_blank"
                rel="noreferrer"
                className={cn(buttonVariants({ variant: 'outline' }), 'h-10 px-5')}
              >
                <ExternalLinkIcon className="size-4" aria-hidden="true" />
                Message the Page
              </a>
            </div>
          </div>
        </div>
      ) : !configured ? (
        <p className="rounded-xl border bg-card p-5 text-sm text-muted-foreground">
          {ERRORS.not_configured}
        </p>
      ) : pages.length === 0 ? (
        <div className="rounded-xl border bg-card p-5">
          <ol className="flex flex-col gap-3 text-sm">
            {[
              'Sign in with Facebook and approve access',
              'Pick the Facebook Page to connect',
              'Choose which chatbot answers it',
            ].map((step, i) => (
              <li key={step} className="flex items-center gap-3">
                <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-semibold text-muted-foreground">
                  {i + 1}
                </span>
                {step}
              </li>
            ))}
          </ol>
          <a
            href={`/api/channels/meta/oauth/start${botId ? `?botId=${botId}` : ''}`}
            className={cn(
              buttonVariants(),
              'mt-5 h-10 bg-[#1877F2] px-5 text-white hover:bg-[#166fe5]',
            )}
          >
            <svg viewBox="0 0 24 24" className="size-4" fill="currentColor" aria-hidden="true">
              <path d="M24 12.07C24 5.4 18.63 0 12 0S0 5.4 0 12.07C0 18.1 4.39 23.09 10.13 24v-8.44H7.08v-3.49h3.05V9.41c0-3.02 1.79-4.7 4.53-4.7 1.31 0 2.68.24 2.68.24v2.97h-1.51c-1.49 0-1.96.93-1.96 1.89v2.26h3.33l-.53 3.49h-2.8V24C19.61 23.09 24 18.1 24 12.07Z" />
            </svg>
            Continue with Facebook
          </a>
          <p className="mt-3 flex items-center gap-1.5 text-xs text-muted-foreground">
            <ShieldCheckIcon className="size-3.5 shrink-0" aria-hidden="true" />
            You choose which Page Loqara may access. We never see your Facebook password.
          </p>
        </div>
      ) : (
        <MessengerConnectForm
          pages={pages.map((p) => ({ id: p.id, name: p.name, picture: p.picture }))}
          bots={bots ?? []}
          defaultBotId={botId}
          action={connectPage}
        />
      )}
    </div>
  )
}
