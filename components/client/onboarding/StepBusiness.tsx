'use client'

import { ShoppingBagIcon, WrenchIcon, HeartPulseIcon, BriefcaseIcon, SparklesIcon, BookOpenIcon, PaletteIcon, Code2Icon } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { AntiMetalButton } from '@/components/ui/anti-metal-button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { cn } from '@/lib/utils'
import { BUSINESS_TYPES, normalizeWebsiteUrl, type BusinessTypeId } from '@/lib/onboarding'
import type { CommerceDraft } from './OnboardingWizard'

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
  commerce: CommerceDraft
  setCommerce: (updater: (current: CommerceDraft) => CommerceDraft) => void
  creating: boolean
  error: string | null
  onContinue: () => void
}

/**
 * Step 1 — the only manual step. Everything the automation needs is collected
 * here; the button hands off to the pipeline instead of a next screen.
 */
export function StepBusiness({
  name,
  setName,
  websiteUrl,
  setWebsiteUrl,
  businessType,
  setBusinessType,
  commerce,
  setCommerce,
  creating,
  error,
  onContinue,
}: StepBusinessProps) {
  const urlOk = normalizeWebsiteUrl(websiteUrl) !== null
  const isEcommerce = businessType === 'ecommerce'

  // Store details are complete when the chosen platform has what it needs.
  const storeReady =
    !isEcommerce ||
    commerce.provider === 'none' ||
    (commerce.provider === 'shopify'
      ? Boolean(commerce.shopifyDomain.trim() && commerce.shopifyToken.trim())
      : commerce.provider === 'feed'
        ? Boolean(commerce.feedUrl.trim())
        : Boolean(commerce.storeUrl.trim()))

  const canContinue = Boolean(name.trim() && urlOk && businessType && storeReady) && !creating

  const pickBusinessType = (id: BusinessTypeId) => {
    setBusinessType(id)
    // Stores get the common case pre-filled: WooCommerce on their own site.
    if (id === 'ecommerce') {
      setCommerce((current) => ({
        ...current,
        provider: current.provider === 'none' ? 'woocommerce' : current.provider,
        storeUrl: current.storeUrl || websiteUrl.trim(),
      }))
    }
  }

  return (
    <div className="grid items-start gap-8 xl:grid-cols-[minmax(0,1fr)_21rem]">
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-balance">
            Tell us about your business
          </h1>
          <p className="mt-2 max-w-xl text-sm text-muted-foreground md:text-base">
            This is the only step with questions — everything after it happens by itself.
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
            className="bg-white"
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
            className="bg-white"
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
                onClick={() => pickBusinessType(t.id)}
                disabled={creating}
                aria-pressed={selected}
                className={cn(
                  'flex items-start gap-3 rounded-xl border p-4 text-left transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                  selected
                    ? 'border-primary bg-primary/5'
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

      {isEcommerce && (
        <div className="space-y-4 rounded-xl border bg-card p-5">
          <div>
            <Label>Store platform</Label>
            <p className="mt-0.5 text-xs text-muted-foreground">
              We&apos;ll connect it and index your catalog automatically, so the bot can recommend
              products with live prices and stock.
            </p>
          </div>
          <Select
            value={commerce.provider}
            onValueChange={(v) => setCommerce((c) => ({ ...c, provider: v as CommerceDraft['provider'] }))}
            disabled={creating}
          >
            <SelectTrigger className="w-full sm:max-w-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="woocommerce">WooCommerce</SelectItem>
              <SelectItem value="shopify">Shopify</SelectItem>
              <SelectItem value="magento">Magento</SelectItem>
              <SelectItem value="verskis">Verskis</SelectItem>
              <SelectItem value="feed">Product feed (XML / CSV / JSON)</SelectItem>
              <SelectItem value="none">Other / connect later</SelectItem>
            </SelectContent>
          </Select>

          {(commerce.provider === 'woocommerce' ||
            commerce.provider === 'magento' ||
            commerce.provider === 'verskis') && (
            <div className="space-y-1.5">
              <Label htmlFor="ob-store-url">Store URL</Label>
              <Input
                id="ob-store-url"
                value={commerce.storeUrl}
                onChange={(e) => setCommerce((c) => ({ ...c, storeUrl: e.target.value }))}
                placeholder="https://yourstore.com"
                inputMode="url"
                autoComplete="url"
                disabled={creating}
              />
            </div>
          )}

          {commerce.provider === 'magento' && (
            <div className="space-y-1.5">
              <Label htmlFor="ob-magento-token">Access token (optional)</Label>
              <Input
                id="ob-magento-token"
                type="password"
                value={commerce.magentoToken}
                onChange={(e) => setCommerce((c) => ({ ...c, magentoToken: e.target.value }))}
                placeholder="Magento integration token"
                autoComplete="off"
                className="font-mono text-sm"
                disabled={creating}
              />
            </div>
          )}

          {commerce.provider === 'shopify' && (
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="ob-shopify-domain">Store domain</Label>
                <Input
                  id="ob-shopify-domain"
                  value={commerce.shopifyDomain}
                  onChange={(e) => setCommerce((c) => ({ ...c, shopifyDomain: e.target.value }))}
                  placeholder="your-store.myshopify.com"
                  autoComplete="off"
                  className="font-mono text-sm"
                  disabled={creating}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="ob-shopify-token">Storefront access token</Label>
                <Input
                  id="ob-shopify-token"
                  type="password"
                  value={commerce.shopifyToken}
                  onChange={(e) => setCommerce((c) => ({ ...c, shopifyToken: e.target.value }))}
                  placeholder="shpat_… / public token"
                  autoComplete="off"
                  className="font-mono text-sm"
                  disabled={creating}
                />
              </div>
              <p className="text-xs text-muted-foreground sm:col-span-2">
                Create a Storefront API access token in Shopify admin → Settings → Apps → Develop
                apps.
              </p>
            </div>
          )}

          {commerce.provider === 'feed' && (
            <div className="space-y-1.5">
              <Label htmlFor="ob-feed-url">Product feed URL</Label>
              <Input
                id="ob-feed-url"
                value={commerce.feedUrl}
                onChange={(e) => setCommerce((c) => ({ ...c, feedUrl: e.target.value }))}
                placeholder="https://yourstore.com/feed/products.xml"
                inputMode="url"
                autoComplete="url"
                className="font-mono text-sm"
                disabled={creating}
              />
              <p className="text-xs text-muted-foreground">
                A Google Shopping / RSS XML, CSV, or JSON product feed.
              </p>
            </div>
          )}
        </div>
      )}

        {error && (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        )}
      </div>

      {/* Right column: the mascot panel with the primary action right under it. */}
      <div className="flex flex-col gap-4 xl:sticky xl:top-6">
        <aside className="hidden overflow-hidden rounded-3xl border bg-card xl:block">
          {/* The illustration's own white canvas fills the card top edge-to-edge. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/onboarding-fox-doodle.webp"
            alt=""
            aria-hidden="true"
            className="pointer-events-none w-full select-none"
          />
          <div className="space-y-3 px-7 pb-7">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground/70">
              Happens automatically
            </p>
            <ul className="space-y-3 text-sm">
              {[
                { icon: BookOpenIcon, text: 'Reads your website and learns your policies' },
                { icon: ShoppingBagIcon, text: 'Indexes your catalog for live recommendations' },
                { icon: PaletteIcon, text: 'Styles the widget to match your brand' },
                { icon: Code2Icon, text: 'Hands you a one-line install snippet' },
              ].map(({ icon: Icon, text }) => (
                <li key={text} className="flex items-start gap-2.5">
                  <span className="grid size-7 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
                    <Icon className="size-3.5" aria-hidden="true" />
                  </span>
                  <span className="pt-1 text-muted-foreground">{text}</span>
                </li>
              ))}
            </ul>
          </div>
        </aside>
        <AntiMetalButton
          onClick={onContinue}
          disabled={!canContinue}
          label={creating ? 'Creating…' : 'Create my bot'}
          className="w-full"
        />
      </div>
    </div>
  )
}
