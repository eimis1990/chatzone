'use client'

import { ShoppingBagIcon, WrenchIcon, HeartPulseIcon, BriefcaseIcon, SparklesIcon, ArrowRightIcon } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'
import { BUSINESS_TYPES, normalizeWebsiteUrl, type BusinessTypeId } from '@/lib/onboarding'

const TYPE_ICONS: Record<BusinessTypeId, LucideIcon> = {
  ecommerce: ShoppingBagIcon,
  service: WrenchIcon,
  clinic: HeartPulseIcon,
  b2b: BriefcaseIcon,
  general: SparklesIcon,
}

interface StepBusinessProps {
  name: string
  setName: (v: string) => void
  websiteUrl: string
  setWebsiteUrl: (v: string) => void
  businessType: BusinessTypeId | null
  setBusinessType: (v: BusinessTypeId) => void
  creating: boolean
  error: string | null
  onContinue: () => void
}

export function StepBusiness({
  name,
  setName,
  websiteUrl,
  setWebsiteUrl,
  businessType,
  setBusinessType,
  creating,
  error,
  onContinue,
}: StepBusinessProps) {
  const urlOk = normalizeWebsiteUrl(websiteUrl) !== null
  const canContinue = Boolean(name.trim() && urlOk && businessType) && !creating

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-lg font-semibold">Tell us about your business</h1>
        <p className="text-sm text-muted-foreground">
          We&apos;ll create your bot, teach it from your website, and get it live — in about five
          minutes.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="ob-name">Business or bot name</Label>
          <Input
            id="ob-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Acme Store"
            maxLength={60}
            autoFocus
            disabled={creating}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="ob-url">Website</Label>
          <Input
            id="ob-url"
            value={websiteUrl}
            onChange={(e) => setWebsiteUrl(e.target.value)}
            placeholder="https://acme.com"
            inputMode="url"
            autoComplete="url"
            disabled={creating}
            aria-invalid={websiteUrl.trim() !== '' && !urlOk ? true : undefined}
          />
          {websiteUrl.trim() !== '' && !urlOk && (
            <p className="text-xs text-destructive">Enter a valid website address.</p>
          )}
        </div>
      </div>

      <div className="space-y-2">
        <Label>What kind of business is it?</Label>
        <div className="grid gap-3 sm:grid-cols-2">
          {BUSINESS_TYPES.map((t) => {
            const Icon = TYPE_ICONS[t.id]
            const selected = businessType === t.id
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => setBusinessType(t.id)}
                disabled={creating}
                aria-pressed={selected}
                className={cn(
                  'flex items-start gap-3 rounded-xl border p-4 text-left transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                  selected
                    ? 'border-primary bg-primary/5 ring-1 ring-primary'
                    : 'border-border bg-card hover:border-primary/40 hover:bg-muted/40',
                )}
              >
                <span
                  className={cn(
                    'flex size-9 shrink-0 items-center justify-center rounded-lg',
                    selected ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground',
                  )}
                >
                  <Icon className="size-4.5" />
                </span>
                <span>
                  <span className="block text-sm font-medium">{t.label}</span>
                  <span className="mt-0.5 block text-xs text-muted-foreground">{t.description}</span>
                </span>
              </button>
            )
          })}
        </div>
        <p className="text-xs text-muted-foreground">
          This picks a proven starting prompt for your bot — you can change everything later.
        </p>
      </div>

      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}

      <div className="flex justify-end">
        <Button onClick={onContinue} disabled={!canContinue} className="h-10 px-6">
          {creating ? 'Creating your bot…' : 'Continue'}
          {!creating && <ArrowRightIcon data-icon="inline-end" />}
        </Button>
      </div>
    </div>
  )
}
