'use client'

import { useCallback, useState } from 'react'
import { ShoppingBagIcon, ArrowRightIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
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
import { saveOnboardingCommerce, type OnboardingCommerceInput } from '@/lib/actions/onboarding'
import type { BusinessTypeId } from '@/lib/onboarding'

type Provider = OnboardingCommerceInput['provider']

interface StepStoreProps {
  botId: string
  businessType: BusinessTypeId
  websiteUrl: string
  onDone: () => void
}

/**
 * Step 3 — optional store connection. Meaningful mainly for e-commerce: the
 * form is shown right away for stores, tucked behind "connect anyway" for
 * everyone else. A connection is only saved after a successful test.
 */
export function StepStore({ botId, businessType, websiteUrl, onDone }: StepStoreProps) {
  const isEcommerce = businessType === 'ecommerce'
  const [showForm, setShowForm] = useState(isEcommerce)

  const [provider, setProvider] = useState<Provider>('woocommerce')
  const [storeUrl, setStoreUrl] = useState(websiteUrl.trim())
  const [shopifyDomain, setShopifyDomain] = useState('')
  const [shopifyToken, setShopifyToken] = useState('')
  const [magentoToken, setMagentoToken] = useState('')
  const [feedUrl, setFeedUrl] = useState('')

  const [test, setTest] = useState<{
    status: 'idle' | 'loading' | 'ok' | 'error'
    count?: number
    message?: string
  }>({ status: 'idle' })
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)

  const testReady =
    provider === 'shopify'
      ? Boolean(shopifyDomain.trim() && shopifyToken.trim())
      : provider === 'feed'
        ? Boolean(feedUrl.trim())
        : Boolean(storeUrl.trim())

  const resetTest = () => setTest({ status: 'idle' })

  const handleTest = useCallback(async () => {
    if (!testReady) return
    setTest({ status: 'loading' })
    try {
      const body =
        provider === 'shopify'
          ? { provider, shopifyDomain: shopifyDomain.trim(), shopifyToken: shopifyToken.trim() }
          : provider === 'feed'
            ? { provider, feedUrl: feedUrl.trim() }
            : { provider, storeUrl: storeUrl.trim() }
      const res = await fetch('/api/commerce/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const data = (await res.json()) as {
        ok: boolean
        error?: string
        total?: number
        detectedProvider?: 'verskis'
      }
      if (data.ok && data.detectedProvider) setProvider(data.detectedProvider)
      setTest(
        data.ok
          ? { status: 'ok', count: data.total ?? 0 }
          : { status: 'error', message: data.error ?? 'Connection failed.' },
      )
    } catch {
      setTest({ status: 'error', message: 'Network error — please try again.' })
    }
  }, [provider, storeUrl, shopifyDomain, shopifyToken, feedUrl, testReady])

  const handleSaveAndContinue = useCallback(async () => {
    if (test.status !== 'ok' || saving) return
    setSaving(true)
    setSaveError(null)
    const res = await saveOnboardingCommerce(botId, {
      provider,
      storeUrl,
      shopifyDomain,
      shopifyToken,
      magentoToken,
      feedUrl,
    })
    setSaving(false)
    if (!res.success) {
      setSaveError(res.error ?? 'Could not save the store connection.')
      return
    }
    onDone()
  }, [test.status, saving, botId, provider, storeUrl, shopifyDomain, shopifyToken, magentoToken, feedUrl, onDone])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-lg font-semibold">Connect your store (optional)</h1>
        <p className="text-sm text-muted-foreground">
          Link your product catalog so the bot can search products live and show product cards in
          chat — with always-current prices and stock.
        </p>
      </div>

      {!showForm && (
        <div className="rounded-xl border border-dashed p-6 text-center">
          <ShoppingBagIcon className="mx-auto size-8 text-muted-foreground/60" />
          <p className="mt-3 text-sm text-muted-foreground">
            This step is for online stores. It doesn&apos;t look like you run one — feel free to
            skip.
          </p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="mt-4"
            onClick={() => setShowForm(true)}
          >
            I have a store — connect it anyway
          </Button>
        </div>
      )}

      {showForm && (
        <div className="space-y-4 rounded-xl border p-5">
          <div className="space-y-1.5">
            <Label>Platform</Label>
            <Select
              value={provider}
              onValueChange={(v) => {
                setProvider(v as Provider)
                resetTest()
              }}
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="woocommerce">WooCommerce</SelectItem>
                <SelectItem value="shopify">Shopify</SelectItem>
                <SelectItem value="magento">Magento</SelectItem>
                <SelectItem value="verskis">Verskis</SelectItem>
                <SelectItem value="feed">Product feed (XML / CSV / JSON)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {(provider === 'woocommerce' || provider === 'magento' || provider === 'verskis') && (
            <div className="space-y-1.5">
              <Label htmlFor="ob-store-url">Store URL</Label>
              <Input
                id="ob-store-url"
                value={storeUrl}
                onChange={(e) => {
                  setStoreUrl(e.target.value)
                  resetTest()
                }}
                placeholder="https://yourstore.com"
                inputMode="url"
                autoComplete="url"
              />
            </div>
          )}

          {provider === 'magento' && (
            <div className="space-y-1.5">
              <Label htmlFor="ob-magento-token">Access token (optional)</Label>
              <Input
                id="ob-magento-token"
                type="password"
                value={magentoToken}
                onChange={(e) => {
                  setMagentoToken(e.target.value)
                  resetTest()
                }}
                placeholder="Magento integration token"
                autoComplete="off"
                className="font-mono text-sm"
              />
            </div>
          )}

          {provider === 'shopify' && (
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="ob-shopify-domain">Store domain</Label>
                <Input
                  id="ob-shopify-domain"
                  value={shopifyDomain}
                  onChange={(e) => {
                    setShopifyDomain(e.target.value)
                    resetTest()
                  }}
                  placeholder="your-store.myshopify.com"
                  autoComplete="off"
                  className="font-mono text-sm"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="ob-shopify-token">Storefront access token</Label>
                <Input
                  id="ob-shopify-token"
                  type="password"
                  value={shopifyToken}
                  onChange={(e) => {
                    setShopifyToken(e.target.value)
                    resetTest()
                  }}
                  placeholder="shpat_… / public token"
                  autoComplete="off"
                  className="font-mono text-sm"
                />
              </div>
              <p className="text-xs text-muted-foreground sm:col-span-2">
                Create a Storefront API access token in Shopify admin → Settings → Apps → Develop
                apps.
              </p>
            </div>
          )}

          {provider === 'feed' && (
            <div className="space-y-1.5">
              <Label htmlFor="ob-feed-url">Product feed URL</Label>
              <Input
                id="ob-feed-url"
                value={feedUrl}
                onChange={(e) => {
                  setFeedUrl(e.target.value)
                  resetTest()
                }}
                placeholder="https://yourstore.com/feed/products.xml"
                inputMode="url"
                autoComplete="url"
                className="font-mono text-sm"
              />
              <p className="text-xs text-muted-foreground">
                A Google Shopping / RSS XML, CSV, or JSON product feed.
              </p>
            </div>
          )}

          <div className="flex flex-wrap items-center gap-3">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={test.status === 'loading' || !testReady}
              onClick={() => void handleTest()}
            >
              {test.status === 'loading' ? 'Testing…' : 'Test connection'}
            </Button>
            {test.status === 'ok' && (
              <span
                className={cn(
                  'inline-flex items-center gap-1.5 rounded-full bg-green-100 px-2.5 py-1 text-xs font-medium text-green-700',
                )}
              >
                <span className="size-1.5 rounded-full bg-green-500" />
                {test.count && test.count > 0
                  ? `Connected — ${test.count.toLocaleString()} product${test.count !== 1 ? 's' : ''}`
                  : 'Connected'}
              </span>
            )}
            {test.status === 'error' && (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-red-100 px-2.5 py-1 text-xs font-medium text-red-700">
                <span className="size-1.5 rounded-full bg-red-500" />
                {test.message}
              </span>
            )}
          </div>
        </div>
      )}

      {saveError && (
        <p role="alert" className="text-sm text-destructive">
          {saveError}
        </p>
      )}

      <div className="flex items-center justify-end gap-3">
        <Button type="button" variant="ghost" onClick={onDone}>
          Skip this step
        </Button>
        {showForm && (
          <Button
            onClick={() => void handleSaveAndContinue()}
            disabled={test.status !== 'ok' || saving}
            className="h-10 px-6"
          >
            {saving ? 'Saving…' : 'Save & continue'}
            {!saving && <ArrowRightIcon data-icon="inline-end" />}
          </Button>
        )}
      </div>
    </div>
  )
}
