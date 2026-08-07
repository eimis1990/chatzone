'use client'

import { useMemo, useState } from 'react'
import {
  CheckCircle2Icon,
  SaveIcon,
  Settings2Icon,
  ShieldCheckIcon,
} from 'lucide-react'
import { toast } from 'sonner'
import { saveContentStudioSettings } from '@/app/(owner)/owner/content/actions'
import { ContentStudioGuide, ContentStudioHeader } from '@/components/owner/content/ContentStudioChrome'
import { DestinationLogo } from '@/components/owner/content/DestinationLogo'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Field, FieldContent, FieldDescription, FieldGroup, FieldLabel, FieldLegend, FieldSet, FieldTitle } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Spinner } from '@/components/ui/spinner'
import { Switch } from '@/components/ui/switch'
import {
  CONTENT_TYPE_LABELS,
  mergePublicationTargets,
  PUBLICATION_PROVIDERS,
} from '@/lib/content-studio/publication'
import type {
  ContentApprovalMode,
  ContentPublicationProvider,
  ContentPublicationTarget,
  ContentPublicationType,
  ContentStudioSettings,
} from '@/lib/content-studio/types'

type AutoPublishRequest = { kind: 'default' } | { kind: 'target'; provider: ContentPublicationProvider }

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'Could not save Content Studio settings'
}

