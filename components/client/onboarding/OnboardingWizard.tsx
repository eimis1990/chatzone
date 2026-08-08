'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { CheckIcon, Loader2Icon } from 'lucide-react'
import { cn } from '@/lib/utils'
import { trackEvent } from '@/lib/analytics'
import { normalizeWebsiteUrl, type BusinessTypeId } from '@/lib/onboarding'
import {
  startOnboardingBot,
  saveOnboardingCommerce,
  saveOnboardingTheme,
  type OnboardingCommerceInput,
} from '@/lib/actions/onboarding'
import { StepBusiness } from './StepBusiness'
import { AutoStepScene } from './AutoStepScene'
import { TeachStatus, StoreStatus } from './AutoStepStatus'
import { StepInstall } from './StepInstall'

/** Step-1 store connection choices ('none' = no catalog integration). */
export interface CommerceDraft {
  provider: OnboardingCommerceInput['provider'] | 'none'
  storeUrl: string
  shopifyDomain: string
  shopifyToken: string
  magentoToken: string
  feedUrl: string
}

const STEPS = [
  { id: 'business', title: 'Your business' },
  { id: 'teach', title: 'Teach it' },
  { id: 'store', title: 'Store' },
  { id: 'look', title: 'Look & feel' },
  { id: 'install', title: 'Install' },
] as const

type StepId = (typeof STEPS)[number]['id']

/** Keep an automated scene on screen at least this long — instant flashes read as broken. */
const MIN_SCENE_MS = 2200

async function stayAtLeast(t0: number, ms: number) {
  const left = ms - (Date.now() - t0)
  if (left > 0) await new Promise((resolve) => setTimeout(resolve, left))
}

function errorMessage(err: unknown, fallback: string): string {
  return err instanceof Error && err.message ? err.message : fallback
}

