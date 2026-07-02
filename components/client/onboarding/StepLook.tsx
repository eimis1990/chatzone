'use client'

import { useState } from 'react'
import { GlobeIcon, ArrowRightIcon } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { TestChat } from '@/components/client/TestChat'
import { WIDGET_THEME_PRESETS } from '@/lib/widget-theme-presets'
import type { WizardTheme } from './OnboardingWizard'

interface StepLookProps {
  botId: string
  botName: string
  websiteUrl: string
  theme: WizardTheme
  onApplyTheme: (partial: Record<string, unknown>) => void
  saving: boolean
  error: string | null
  onContinue: () => void
}

/**
 * Step 4 — look & feel. Preset swatches (same data as the configurator's
 * picker), "Match my website" using the step-1 URL, and a live preview of the
 * real widget (TestChat renders the exact ChatWindow the embed uses).
 */
export function StepLook({
  botId,
  botName,
  websiteUrl,
  theme,
  onApplyTheme,
  saving,
  error,
  onContinue,
}: StepLookProps) {
  const [matching, setMatching] = useState(false)
  const [activePreset, setActivePreset] = useState<string | null>(null)

  const runMatch = async () => {
    if (matching) return
    setMatching(true)
    try {
      const res = await fetch('/api/preview/site-theme', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ url: websiteUrl }),
      })
      const data = (await res.json().catch(() => null)) as
        | { theme?: Record<string, unknown>; error?: string }
        | null
      if (!res.ok || !data?.theme) {
        toast.error(data?.error ?? 'Could not read a theme from your site')
        return
      }
      onApplyTheme(data.theme)
      setActivePreset('match')
      toast.success('Website theme applied')
    } catch {
      toast.error('Could not read a theme from your site')
    } finally {
      setMatching(false)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-lg font-semibold">Make it yours</h1>
        <p className="text-sm text-muted-foreground">
          Pick a starting style or match your website — the preview on the right is the real
          widget. You can fine-tune every detail later in the configurator.
        </p>
      </div>

      <div className="flex flex-col gap-6 xl:flex-row">
        <div className="min-w-0 flex-1 space-y-4">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-sm font-semibold">Presets</h2>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => void runMatch()}
              disabled={matching}
              className="h-8 gap-1.5 text-xs"
            >
              <GlobeIcon className="size-3.5" />
              {matching ? 'Reading your site…' : 'Match my website'}
            </Button>
          </div>

          <div className="flex flex-wrap gap-2">
            {WIDGET_THEME_PRESETS.map((preset) => (
              <button
                key={preset.id}
                type="button"
                onClick={() => {
                  onApplyTheme(preset.theme as unknown as Record<string, unknown>)
                  setActivePreset(preset.id)
                }}
                title={preset.description}
                aria-pressed={activePreset === preset.id}
                className={`flex items-center gap-2 rounded-full border bg-background px-3 py-1.5 text-xs font-medium transition-colors hover:bg-muted ${
                  activePreset === preset.id
                    ? 'border-primary ring-1 ring-primary'
                    : 'border-input hover:border-primary/40'
                }`}
              >
                <span className="flex -space-x-1">
                  {[
                    preset.theme.primaryColor,
                    preset.theme.botBubbleColor || '#f3f4f6',
                    preset.theme.backgroundColor,
                  ].map((color, i) => (
                    <span
                      key={i}
                      className="size-3.5 rounded-full ring-1 ring-border"
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </span>
                {preset.name}
              </button>
            ))}
          </div>
          <p className="text-xs text-muted-foreground">
            Each preset restyles colors, shape, and font. &ldquo;Match my website&rdquo; reads your
            brand colors from {websiteUrl.replace(/^https?:\/\//i, '').replace(/\/.*$/, '')}.
          </p>

          {error && (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          )}

          <div className="flex justify-end pt-2">
            <Button onClick={onContinue} disabled={saving} className="h-10 px-6">
              {saving ? 'Saving…' : 'Continue'}
              {!saving && <ArrowRightIcon data-icon="inline-end" />}
            </Button>
          </div>
        </div>

        {/* Live preview — the exact widget, floating like the real embed.
            Must be taller than the chat window (680px) + its bottom offsets
            (~96px), or the window's top gets clipped by overflow-hidden. */}
        <div
          className="relative hidden min-h-[800px] w-[480px] shrink-0 overflow-hidden rounded-xl border bg-dots xl:block"
          role="complementary"
          aria-label="Live widget preview"
        >
          <div className="absolute bottom-6 right-6 z-10 pointer-events-none">
            <TestChat botId={botId} config={{ displayName: botName, theme }} activeLang="en" />
          </div>
        </div>
      </div>
    </div>
  )
}
