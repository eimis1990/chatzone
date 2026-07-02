'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { CheckIcon } from 'lucide-react'
import { cn } from '@/lib/utils'
import { trackEvent } from '@/lib/analytics'
import { normalizeWebsiteUrl, mergeVisualTheme, type BusinessTypeId } from '@/lib/onboarding'
import { startOnboardingBot, saveOnboardingTheme } from '@/lib/actions/onboarding'
import type { BotConfig } from '@/lib/types'
import { StepBusiness } from './StepBusiness'
import { StepTeach } from './StepTeach'
import { StepStore } from './StepStore'
import { StepLook } from './StepLook'
import { StepInstall } from './StepInstall'

/** Wizard-local theme choices (visual keys only; empty = widget defaults). */
export type WizardTheme = Partial<BotConfig['theme']> & Record<string, unknown>

export interface CrawlState {
  status: 'idle' | 'running' | 'done' | 'error'
  message?: string
  remaining?: number
}

const STEPS = [
  { id: 'business', title: 'Your business', blurb: 'Who the bot works for' },
  { id: 'teach', title: 'Teach it', blurb: 'Learn from your website' },
  { id: 'store', title: 'Store', blurb: 'Optional product catalog' },
  { id: 'look', title: 'Look & feel', blurb: 'Match your brand' },
  { id: 'install', title: 'Install', blurb: 'Put it on your site' },
] as const

type StepId = (typeof STEPS)[number]['id']