export function OnboardingWizard({ orgId, appUrl }: { orgId: string; appUrl: string }) {
  const router = useRouter()
  const [stepIndex, setStepIndex] = useState(0)

  // Step 1 — everything the automation needs.
  const [name, setName] = useState('')
  const [websiteUrl, setWebsiteUrl] = useState('')
  const [businessType, setBusinessType] = useState<BusinessTypeId | null>(null)
  const [commerce, setCommerce] = useState<CommerceDraft>({
    provider: 'none',
    storeUrl: '',
    shopifyDomain: '',
    shopifyToken: '',
    magentoToken: '',
    feedUrl: '',
  })

  const [bot, setBot] = useState<{ id: string; publicKey: string } | null>(null)
  const [creating, setCreating] = useState(false)
  const [createError, setCreateError] = useState<string | null>(null)

  // Automation: which auto step is live + everything that didn't go perfectly.
  const [autoRunning, setAutoRunning] = useState(false)
  const [warnings, setWarnings] = useState<string[]>([])
  const [storeSkipped, setStoreSkipped] = useState(false)

  const startedRef = useRef(false)
  useEffect(() => {
    if (startedRef.current) return
    startedRef.current = true
    trackEvent('onboarding_started', { orgId })
  }, [orgId])

  const completeStep = useCallback((step: StepId, botId: string | null) => {
    trackEvent('onboarding_step_completed', { step, botId })
  }, [])

  const pushWarning = useCallback((message: string) => {
    setWarnings((w) => [...w, message])
  }, [])

  /**
   * The whole point of the wizard: after step 1 everything runs by itself.
   * Each phase is best-effort — a failure becomes a warning on the Install
   * step, never a dead end.
   */
  const runAutomation = useCallback(
    async (botId: string, url: string, store: CommerceDraft) => {
      setAutoRunning(true)

      // ── Teach: crawl the site into the knowledge base ──
      let t0 = Date.now()
      setStepIndex(1)
      try {
        const res = await fetch('/api/crawl', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ botId, url }),
        })
        if (!res.ok) {
          const data = (await res.json().catch(() => ({}))) as { error?: string }
          throw new Error(data.error ?? 'Crawl failed')
        }
      } catch (err) {
        pushWarning(
          `We couldn't finish reading your website (${errorMessage(err, 'network error')}). Add pages any time from the Knowledge tab.`,
        )
      }
      completeStep('teach', botId)
      await stayAtLeast(t0, MIN_SCENE_MS)

      // ── Store: validate the connection, save it, sync the catalog ──
      t0 = Date.now()
      setStepIndex(2)
      if (store.provider === 'none') {
        setStoreSkipped(true)
      } else {
        const provider = store.provider
        try {
          const body =
            provider === 'shopify'
              ? { provider, shopifyDomain: store.shopifyDomain.trim(), shopifyToken: store.shopifyToken.trim() }
              : provider === 'feed'
                ? { provider, feedUrl: store.feedUrl.trim() }
                : { provider, storeUrl: store.storeUrl.trim() }
          const validate = await fetch('/api/commerce/validate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
          })
          const validation = (await validate.json().catch(() => ({}))) as {
            ok?: boolean
            error?: string
            detectedProvider?: 'verskis'
          }
          if (!validation.ok) throw new Error(validation.error ?? 'Connection failed')

          const saved = await saveOnboardingCommerce(botId, {
            provider: validation.detectedProvider ?? provider,
            storeUrl: store.storeUrl,
            shopifyDomain: store.shopifyDomain,
            shopifyToken: store.shopifyToken,
            magentoToken: store.magentoToken,
            feedUrl: store.feedUrl,
          })
          if (!saved.success) throw new Error(saved.error ?? 'Could not save the store connection')

          const sync = await fetch('/api/products/sync', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ botId }),
          })
          if (!sync.ok) {
            const data = (await sync.json().catch(() => ({}))) as { error?: string }
            throw new Error(data.error ?? 'Catalog sync failed')
          }
        } catch (err) {
          pushWarning(
            `Your store isn't connected yet (${errorMessage(err, 'connection failed')}). Finish it later under Store / products.`,
          )
        }
      }
      completeStep('store', botId)
      await stayAtLeast(t0, MIN_SCENE_MS)

      // ── Look & feel: read the site's brand and theme the widget ──
      t0 = Date.now()
      setStepIndex(3)
      try {
        const res = await fetch('/api/preview/site-theme', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ url }),
        })
        const data = (await res.json().catch(() => null)) as
          | { theme?: Record<string, unknown>; logoUrl?: string | null; error?: string }
          | null
        if (!res.ok || !data?.theme) {
          throw new Error(data?.error ?? 'Could not read a theme from your site')
        }
        const saved = await saveOnboardingTheme(botId, data.theme, { logoUrl: data.logoUrl })
        if (!saved.success) throw new Error(saved.error ?? 'Could not save the theme')
      } catch (err) {
        pushWarning(
          `We kept the default look (${errorMessage(err, 'could not read your site')}). Restyle it any time under Appearance.`,
        )
      }
      completeStep('look', botId)
      await stayAtLeast(t0, MIN_SCENE_MS)

      setStepIndex(4)
      setAutoRunning(false)
    },
    [completeStep, pushWarning],
  )

  // Step 1 → automation: create the bot, then let the pipeline run.
  const handleCreate = useCallback(async () => {
    const url = normalizeWebsiteUrl(websiteUrl)
    if (!name.trim() || !url || !businessType || creating) return
    setCreating(true)
    setCreateError(null)

    const res = await startOnboardingBot({ name, websiteUrl, businessType })
    if (res.error || !res.id || !res.publicKey) {
      setCreateError(res.error ?? 'Failed to create your bot. Please try again.')
      setCreating(false)
      return
    }

    setBot({ id: res.id, publicKey: res.publicKey })
    completeStep('business', res.id)
    setCreating(false)
    void runAutomation(res.id, url, commerce)
  }, [name, websiteUrl, businessType, creating, commerce, completeStep, runAutomation])

  const handleFinish = useCallback(() => {
    if (!bot) return
    completeStep('install', bot.id)
    trackEvent('onboarding_finished', { botId: bot.id })
    // Home, not the knowledge screen — and refresh so the sidebar/layout
    // (rendered before the bot existed) picks up the new bot.
    router.push('/app')
    router.refresh()
  }, [bot, completeStep, router])

  const handleViewBot = useCallback(() => {
    if (!bot) return
    completeStep('install', bot.id)
    trackEvent('onboarding_finished', { botId: bot.id })
    router.push(`/app/bots/${bot.id}/configure`)
    router.refresh()
  }, [bot, completeStep, router])

  const step = STEPS[stepIndex]
  const siteHost = (normalizeWebsiteUrl(websiteUrl) ?? websiteUrl)
    .replace(/^https?:\/\//i, '')
    .replace(/\/.*$/, '')

  return (
    <div className="mx-auto max-w-6xl space-y-8 p-6 lg:p-8">
      {/* ── Progress steps: horizontal, informational only — the pipeline drives them ── */}
      <nav aria-label="Setup progress">
        <ol className="flex gap-3 sm:gap-4">
          {STEPS.map((s, i) => {
            const done = i < stepIndex
            const current = i === stepIndex
            const running = current && autoRunning
            return (
              <li key={s.id} className="min-w-0 flex-1" aria-current={current ? 'step' : undefined}>
                <p
                  className={cn(
                    'mb-2 flex items-center gap-1.5 truncate text-xs sm:text-sm',
                    current
                      ? 'font-semibold text-foreground'
                      : done
                        ? 'font-medium text-muted-foreground'
                        : 'font-medium text-muted-foreground/60',
                  )}
                >
                  <span className="hidden sm:inline">{i + 1}.</span>
                  <span className="truncate">{s.title}</span>
                  {running && <Loader2Icon className="size-3.5 shrink-0 animate-spin text-primary" aria-hidden="true" />}
                  {done && <CheckIcon className="size-3.5 shrink-0 text-primary" aria-hidden="true" />}
                </p>
                <div
                  className={cn(
                    'h-1 rounded-full transition-colors duration-300',
                    done || current ? 'bg-primary' : 'bg-border',
                  )}
                  aria-hidden="true"
                />
              </li>
            )
          })}
        </ol>
      </nav>

      {/* ── Active step ── */}
      <div className="min-w-0">
        {step.id === 'business' && (
          <StepBusiness
            name={name}
            setName={setName}
            websiteUrl={websiteUrl}
            setWebsiteUrl={setWebsiteUrl}
            businessType={businessType}
            setBusinessType={setBusinessType}
            commerce={commerce}
            setCommerce={setCommerce}
            creating={creating}
            error={createError}
            onContinue={() => void handleCreate()}
          />
        )}

        {step.id === 'teach' && bot && (
          <AutoStepScene
            image="/onboarding/fox-teach.webp"
            title="Teaching your bot"
            description={`Reading ${siteHost || 'your website'}'s pages — policies, delivery, contact, FAQ — and adding them to its knowledge.`}
            stepNumber={2}
            totalSteps={STEPS.length}
            status={bot ? <TeachStatus botId={bot.id} /> : undefined}
          />
        )}

        {step.id === 'store' && bot && (
          <AutoStepScene
            image="/onboarding/fox-store.webp"
            title={storeSkipped ? 'No store to connect' : 'Stocking the catalog'}
            description={
              storeSkipped
                ? 'Skipping ahead — you can connect a store any time from Store / products.'
                : 'Connecting your store and indexing products so the bot can recommend them with live prices and stock.'
            }
            stepNumber={3}
            totalSteps={STEPS.length}
            status={bot && !storeSkipped ? <StoreStatus botId={bot.id} /> : undefined}
          />
        )}

        {step.id === 'look' && bot && (
          <AutoStepScene
            image="/onboarding/fox-look.webp"
            title="Designing your widget"
            description={`Matching colors, corner shapes and your logo from ${siteHost || 'your website'} so the chat feels native to your brand.`}
            stepNumber={4}
            totalSteps={STEPS.length}
          />
        )}

        {step.id === 'install' && bot && (
          <StepInstall
            botId={bot.id}
            publicKey={bot.publicKey}
            appUrl={appUrl}
            warnings={warnings}
            onFinish={handleFinish}
            onViewBot={handleViewBot}
          />
        )}
      </div>
    </div>
  )
}