export function ContentSettingsForm({
  initialSettings,
  initialTargets,
}: {
  initialSettings: ContentStudioSettings
  initialTargets: ContentPublicationTarget[]
}) {
  const [settings, setSettings] = useState(initialSettings)
  const [targets, setTargets] = useState(initialTargets)
  const [savedSnapshot, setSavedSnapshot] = useState(() => JSON.stringify({ settings: initialSettings, targets: initialTargets }))
  const [pending, setPending] = useState(false)
  const [autoPublishRequest, setAutoPublishRequest] = useState<AutoPublishRequest | null>(null)

  const snapshot = useMemo(() => JSON.stringify({ settings, targets }), [settings, targets])
  const dirty = snapshot !== savedSnapshot

  function updateTarget(provider: ContentPublicationProvider, patch: Partial<ContentPublicationTarget>) {
    setTargets((current) => current.map((target) => target.provider === provider ? { ...target, ...patch } : target))
  }

  function requestApprovalMode(provider: ContentPublicationProvider, mode: ContentApprovalMode) {
    if (mode === 'review') {
      updateTarget(provider, { approval_mode: 'review' })
      return
    }
    setAutoPublishRequest({ kind: 'target', provider })
  }

  function requestDefaultMode(mode: ContentApprovalMode) {
    if (mode === 'review') {
      setSettings((current) => ({ ...current, default_approval_mode: 'review' }))
      return
    }
    setAutoPublishRequest({ kind: 'default' })
  }

  function confirmAutoPublish() {
    if (!autoPublishRequest) return
    if (autoPublishRequest.kind === 'default') {
      setSettings((current) => ({ ...current, default_approval_mode: 'auto_publish' }))
    } else {
      updateTarget(autoPublishRequest.provider, { approval_mode: 'auto_publish' })
    }
    setAutoPublishRequest(null)
  }

  function toggleContentType(target: ContentPublicationTarget, type: ContentPublicationType, checked: boolean) {
    const next = checked
      ? [...new Set([...target.content_types, type])]
      : target.content_types.filter((candidate) => candidate !== type)
    if (next.length === 0) {
      toast.error('Keep at least one content type selected')
      return
    }
    updateTarget(target.provider, { content_types: next })
  }

  async function save() {
    setPending(true)
    try {
      const result = await saveContentStudioSettings({
        proactive_suggestions: settings.proactive_suggestions,
        default_approval_mode: settings.default_approval_mode,
        targets: targets.map((target) => ({
          provider: target.provider,
          slot_key: target.slot_key,
          account_label: target.account_label,
          account_handle: target.account_handle,
          enabled: target.enabled,
          approval_mode: target.approval_mode,
          content_types: target.content_types,
        })),
      })
      const merged = mergePublicationTargets(settings.owner_id, result.targets, result.settings.default_approval_mode)
      setSettings(result.settings)
      setTargets(merged)
      setSavedSnapshot(JSON.stringify({ settings: result.settings, targets: merged }))
      toast.success('Content settings saved')
    } catch (error) {
      toast.error(errorMessage(error))
    } finally {
      setPending(false)
    }
  }

  return (
    <div className="mx-auto flex max-w-[90rem] flex-col gap-5">
      <ContentStudioHeader
        title="Automation & publishing"
        badge="Review by default"
        description="Choose how the Studio guides you and prepare each destination for a safe publishing handoff."
        backHref="/owner/content"
        actions={(
          <Button variant="outline" className="min-h-11" size="lg" onClick={() => void save()} disabled={pending || !dirty}>
            {pending ? <Spinner /> : <SaveIcon data-icon="inline-start" />}
            {pending ? 'Saving…' : dirty ? 'Save settings' : 'Saved'}
          </Button>
        )}
      />

      <ContentStudioGuide
        icon={Settings2Icon}
        eyebrow="Publishing policy"
        title="Review stays between creation and delivery"
        description="Configure destinations now. Nothing can leave Loqara until that destination shows Connected, and every new destination starts in review mode."
        currentStage={2}
        action={<Badge variant="secondary"><ShieldCheckIcon data-icon="inline-start" /> Human approval</Badge>}
      />

      <Card className="gap-0 py-0 lg:grid lg:grid-cols-[21rem_minmax(0,1fr)]">
        <CardHeader className="content-start border-b p-5 lg:border-b-0 lg:border-r">
          <CardTitle>Workflow defaults</CardTitle>
          <CardDescription>Set the Studio&apos;s guidance and the safe starting policy for future accounts.</CardDescription>
        </CardHeader>
        <CardContent className="p-5">
          <FieldGroup>
            <Field orientation="horizontal">
              <FieldContent>
                <FieldTitle>Proactive next-action suggestions</FieldTitle>
                <FieldDescription>Surface the highest-value item to review, continue, configure, or start.</FieldDescription>
              </FieldContent>
              <Switch
                aria-label="Proactive next-action suggestions"
                checked={settings.proactive_suggestions}
                onCheckedChange={(checked) => setSettings((current) => ({ ...current, proactive_suggestions: checked }))}
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="content-default-approval">Default for newly connected destinations</FieldLabel>
              <Select value={settings.default_approval_mode} onValueChange={(value) => value && requestDefaultMode(value as ContentApprovalMode)}>
                <SelectTrigger id="content-default-approval" className="w-full sm:max-w-md"><SelectValue /></SelectTrigger>
                <SelectContent><SelectGroup>
                  <SelectItem value="review">Wait for review & approval</SelectItem>
                  <SelectItem value="auto_publish">Auto-publish after quality gates</SelectItem>
                </SelectGroup></SelectContent>
              </Select>
              <FieldDescription>Existing destinations keep their own individual policy.</FieldDescription>
            </Field>
          </FieldGroup>
        </CardContent>
      </Card>

      <section className="flex flex-col gap-3" aria-labelledby="publishing-destinations-heading">
        <div className="grid gap-1 border-b pb-3">
          <h2 id="publishing-destinations-heading" className="text-xl font-semibold">Publishing destinations</h2>
          <p className="text-sm text-muted-foreground">Choose the content types and approval policy separately for every account. Connector setup will arrive as each integration is added.</p>
        </div>
        <div className="grid gap-4 xl:grid-cols-2">
          {targets.map((target) => {
            const definition = PUBLICATION_PROVIDERS.find((candidate) => candidate.provider === target.provider)!
            const connected = target.connector_status === 'connected'
            return (
              <Card key={`${target.provider}-${target.slot_key}`} className="min-w-0 gap-0 py-0">
                <CardHeader className="border-b p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex min-w-0 items-start gap-3">
                      <DestinationLogo provider={target.provider} />
                      <div className="grid min-w-0 gap-1">
                        <CardTitle className="text-base">{definition.name}</CardTitle>
                        <CardDescription>{definition.description}</CardDescription>
                      </div>
                    </div>
                    <Badge variant={connected ? 'default' : target.connector_status === 'error' ? 'destructive' : 'outline'}>
                      {connected ? 'Connected' : target.connector_status === 'error' ? 'Connection error' : 'Connector required'}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="p-5">
                  <FieldGroup>
                    <Field orientation="horizontal">
                      <FieldContent>
                        <FieldTitle>Use this destination</FieldTitle>
                        <FieldDescription>Include it in the distribution plan for supported content.</FieldDescription>
                      </FieldContent>
                      <Switch aria-label={`Use ${definition.name}`} checked={target.enabled} onCheckedChange={(checked) => updateTarget(target.provider, { enabled: checked })} />
                    </Field>

                    <div className="grid gap-4 sm:grid-cols-2">
                      <Field>
                        <FieldLabel htmlFor={`${target.provider}-label`}>Account name</FieldLabel>
                        <Input id={`${target.provider}-label`} value={target.account_label} onChange={(event) => updateTarget(target.provider, { account_label: event.target.value })} placeholder="Loqara" maxLength={120} />
                      </Field>
                      <Field>
                        <FieldLabel htmlFor={`${target.provider}-handle`}>Handle or page</FieldLabel>
                        <Input id={`${target.provider}-handle`} value={target.account_handle} onChange={(event) => updateTarget(target.provider, { account_handle: event.target.value })} placeholder="@loqara" maxLength={200} />
                      </Field>
                    </div>

                    <FieldSet>
                      <FieldLegend variant="label">Content types</FieldLegend>
                      <div data-slot="checkbox-group" className="flex flex-wrap gap-4">
                        {definition.supportedTypes.map((type) => (
                          <Field key={type} orientation="horizontal" className="w-auto">
                            <Checkbox id={`${target.provider}-${type}`} checked={target.content_types.includes(type)} onCheckedChange={(checked) => toggleContentType(target, type, checked)} />
                            <FieldLabel htmlFor={`${target.provider}-${type}`}>{CONTENT_TYPE_LABELS[type]}</FieldLabel>
                          </Field>
                        ))}
                      </div>
                    </FieldSet>
                  </FieldGroup>
                </CardContent>
                <CardFooter className="flex flex-col items-stretch gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="grid gap-0.5">
                    <p className="text-sm font-medium">Auto-publish</p>
                    <p className="text-xs text-muted-foreground">Otherwise this destination waits for your approval.</p>
                  </div>
                  <Switch
                    aria-label={`Auto-publish to ${definition.name}`}
                    checked={target.approval_mode === 'auto_publish'}
                    onCheckedChange={(checked) => requestApprovalMode(target.provider, checked ? 'auto_publish' : 'review')}
                  />
                </CardFooter>
              </Card>
            )
          })}
        </div>
      </section>

      <div className="sticky bottom-0 flex justify-end rounded-xl border bg-background p-3 shadow-sm">
        <Button className="min-h-11" size="lg" onClick={() => void save()} disabled={pending || !dirty}>
          {pending ? <Spinner /> : dirty ? <SaveIcon data-icon="inline-start" /> : <CheckCircle2Icon data-icon="inline-start" />}
          {pending ? 'Saving…' : dirty ? 'Save settings' : 'All settings saved'}
        </Button>
      </div>

      <Dialog open={Boolean(autoPublishRequest)} onOpenChange={(open) => !open && setAutoPublishRequest(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Enable auto-publish?</DialogTitle>
            <DialogDescription>
              When a real connector is added, content that passes the required quality gates could publish without waiting for a final click. This preference does nothing while the connector is unavailable.
            </DialogDescription>
          </DialogHeader>
          <Alert>
            <AlertTitle>You stay in control</AlertTitle>
            <AlertDescription>You can switch this destination back to review-only at any time. New destinations still default to review unless you also change the global default.</AlertDescription>
          </Alert>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAutoPublishRequest(null)}>Keep review required</Button>
            <Button onClick={confirmAutoPublish}>Enable auto-publish</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