export function OnboardingWizard({ orgId, appUrl }: { orgId: string; appUrl: string }) {
  const router = useRouter()
  const [stepIndex, setStepIndex] = useState(0)

  // Step 1 — business facts
  const [name, setName] = useState('')
  const [websiteUrl, setWebsiteUrl] = useState('')
  const [businessType, setBusinessType] = useState<BusinessTypeId | null>(null)

  // Created bot (from step 1 → 2 transition)
  const [bot, setBot] = useState<{ id: string; publicKey: string } | null>(null)
  const [creating, setCreating] = useState(false)
  const [createError, setCreateError] = useState<string | null>(null)

  // Crawl kicked off right after creation; the Teach step shows its progress.
  const [crawlState, setCrawlState] = useState<CrawlState>({ status: 'idle' })

  // Step 4 — theme choices (only saved when the user picked something)
  const [theme, setTheme] = useState<WizardTheme>({})

  // Fire "started" once per wizard visit.
  const startedRef = useRef(false)
  useEffect(() => {
    if (startedRef.current) return
    startedRef.current = true
    trackEvent('onboarding_started', { orgId })
  }, [orgId])

  const completeStep = useCallback(
    (step: StepId, botId: string | null) => {
      trackEvent('onboarding_step_completed', { step, botId })
    },
    [],
  )

  // Kick off the site crawl (long-running; the Teach step polls sources for
  // live progress while this request ingests pages server-side).
  const startCrawl = useCallback((botId: string, url: string) => {
    setCrawlState({ status: 'running' })
    void (async () => {
      try {
        const res = await fetch('/api/crawl', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ botId, url }),
        })
        const data = (await res.json().catch(() => ({}))) as {
          remaining?: number
          error?: string
        }
        if (!res.ok) {
          setCrawlState({ status: 'error', message: data.error ?? 'Crawl failed.' })
        } else {
          setCrawlState({ status: 'done', remaining: data.remaining ?? 0 })
        }
      } catch {
        setCrawlState({ status: 'error', message: 'Network error while crawling your site.' })
      }
    })()
  }, [])

  // Step 1 → 2: create the bot (+ template prompt), then start crawling.
  const handleBusinessContinue = useCallback(async () => {
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
    startCrawl(res.id, url)
    completeStep('business', res.id)
    setStepIndex(1)
    setCreating(false)
  }, [name, websiteUrl, businessType, creating, startCrawl, completeStep])

  const goNextFrom = useCallback(
    (step: StepId) => {
      completeStep(step, bot?.id ?? null)
      setStepIndex((i) => Math.min(i + 1, STEPS.length - 1))
    },
    [bot, completeStep],
  )

  // Step 4 → 5: persist theme choices (skip the write when nothing changed).
  const [savingTheme, setSavingTheme] = useState(false)
  const [themeError, setThemeError] = useState<string | null>(null)
  const handleLookContinue = useCallback(async () => {
    if (!bot || savingTheme) return
    setThemeError(null)
    if (Object.keys(theme).length > 0) {
      setSavingTheme(true)
      const res = await saveOnboardingTheme(bot.id, theme)
      setSavingTheme(false)
      if (!res.success) {
        setThemeError(res.error ?? 'Could not save the theme. Please try again.')
        return
      }
    }
    goNextFrom('look')
  }, [bot, theme, savingTheme, goNextFrom])

  const handleFinish = useCallback(() => {
    if (!bot) return
    completeStep('install', bot.id)
    trackEvent('onboarding_finished', { botId: bot.id })
    router.push(`/app/bots/${bot.id}/knowledge`)
  }, [bot, completeStep, router])

  const applyThemePartial = useCallback((partial: Record<string, unknown>) => {
    setTheme((prev) => mergeVisualTheme(prev, partial))
  }, [])

  const step = STEPS[stepIndex]

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-8 p-6 lg:flex-row lg:gap-10 lg:p-8">
      {/* ── Progress rail ── */}
      <nav aria-label="Setup progress" className="lg:w-56 lg:shrink-0">
        <ol className="flex gap-2 overflow-x-auto lg:flex-col lg:gap-0">
          {STEPS.map((s, i) => {
            const done = i < stepIndex
            const current = i === stepIndex
            return (
              <li key={s.id} className="flex shrink-0 items-start gap-3 lg:pb-6 lg:last:pb-0">
                <div className="flex flex-col items-center self-stretch">
                  <span
                    className={cn(
                      'flex size-7 shrink-0 items-center justify-center rounded-full border text-xs font-semibold transition-colors',
                      done && 'border-primary bg-primary text-primary-foreground',
                      current && 'border-primary text-primary',
                      !done && !current && 'border-border text-muted-foreground',
                    )}
                  >
                    {done ? <CheckIcon className="size-3.5" /> : i + 1}
                  </span>
                  {/* connector (desktop only) */}
                  {i < STEPS.length - 1 && (
                    <span
                      className={cn(
                        'mt-1 hidden w-px flex-1 lg:block',
                        done ? 'bg-primary' : 'bg-border',
                      )}
                      aria-hidden="true"
                    />
                  )}
                </div>
                <div className="hidden pt-1 sm:block">
                  <p
                    className={cn(
                      'text-sm font-medium leading-tight',
                      current ? 'text-foreground' : 'text-muted-foreground',
                    )}
                  >
                    {s.title}
                  </p>
                  <p className="mt-0.5 hidden text-xs text-muted-foreground/70 lg:block">
                    {s.blurb}
                  </p>
                </div>
              </li>
            )
          })}
        </ol>
      </nav>

      {/* ── Active step ── */}
      <div className="min-w-0 flex-1">
        {step.id === 'business' && (
          <StepBusiness
            name={name}
            setName={setName}
            websiteUrl={websiteUrl}
            setWebsiteUrl={setWebsiteUrl}
            businessType={businessType}
            setBusinessType={setBusinessType}
            creating={creating}
            error={createError}
            onContinue={() => void handleBusinessContinue()}
          />
        )}

        {step.id === 'teach' && bot && (
          <StepTeach
            botId={bot.id}
            crawlState={crawlState}
            onRetryCrawl={() => {
              const url = normalizeWebsiteUrl(websiteUrl)
              if (url) startCrawl(bot.id, url)
            }}
            onContinue={() => goNextFrom('teach')}
          />
        )}

        {step.id === 'store' && bot && (
          <StepStore
            botId={bot.id}
            businessType={businessType ?? 'general'}
            websiteUrl={websiteUrl}
            onDone={() => goNextFrom('store')}
          />
        )}

        {step.id === 'look' && bot && (
          <StepLook
            botId={bot.id}
            botName={name}
            websiteUrl={websiteUrl}
            theme={theme}
            onApplyTheme={applyThemePartial}
            saving={savingTheme}
            error={themeError}
            onContinue={() => void handleLookContinue()}
          />
        )}

        {step.id === 'install' && bot && (
          <StepInstall
            botId={bot.id}
            publicKey={bot.publicKey}
            appUrl={appUrl}
            onFinish={handleFinish}
          />
        )}
      </div>
    </div>
  )
}
