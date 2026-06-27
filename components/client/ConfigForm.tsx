'use client'

import { useState, useCallback, useEffect, useMemo, useRef, type ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import {
  useForm,
  useFieldArray,
  Controller,
  type Control,
  type UseFormWatch,
  type FieldErrors,
} from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
import {
  PlusIcon,
  TrashIcon,
  MonitorIcon,
  LanguagesIcon,
  PaletteIcon,
  SparklesIcon,
  UserPlusIcon,
  ShieldIcon,
  ShoppingBagIcon,
  SaveIcon,
  Maximize2Icon,
  type LucideIcon,
} from 'lucide-react'
import { botConfigFormSchema } from '@/lib/validation/schemas'
import type { BotLanguage } from '@/lib/types'
import type { z } from 'zod'
import { saveConfig } from '@/app/(client)/app/bots/[botId]/configure/actions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { Scrubber } from '@/components/ui/scrubber'
import { trackEvent } from '@/lib/analytics'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { TestChat } from '@/components/client/TestChat'
import { ResizablePanel } from '@/components/ui/resizable-panel'
import { VoiceSection } from '@/components/client/VoiceSection'
import { LogoUpload } from '@/components/client/LogoUpload'
import type { BotConfig } from '@/lib/types'
import { FONT_OPTIONS, fontStack } from '@/lib/fonts'
import { cn } from '@/lib/utils'

interface ConfigFormProps {
  botId: string
  /** Internal bot name (sidebar label) — editable, distinct from displayName. */
  botName: string
  initialConfig: BotConfig
  /** Plan gating — disable controls the org's plan doesn't include. */
  canUseAllLanguages?: boolean
  canUseLeadCapture?: boolean
  /** Voice add-on gating — disable voice unless the add-on is active. */
  canUseVoice?: boolean
}

// Use botConfigFormSchema (plain, no preprocessing) for the RHF resolver.
// FormValues = what RHF stores (Zod input type, with optionals).
type FormValues = z.input<typeof botConfigFormSchema>

// Only consider per-language content for languages that are actually enabled —
// mirrors the server's superRefine. Without this, a half-materialized content.lt
// (e.g. greeting === undefined, which RHF creates when the Lithuanian
// suggested-questions field array mounts) fails languageContentSchema and
// silently blocks Save on an English-only bot. Operates on a copy.
function withEnabledLanguagesOnly(values: FormValues): FormValues {
  const langs = values.languages ?? ['en']
  if (!values.content) return values
  const content = { ...values.content }
  if (!langs.includes('lt')) delete content.lt
  return { ...values, content }
}

const baseConfigResolver = zodResolver(botConfigFormSchema)

// Commerce validation result state
type CommerceTestState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'ok'; count: number }
  | { status: 'error'; message: string }

const MAX_SUGGESTED_QUESTIONS = 6

const LANG_LABELS: Record<BotLanguage, string> = {
  en: 'English',
  lt: 'Lithuanian',
}

/** Consistent section header: an accent icon chip beside the title + description. */
export function SectionHeader({
  icon: Icon,
  title,
  description,
}: {
  icon: LucideIcon
  title: string
  description?: string
}) {
  return (
    <div className="relative z-10 flex items-center gap-2.5">
      <span className="flex size-7 shrink-0 items-center justify-center rounded-md bg-primary text-primary-foreground">
        <Icon className="size-4" aria-hidden="true" />
      </span>
      <div>
        <CardTitle className="text-sm font-semibold leading-tight">{title}</CardTitle>
        {description && (
          <CardDescription className="text-xs leading-tight">{description}</CardDescription>
        )}
      </div>
    </div>
  )
}

// Friendly names for surfacing validation errors (a save that fails client-side
// validation must never be silent — see onInvalid below).
const FIELD_LABELS: Record<string, string> = {
  displayName: 'Bot display name',
  tagline: 'Tagline',
  avatarUrl: 'Company logo',
  botAvatarUrl: 'Bot avatar',
  privacyUrl: 'Privacy policy URL',
  systemPrompt: 'System prompt',
  greeting: 'Greeting',
  fallbackMessage: 'Fallback message',
  suggestedQuestions: 'Quick actions',
  storeUrl: 'Store URL',
  launcherLabel: 'Launcher label',
}

export function ConfigForm({
  botId,
  botName,
  initialConfig,
  canUseAllLanguages = true,
  canUseLeadCapture = true,
  canUseVoice = true,
}: ConfigFormProps) {
  const router = useRouter()
  // Internal bot name — lives outside the config schema, saved alongside it.
  const [name, setName] = useState(botName)
  // Quick-action add/edit dialog.
  const [qaOpen, setQaOpen] = useState(false)
  const [qaIndex, setQaIndex] = useState<number | null>(null)
  const [qaMode, setQaMode] = useState<'text' | 'url'>('text')
  const [qaDraft, setQaDraft] = useState({ label: '', prompt: '', url: '' })
  // System-prompt expand dialog.
  const [promptOpen, setPromptOpen] = useState(false)
  // Active language tab — drives which content.<lang> fields are shown + live preview.
  // Persisted to localStorage keyed by botId so it survives refresh.
  const lsKey = `cbz_cfg_lang_${botId}`

  // Start from the bot's default language on both server and first client render
  // (reading localStorage here would cause a hydration mismatch). The saved
  // language is applied in a mount effect below.
  const [activeLang, setActiveLang] = useState<BotLanguage>(
    (initialConfig.languages?.[0] as BotLanguage) ?? 'en',
  )

  // After mount: restore the persisted language if it's still enabled.
  useEffect(() => {
    const enabled = (initialConfig.languages ?? ['en']) as BotLanguage[]
    try {
      const stored = localStorage.getItem(lsKey) as BotLanguage | null
      if (stored && enabled.includes(stored)) setActiveLang(stored)
    } catch {
      // localStorage unavailable
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Normalize suggested questions to the {label, prompt} object form so the
  // field array can edit label + prompt (legacy configs store plain strings).
  const initialFormValues = useMemo(() => {
    const cfg = structuredClone(initialConfig) as unknown as Record<string, unknown>
    const content = cfg.content as Record<string, { suggestedQuestions?: unknown[] }> | undefined
    for (const lang of ['en', 'lt'] as const) {
      const arr = content?.[lang]?.suggestedQuestions
      if (Array.isArray(arr)) {
        content![lang].suggestedQuestions = arr.map((q) =>
          typeof q === 'string'
            ? { label: q, prompt: '', url: '' }
            : {
                label: (q as { label?: string }).label ?? '',
                prompt: (q as { prompt?: string }).prompt ?? '',
                url: (q as { url?: string }).url ?? '',
              },
        )
      }
    }
    return cfg as FormValues
  }, [initialConfig])

  const form = useForm<FormValues>({
    resolver: (values, context, options) =>
      baseConfigResolver(withEnabledLanguagesOnly(values), context, options),
    defaultValues: initialFormValues,
    mode: 'onChange',
  })

  const {
    register,
    control,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = form

  // Watch languages to control LT enable toggle
  const watchedLanguages = watch('languages') ?? ['en']
  const ltEnabled = watchedLanguages.includes('lt')

  // Select a language tab AND persist it. Persisting only on explicit selection
  // (never in a mount effect) avoids a remount race that clobbered the saved value.
  const selectLang = useCallback(
    (lang: BotLanguage) => {
      setActiveLang(lang)
      try {
        localStorage.setItem(lsKey, lang)
      } catch {
        // ignore
      }
    },
    [lsKey],
  )

  // If Lithuanian gets disabled while it's active, fall back to 'en'
  useEffect(() => {
    if (!ltEnabled && activeLang === 'lt') {
      selectLang('en')
    }
  }, [ltEnabled, activeLang, selectLang])

  // Keep defaultLanguage a concrete, committed value. The select only *displays*
  // a fallback when it's unset, so without this it would persist as undefined and
  // the live widget would silently open in English regardless of enabled languages.
  const watchedDefaultLanguage = watch('defaultLanguage')
  useEffect(() => {
    if (!watchedDefaultLanguage || !watchedLanguages.includes(watchedDefaultLanguage)) {
      setValue('defaultLanguage', watchedLanguages[0] ?? 'en', { shouldDirty: false })
    }
  }, [watchedDefaultLanguage, watchedLanguages, setValue])

  // Watch all values for the live preview
  const watchedValues = watch()

  // Suggested questions for the active language
  const suggestedQuestionsFieldEn = useFieldArray({
    control,
    name: 'content.en.suggestedQuestions',
  })
  const suggestedQuestionsFieldLt = useFieldArray({
    control,
    name: 'content.lt.suggestedQuestions',
  })

  const activeSuggestedField =
    activeLang === 'lt' ? suggestedQuestionsFieldLt : suggestedQuestionsFieldEn
  const suggestedCount = activeSuggestedField.fields.length

  // Open the quick-action dialog to add (index null) or edit an existing one.
  const openQuickAction = (index: number | null) => {
    if (index === null) {
      setQaDraft({ label: '', prompt: '', url: '' })
      setQaMode('text')
    } else {
      const f = activeSuggestedField.fields[index] as { label?: string; prompt?: string; url?: string }
      setQaDraft({ label: f.label ?? '', prompt: f.prompt ?? '', url: f.url ?? '' })
      setQaMode(f.url ? 'url' : 'text')
    }
    setQaIndex(index)
    setQaOpen(true)
  }

  const saveQuickAction = () => {
    const label = qaDraft.label.trim()
    if (!label) return
    // Either text-to-send OR url-to-open — never both.
    const value = {
      label,
      prompt: qaMode === 'text' ? qaDraft.prompt.trim() : '',
      url: qaMode === 'url' ? qaDraft.url.trim() : '',
    }
    if (qaIndex === null) activeSuggestedField.append(value)
    else activeSuggestedField.update(qaIndex, value)
    setQaOpen(false)
  }

  // Dynamic list for lead capture fields
  const leadFieldsArray = useFieldArray({
    control,
    name: 'leadCapture.fields',
  })

  // Dynamic list for allowed domains
  const allowedDomainsField = useFieldArray({
    control,
    // @ts-expect-error — useFieldArray expects object items; we store strings
    name: 'allowedDomains',
  })

  // Toggle Lithuanian
  const handleLtToggle = useCallback(
    (enabled: boolean) => {
      if (enabled) {
        // Add 'lt' to languages
        const current = watch('languages') ?? ['en']
        if (!current.includes('lt')) {
          setValue('languages', [...current, 'lt'], { shouldDirty: true })
        }
        // Ensure lt content is fully present — seed any missing fields while
        // keeping existing ones (a field array may have created a partial object
        // with no greeting/fallback, which would fail validation).
        const ltContent = watch('content.lt')
        setValue(
          'content.lt',
          {
            greeting: ltContent?.greeting ?? '',
            suggestedQuestions: ltContent?.suggestedQuestions ?? [],
            fallbackMessage: ltContent?.fallbackMessage ?? '',
          },
          { shouldDirty: true },
        )
        selectLang('lt')
      } else {
        // Remove 'lt' from languages
        const current = watch('languages') ?? ['en']
        setValue(
          'languages',
          current.filter((l) => l !== 'lt'),
          { shouldDirty: true },
        )
        selectLang('en')
      }
    },
    [watch, setValue, selectLang],
  )

  const onSubmit = useCallback(
    async (values: FormValues) => {
      try {
        const result = await saveConfig(botId, withEnabledLanguagesOnly(values), name.trim())
        if (result.success) {
          toast.success('Configuration saved')
          trackEvent('bot_config_saved', { botId })
          // Refresh so the sidebar reflects a renamed bot.
          router.refresh()
        } else {
          toast.error(result.error ?? 'Failed to save configuration')
        }
      } catch (err) {
        // A thrown server action would otherwise fail silently.
        toast.error(err instanceof Error ? err.message : 'Failed to save configuration')
      }
    },
    [botId, name, router],
  )

  // Called when the form fails client-side validation. Without this, react-hook-form
  // silently does nothing on Save — the user sees no feedback and the change never
  // persists. Surface exactly which fields are blocking the save.
  const onInvalid = useCallback((formErrors: FieldErrors<FormValues>) => {
    const problems: string[] = []
    const walk = (node: unknown, lastKey: string) => {
      if (!node || typeof node !== 'object') return
      const rec = node as Record<string, unknown>
      if (typeof rec.message === 'string') {
        const label = FIELD_LABELS[lastKey] ?? lastKey
        problems.push(`${label} — ${String(rec.message).toLowerCase()}`)
        return
      }
      for (const [key, value] of Object.entries(rec)) {
        if (key === 'ref' || key === 'type' || key === 'types' || key === 'root') continue
        walk(value, key)
      }
    }
    walk(formErrors, '')
    const unique = [...new Set(problems)].slice(0, 4)
    toast.error(
      unique.length
        ? `Can't save yet — ${unique.join('; ')}`
        : "Can't save — please check the highlighted fields.",
    )
  }, [])

  const leadCaptureEnabled = watch('leadCapture.enabled')

  // Build a live config for the preview — typed to match TestChat's LiveConfig.
  // Mirror the add-on gate so the preview matches the live widget: hide the
  // call button when the Voice add-on isn't active (TTS/STT are unaffected).
  const previewTheme = canUseVoice
    ? watchedValues.theme
    : { ...watchedValues.theme, showCallButton: false }
  const liveConfig = {
    displayName: watchedValues.displayName,
    tagline: watchedValues.tagline,
    theme: previewTheme,
    voice: watchedValues.voice,
    model: watchedValues.model,
    temperature: watchedValues.temperature,
    systemPrompt: watchedValues.systemPrompt,
    persona: watchedValues.persona,
    leadCapture: watchedValues.leadCapture,
    allowedDomains: watchedValues.allowedDomains,
    avatarUrl: watchedValues.avatarUrl,
    botAvatarUrl: watchedValues.botAvatarUrl,
    privacyUrl: watchedValues.privacyUrl,
    languages: watchedValues.languages,
    defaultLanguage: watchedValues.defaultLanguage,
    content: watchedValues.content,
    commerce: watchedValues.commerce,
  }

  return (
    <div className="flex h-full min-h-0 overflow-hidden">
      {/* ── Config panel — fixed ~half width, scrolls internally ── */}
      <ResizablePanel defaultFraction={0.5} defaultWidth={480} min={380} max={1100} resizable={false}>
        <form onSubmit={handleSubmit(onSubmit, onInvalid)} className="pb-10">

        {/* Sticky toolbar — title + always-visible Save (fixed height so the
            section headers below can pin exactly beneath it). */}
        <div className="sticky top-0 z-20 flex h-16 items-center justify-between gap-3 border-b bg-card/95 px-5 backdrop-blur">
          <div>
            <h2 className="text-base font-semibold leading-tight">Configuration</h2>
            <p className="text-xs text-muted-foreground">Changes go live when you save.</p>
          </div>
          <Button type="submit" disabled={isSubmitting} className="h-10 rounded-md px-7">
            <SaveIcon className="size-4" />
            {isSubmitting ? 'Saving…' : 'Save'}
          </Button>
        </div>

        {/* ── Display ── */}
        <Card className="overflow-visible rounded-none border-b pt-0 shadow-none ring-0">
          <CardHeader className="header-grid relative sticky top-16 z-[5] overflow-hidden rounded-none border-b bg-muted/70 py-3 backdrop-blur">
            <SectionHeader
              icon={MonitorIcon}
              title="Display"
              description="Bot name and avatar shown to visitors."
            />
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="botName">Bot name</Label>
              <Input
                id="botName"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="My Assistant"
                maxLength={60}
              />
              <p className="text-xs text-muted-foreground">
                Internal name shown in your dashboard sidebar. Visitors see the display name below.
              </p>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="displayName">Bot display name</Label>
              <Input
                id="displayName"
                {...register('displayName')}
                placeholder="Acme Support Assistant"
              />
              {errors.displayName && (
                <p className="text-xs text-destructive">{errors.displayName.message}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="tagline">Tagline (optional)</Label>
              <Input
                id="tagline"
                {...register('tagline')}
                placeholder="Virtual assistant"
              />
              <p className="text-xs text-muted-foreground">
                Short subtitle under the name on the welcome screen.
              </p>
            </div>

            <LogoUpload
              botId={botId}
              control={control}
              setValue={setValue}
              name="avatarUrl"
              label="Company logo"
              filePrefix="logo"
              description="Shown in the chat header."
            />
            <LogoUpload
              botId={botId}
              control={control}
              setValue={setValue}
              name="botAvatarUrl"
              label="Bot avatar (optional)"
              filePrefix="bot"
              description="Shown next to the bot's replies. If empty, the company logo is used."
            />

            <div className="space-y-1.5">
              <Label htmlFor="privacyUrl">Privacy policy URL (optional)</Label>
              <Input
                id="privacyUrl"
                {...register('privacyUrl')}
                placeholder="https://yourstore.com/privacy"
              />
              <p className="text-xs text-muted-foreground">
                When set, the widget shows a short consent line linking to it.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* ── Language & Content ── */}
        <Card className="overflow-visible rounded-none border-b pt-0 shadow-none ring-0">
          <CardHeader className="header-grid relative sticky top-16 z-[5] overflow-hidden rounded-none border-b bg-muted/70 py-3 backdrop-blur">
            <SectionHeader
              icon={LanguagesIcon}
              title="Language & content"
              description="Greeting, suggested questions, and fallback message — per language."
            />
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Language segmented control */}
            <div className="space-y-3">
              <div className="flex items-center gap-3 rounded-lg bg-muted p-1 w-fit">
                {(['en', 'lt'] as BotLanguage[]).map((lang) => {
                  const isAvailable = lang === 'en' || ltEnabled
                  if (!isAvailable && lang !== 'lt') return null
                  return (
                    <button
                      key={lang}
                      type="button"
                      onClick={() => {
                        if (lang === 'lt' && !ltEnabled) return
                        selectLang(lang)
                      }}
                      disabled={lang === 'lt' && !ltEnabled}
                      className={cn(
                        'px-4 py-1 text-sm font-medium rounded-md transition-all',
                        activeLang === lang
                          ? 'bg-background text-foreground shadow-sm'
                          : 'text-muted-foreground hover:text-foreground',
                        lang === 'lt' && !ltEnabled && 'opacity-40 cursor-not-allowed',
                      )}
                      aria-pressed={activeLang === lang}
                    >
                      {LANG_LABELS[lang]}
                    </button>
                  )
                })}
              </div>

              {/* LT enable toggle */}
              <div className="flex items-center gap-2.5">
                <Switch
                  checked={ltEnabled}
                  onCheckedChange={handleLtToggle}
                  id="ltEnabled"
                  size="sm"
                  disabled={!canUseAllLanguages}
                />
                <Label htmlFor="ltEnabled" className="text-sm font-normal cursor-pointer">
                  Enable Lithuanian content
                </Label>
                {!canUseAllLanguages && (
                  <a href="/app/subscription" className="text-xs text-primary hover:underline">
                    Upgrade for more languages
                  </a>
                )}
              </div>
            </div>

            {/* Default widget language (only relevant with >1 language) */}
            {ltEnabled && (
              <div className="space-y-1.5">
                <Label>Widget default language</Label>
                <Controller
                  name="defaultLanguage"
                  control={control}
                  render={({ field }) => (
                    <Select
                      value={field.value ?? watchedLanguages[0] ?? 'en'}
                      onValueChange={field.onChange}
                    >
                      <SelectTrigger className="w-full max-w-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {watchedLanguages.map((l) => (
                          <SelectItem key={l} value={l}>
                            {LANG_LABELS[l]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
                <p className="text-xs text-muted-foreground">
                  The language the live widget opens in for visitors.
                </p>
              </div>
            )}

            {/* Per-language content fields */}
            <div className="space-y-4 pt-1">
              {/* Greeting */}
              <div className="space-y-1.5">
                <Label htmlFor={`greeting-${activeLang}`}>
                  Greeting message
                  <span className="ml-1.5 text-xs text-muted-foreground font-normal">
                    ({LANG_LABELS[activeLang]})
                  </span>
                </Label>
                <Textarea
                  key={`greeting-${activeLang}`}
                  id={`greeting-${activeLang}`}
                  {...register(`content.${activeLang}.greeting`)}
                  placeholder={activeLang === 'lt' ? 'Sveiki! Kaip galiu padėti?' : 'Hi! How can I help you today?'}
                  className="min-h-20"
                />
                {activeLang === 'en' && errors.content?.en?.greeting && (
                  <p className="text-xs text-destructive">{errors.content.en.greeting.message}</p>
                )}
                {activeLang === 'lt' && errors.content?.lt?.greeting && (
                  <p className="text-xs text-destructive">{errors.content.lt.greeting.message}</p>
                )}
              </div>

              {/* Quick actions — welcome-screen buttons, edited via a dialog */}
              <div className="space-y-2">
                <Label>
                  Quick actions
                  <span className="ml-1.5 text-xs font-normal text-muted-foreground">
                    ({LANG_LABELS[activeLang]}, max {MAX_SUGGESTED_QUESTIONS})
                  </span>
                </Label>
                <p className="text-xs text-muted-foreground">
                  Buttons shown on the welcome screen. Each sends text to the bot, or opens a link.
                </p>
                <div className="space-y-2">
                  {activeSuggestedField.fields.map((field, index) => {
                    const f = field as { id: string; label?: string; prompt?: string; url?: string }
                    const summary = f.url
                      ? `Opens ${f.url}`
                      : f.prompt
                        ? `Sends: ${f.prompt}`
                        : 'Sends the title'
                    return (
                      <div
                        key={field.id}
                        className="flex items-center gap-2 rounded-lg border p-2.5"
                      >
                        <button
                          type="button"
                          onClick={() => openQuickAction(index)}
                          className="min-w-0 flex-1 text-left"
                        >
                          <p className="truncate text-sm font-medium">{f.label || 'Untitled action'}</p>
                          <p className="truncate text-xs text-muted-foreground">{summary}</p>
                        </button>
                        <button
                          type="button"
                          onClick={() => activeSuggestedField.remove(index)}
                          aria-label="Remove quick action"
                          className="flex size-7 shrink-0 items-center justify-center rounded-md bg-destructive text-white transition-[filter] hover:brightness-95"
                        >
                          <TrashIcon className="size-3.5" />
                        </button>
                      </div>
                    )
                  })}
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={suggestedCount >= MAX_SUGGESTED_QUESTIONS}
                  onClick={() => openQuickAction(null)}
                >
                  <PlusIcon />
                  Add quick action
                </Button>
                {suggestedCount >= MAX_SUGGESTED_QUESTIONS && (
                  <p className="text-xs text-muted-foreground">Maximum {MAX_SUGGESTED_QUESTIONS} allowed</p>
                )}
              </div>

              {/* Quick-action add/edit dialog */}
              <Dialog open={qaOpen} onOpenChange={setQaOpen}>
                <DialogContent className="sm:max-w-md">
                  <DialogHeader>
                    <DialogTitle>{qaIndex === null ? 'Add quick action' : 'Edit quick action'}</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div className="space-y-1.5">
                      <Label htmlFor="qa-title">Action title</Label>
                      <Input
                        id="qa-title"
                        value={qaDraft.label}
                        onChange={(e) => setQaDraft((d) => ({ ...d, label: e.target.value }))}
                        placeholder="e.g. TOP Prekės"
                        maxLength={80}
                      />
                    </div>

                    <Tabs value={qaMode} onValueChange={(v) => setQaMode(v as 'text' | 'url')}>
                      <TabsList className="mb-3 w-full group-data-horizontal/tabs:h-10">
                        <TabsTrigger
                          value="text"
                          className="data-active:bg-primary data-active:text-primary-foreground"
                        >
                          Send text
                        </TabsTrigger>
                        <TabsTrigger
                          value="url"
                          className="data-active:bg-primary data-active:text-primary-foreground"
                        >
                          Open a URL
                        </TabsTrigger>
                      </TabsList>

                      {qaMode === 'text' ? (
                        <div className="space-y-1.5">
                          <Label htmlFor="qa-text">Action text to send</Label>
                          <Input
                            id="qa-text"
                            value={qaDraft.prompt}
                            onChange={(e) => setQaDraft((d) => ({ ...d, prompt: e.target.value }))}
                            placeholder="Message sent to the bot — e.g. Parodyk populiariausias prekes"
                          />
                          <p className="text-xs text-muted-foreground">
                            Sent to the bot when clicked. Leave empty to send the title itself.
                          </p>
                        </div>
                      ) : (
                        <div className="space-y-1.5">
                          <Label htmlFor="qa-url">Url to open</Label>
                          <Input
                            id="qa-url"
                            value={qaDraft.url}
                            onChange={(e) => setQaDraft((d) => ({ ...d, url: e.target.value }))}
                            placeholder="https://yourstore.com/page"
                          />
                          <p className="text-xs text-muted-foreground">
                            The visitor gets a link button to follow.
                          </p>
                        </div>
                      )}
                    </Tabs>
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setQaOpen(false)}
                      className="h-10 rounded-md px-6"
                    >
                      Cancel
                    </Button>
                    <Button
                      type="button"
                      onClick={saveQuickAction}
                      disabled={!qaDraft.label.trim()}
                      className="h-10 rounded-md px-6"
                    >
                      {qaIndex === null ? 'Add' : 'Save'}
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>

              {/* Fallback message */}
              <div className="space-y-1.5">
                <Label htmlFor={`fallback-${activeLang}`}>
                  Fallback message
                  <span className="ml-1.5 text-xs text-muted-foreground font-normal">
                    ({LANG_LABELS[activeLang]})
                  </span>
                </Label>
                <Textarea
                  key={`fallback-${activeLang}`}
                  id={`fallback-${activeLang}`}
                  {...register(`content.${activeLang}.fallbackMessage`)}
                  placeholder={
                    activeLang === 'lt'
                      ? 'Atsiprašau, nežinau atsakymo…'
                      : "I'm not sure about that — let me take your details…"
                  }
                  className="min-h-20"
                />
                {activeLang === 'en' && errors.content?.en?.fallbackMessage && (
                  <p className="text-xs text-destructive">{errors.content.en.fallbackMessage.message}</p>
                )}
                {activeLang === 'lt' && errors.content?.lt?.fallbackMessage && (
                  <p className="text-xs text-destructive">{errors.content.lt.fallbackMessage.message}</p>
                )}
              </div>

              {/* Validation note when LT enabled */}
              {ltEnabled && activeLang === 'lt' && (
                <p className="text-xs text-muted-foreground bg-muted/50 rounded-md px-3 py-2">
                  Lithuanian content is required when the language is enabled. Fields marked above must be filled.
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* ── Theme ── */}
        <Card className="overflow-visible rounded-none border-b pt-0 shadow-none ring-0">
          <CardHeader className="header-grid relative sticky top-16 z-[5] overflow-hidden rounded-none border-b bg-muted/70 py-3 backdrop-blur">
            <SectionHeader
              icon={PaletteIcon}
              title="Theme"
              description="Colors, widget position, and corner roundness."
            />
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              {/* Primary color */}
              <div className="space-y-1.5">
                <Label htmlFor="primaryColor">Primary color</Label>
                <Controller
                  name="theme.primaryColor"
                  control={control}
                  render={({ field }) => (
                    <div className="flex items-center gap-2">
                      <input
                        id="primaryColor"
                        type="color"
                        value={field.value ?? '#4f46e5'}
                        onChange={(e) => field.onChange(e.target.value)}
                        className="h-8 w-10 cursor-pointer rounded border border-input bg-transparent p-0.5 flex-shrink-0"
                        aria-label="Pick primary color"
                      />
                      <Input
                        value={field.value ?? ''}
                        onChange={(e) => field.onChange(e.target.value)}
                        onBlur={field.onBlur}
                        placeholder="#4f46e5"
                        className="flex-1 font-mono text-sm"
                        aria-label="Primary color hex value"
                      />
                    </div>
                  )}
                />
              </div>

              {/* Launcher position */}
              <div className="space-y-1.5">
                <Label>Launcher position</Label>
                <Controller
                  name="theme.position"
                  control={control}
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="bottom-right">Bottom right</SelectItem>
                        <SelectItem value="bottom-left">Bottom left</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>
            </div>

            {/* Font */}
            <div className="space-y-1.5">
              <Label>Chat font</Label>
              <Controller
                name="theme.fontFamily"
                control={control}
                render={({ field }) => (
                  <Select value={field.value ?? 'geist'} onValueChange={field.onChange}>
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {FONT_OPTIONS.map((f) => (
                        <SelectItem
                          key={f.value}
                          value={f.value}
                          style={{ fontFamily: f.stack }}
                        >
                          {f.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              <p
                className="text-sm text-muted-foreground"
                style={{ fontFamily: fontStack(watch('theme.fontFamily')) }}
              >
                The quick brown fox jumps over the lazy dog
              </p>
            </div>

            {/* Launcher appearance */}
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>Launcher style</Label>
                <Controller
                  name="theme.launcherStyle"
                  control={control}
                  render={({ field }) => (
                    <Select value={field.value ?? 'circle'} onValueChange={field.onChange}>
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="circle">Circle (icon only)</SelectItem>
                        <SelectItem value="pill">Pill (icon + text)</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="launcherLabel">Launcher text</Label>
                <Input
                  id="launcherLabel"
                  {...register('theme.launcherLabel')}
                  placeholder="Chat with us"
                  disabled={watch('theme.launcherStyle') !== 'pill'}
                />
                <p className="text-xs text-muted-foreground">
                  Shown next to the icon when the style is a pill.
                </p>
              </div>
            </div>

            <div className="flex items-center justify-between gap-4">
              <div className="space-y-0.5">
                <Label htmlFor="launcherShowLogo">Show company logo in launcher</Label>
                <p className="text-xs text-muted-foreground">
                  Use the company logo instead of the default chat icon.
                </p>
              </div>
              <Controller
                name="theme.launcherShowLogo"
                control={control}
                render={({ field }) => (
                  <Switch
                    id="launcherShowLogo"
                    checked={field.value ?? false}
                    onCheckedChange={field.onChange}
                  />
                )}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="launcherColor">Launcher color</Label>
              <Controller
                name="theme.launcherColor"
                control={control}
                render={({ field }) => (
                  <div className="flex items-center gap-2">
                    <input
                      id="launcherColor"
                      type="color"
                      value={field.value || watch('theme.primaryColor') || '#4f46e5'}
                      onChange={(e) => field.onChange(e.target.value)}
                      className="h-8 w-10 flex-shrink-0 cursor-pointer rounded border border-input bg-transparent p-0.5"
                      aria-label="Pick launcher color"
                    />
                    <Input
                      value={field.value ?? ''}
                      onChange={(e) => field.onChange(e.target.value)}
                      onBlur={field.onBlur}
                      placeholder="Defaults to primary color"
                      className="flex-1 font-mono text-sm"
                      aria-label="Launcher color hex value"
                    />
                  </div>
                )}
              />
              <p className="text-xs text-muted-foreground">
                The floating bubble&apos;s color. Leave empty to use your primary color.
              </p>
            </div>

            {/* Radius sliders — stacked vertically */}
            <div className="space-y-5">
              <div className="space-y-2">
                <Controller
                  control={control}
                  name="theme.cornerRadius"
                  render={({ field }) => (
                    <Scrubber
                      label="Chat window roundness"
                      min={0}
                      max={32}
                      step={1}
                      decimals={0}
                      suffix="px"
                      value={field.value ?? 16}
                      onValueChange={(v) => field.onChange(v)}
                    />
                  )}
                />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Square</span>
                  <span>Rounded</span>
                </div>
              </div>

              <div className="space-y-2">
                <Controller
                  control={control}
                  name="theme.bubbleRadius"
                  render={({ field }) => (
                    <Scrubber
                      label="Bubble roundness"
                      min={0}
                      max={24}
                      step={1}
                      decimals={0}
                      suffix="px"
                      value={field.value ?? 16}
                      onValueChange={(v) => field.onChange(v)}
                    />
                  )}
                />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Square</span>
                  <span>Pill</span>
                </div>
              </div>

              <div className="space-y-2">
                <Controller
                  control={control}
                  name="theme.navButtonRadius"
                  render={({ field }) => (
                    <Scrubber
                      label="Button roundness"
                      min={0}
                      max={24}
                      step={1}
                      decimals={0}
                      suffix="px"
                      value={field.value ?? 12}
                      onValueChange={(v) => field.onChange(v)}
                    />
                  )}
                />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Square</span>
                  <span>Round</span>
                </div>
                <p className="text-xs text-muted-foreground">
                  Corner radius of the header buttons (call &amp; restart).
                </p>
              </div>
            </div>

            {/* Chat background — a base color with an optional image overlaid at
                a chosen opacity (image is layered on top of the color). */}
            <div className="space-y-4 border-t pt-4">
              <div className="space-y-1.5">
                <Label htmlFor="backgroundColor">Chat background color</Label>
                <Controller
                  name="theme.backgroundColor"
                  control={control}
                  render={({ field }) => (
                    <div className="flex items-center gap-2">
                      <input
                        id="backgroundColor"
                        type="color"
                        value={field.value || '#ffffff'}
                        onChange={(e) => field.onChange(e.target.value)}
                        className="h-8 w-10 cursor-pointer rounded border border-input bg-transparent p-0.5 flex-shrink-0"
                        aria-label="Pick chat background color"
                      />
                      <Input
                        value={field.value ?? ''}
                        onChange={(e) => field.onChange(e.target.value)}
                        onBlur={field.onBlur}
                        placeholder="#ffffff"
                        className="flex-1 font-mono text-sm"
                        aria-label="Chat background color hex value"
                      />
                    </div>
                  )}
                />
                <p className="text-xs text-muted-foreground">
                  Fills the chat area behind messages. Used on its own, or as the base layer under a background image.
                </p>
              </div>

              <LogoUpload
                botId={botId}
                control={control}
                setValue={setValue}
                name="theme.backgroundImageUrl"
                label="Chat background image (optional)"
                filePrefix="bg"
                description="Shown behind the conversation, layered on top of the background color."
              />

              {watch('theme.backgroundImageUrl') ? (
                <div className="space-y-2">
                  <Controller
                    control={control}
                    name="theme.backgroundImageOpacity"
                    render={({ field }) => (
                      <Scrubber
                        label="Background image opacity"
                        min={0}
                        max={100}
                        step={1}
                        decimals={0}
                        suffix="%"
                        value={field.value ?? 100}
                        onValueChange={(v) => field.onChange(v)}
                      />
                    )}
                  />
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>Subtle</span>
                    <span>Full</span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Lower the opacity to blend the image into your background color and keep messages readable.
                  </p>
                </div>
              ) : null}
            </div>

            <div className="flex items-center justify-between gap-4">
              <div className="space-y-0.5">
                <Label htmlFor="showCallButton">Show &ldquo;talk with agent&rdquo; button</Label>
                <p className="text-xs text-muted-foreground">
                  The voice call button in the header (only shows when voice is enabled).
                </p>
              </div>
              <Controller
                name="theme.showCallButton"
                control={control}
                render={({ field }) => (
                  <Switch
                    id="showCallButton"
                    checked={field.value ?? true}
                    onCheckedChange={field.onChange}
                  />
                )}
              />
            </div>

            <div className="flex items-center justify-between gap-4">
              <div className="space-y-0.5">
                <Label htmlFor="glassBubbles">Glass message bubbles</Label>
                <p className="text-xs text-muted-foreground">
                  Frosted, translucent chat bubbles — looks best over a background image or color.
                </p>
              </div>
              <Controller
                name="theme.glassBubbles"
                control={control}
                render={({ field }) => (
                  <Switch
                    id="glassBubbles"
                    checked={field.value ?? false}
                    onCheckedChange={field.onChange}
                  />
                )}
              />
            </div>

            {/* Bubble border — applies to message bubbles + suggested actions */}
            <div className="space-y-3 border-t pt-4">
              <Controller
                control={control}
                name="theme.bubbleBorderWidth"
                render={({ field }) => (
                  <Scrubber
                    label="Bubble border width"
                    min={0}
                    max={6}
                    step={1}
                    decimals={0}
                    suffix="px"
                    value={field.value ?? 0}
                    onValueChange={(v) => field.onChange(v)}
                  />
                )}
              />
              <p className="text-xs text-muted-foreground">
                A border around message bubbles and suggested-action tiles. Set to 0 for none.
              </p>
              <div className="space-y-1.5">
                <Label htmlFor="bubbleBorderColor">Border color</Label>
                <Controller
                  name="theme.bubbleBorderColor"
                  control={control}
                  render={({ field }) => (
                    <div className="flex items-center gap-2">
                      <input
                        id="bubbleBorderColor"
                        type="color"
                        value={field.value || '#e5e7eb'}
                        onChange={(e) => field.onChange(e.target.value)}
                        className="h-8 w-10 cursor-pointer rounded border border-input bg-transparent p-0.5 flex-shrink-0"
                        aria-label="Pick bubble border color"
                      />
                      <Input
                        value={field.value ?? ''}
                        onChange={(e) => field.onChange(e.target.value)}
                        onBlur={field.onBlur}
                        placeholder="#e5e7eb"
                        className="flex-1 font-mono text-sm"
                        aria-label="Bubble border color hex value"
                      />
                    </div>
                  )}
                />
              </div>
            </div>

            {/* Custom send-button icon */}
            <div className="border-t pt-4">
              <LogoUpload
                botId={botId}
                control={control}
                setValue={setValue}
                name="theme.sendIconUrl"
                label="Send button icon (optional)"
                description="Replaces the default arrow in the composer. A small square icon works best."
                filePrefix="sendicon"
              />
            </div>
          </CardContent>
        </Card>

        {/* ── AI Behaviour ── */}
        <Card className="overflow-visible rounded-none border-b pt-0 shadow-none ring-0">
          <CardHeader className="header-grid relative sticky top-16 z-[5] overflow-hidden rounded-none border-b bg-muted/70 py-3 backdrop-blur">
            <SectionHeader
              icon={SparklesIcon}
              title="AI behaviour"
              description="System prompt and persona."
            />
          </CardHeader>
          <CardContent className="space-y-4">
            <Controller
              name="systemPrompt"
              control={control}
              render={({ field }) => (
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="systemPrompt">System prompt</Label>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setPromptOpen(true)}
                    >
                      <Maximize2Icon className="size-3.5" />
                      Expand
                    </Button>
                  </div>
                  <Textarea
                    id="systemPrompt"
                    value={field.value ?? ''}
                    onChange={field.onChange}
                    placeholder="You are a helpful assistant…"
                    className="h-32 resize-none overflow-auto font-mono text-sm"
                  />
                  {errors.systemPrompt && (
                    <p className="text-xs text-destructive">{errors.systemPrompt.message}</p>
                  )}

                  {/* Expanded editor */}
                  <Dialog open={promptOpen} onOpenChange={setPromptOpen}>
                    <DialogContent className="flex max-h-[85vh] w-[calc(100%-2rem)] flex-col sm:max-w-3xl">
                      <DialogHeader>
                        <DialogTitle>System prompt</DialogTitle>
                      </DialogHeader>
                      <Textarea
                        value={field.value ?? ''}
                        onChange={field.onChange}
                        placeholder="You are a helpful assistant…"
                        className="min-h-0 flex-1 resize-none font-mono text-sm leading-relaxed"
                      />
                      <div className="flex justify-end">
                        <Button type="button" size="sm" onClick={() => setPromptOpen(false)}>
                          Done
                        </Button>
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>
              )}
            />

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>Tone</Label>
                <Controller
                  name="persona.tone"
                  control={control}
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="friendly">Friendly</SelectItem>
                        <SelectItem value="professional">Professional</SelectItem>
                        <SelectItem value="casual">Casual</SelectItem>
                        <SelectItem value="formal">Formal</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>

              <div className="space-y-1.5">
                <Label>Verbosity</Label>
                <Controller
                  name="persona.verbosity"
                  control={control}
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="concise">Concise</SelectItem>
                        <SelectItem value="balanced">Balanced</SelectItem>
                        <SelectItem value="detailed">Detailed</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>

            </div>
          </CardContent>
        </Card>

        {/* ── Voice ── */}
        <VoiceSection
          control={control}
          watch={watch}
          setValue={setValue}
          activeLang={activeLang}
          enabledLanguages={watchedLanguages as BotLanguage[]}
          canUseVoice={canUseVoice}
        />

        {/* ── Lead Capture ── */}
        <Card className="overflow-visible rounded-none border-b pt-0 shadow-none ring-0">
          <CardHeader className="header-grid relative sticky top-16 z-[5] overflow-hidden rounded-none border-b bg-muted/70 py-3 backdrop-blur">
            <SectionHeader
              icon={UserPlusIcon}
              title="Lead capture"
              description="Collect visitor contact information during the conversation."
            />
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-3">
              <Controller
                name="leadCapture.enabled"
                control={control}
                render={({ field }) => (
                  <Switch
                    checked={field.value}
                    onCheckedChange={field.onChange}
                    id="leadCaptureEnabled"
                    disabled={!canUseLeadCapture}
                  />
                )}
              />
              <Label htmlFor="leadCaptureEnabled">Enable lead capture</Label>
              {!canUseLeadCapture && (
                <a href="/app/subscription" className="text-xs text-primary hover:underline">
                  Available on paid plans
                </a>
              )}
            </div>

            {leadCaptureEnabled && (
              <div className="space-y-4 rounded-lg border p-4">
                <div className="space-y-1.5">
                  <Label>Trigger</Label>
                  <Controller
                    name="leadCapture.trigger"
                    control={control}
                    render={({ field }) => (
                      <Select value={field.value} onValueChange={field.onChange}>
                        <SelectTrigger className="w-full">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="on_fallback">On fallback</SelectItem>
                          <SelectItem value="after_n_messages">After N messages</SelectItem>
                          <SelectItem value="manual">Manual</SelectItem>
                        </SelectContent>
                      </Select>
                    )}
                  />
                </div>

                {watch('leadCapture.trigger') === 'after_n_messages' && (
                  <div className="space-y-1.5">
                    <Label htmlFor="afterNMessages">Trigger after N messages</Label>
                    <Input
                      id="afterNMessages"
                      type="number"
                      min={1}
                      {...register('leadCapture.afterNMessages', { valueAsNumber: true })}
                      placeholder="3"
                    />
                  </div>
                )}

                <div className="space-y-3">
                  <Label>Fields</Label>
                  {leadFieldsArray.fields.map((field, index) => (
                    <div
                      key={field.id}
                      className="grid gap-2 rounded-md border p-3 sm:grid-cols-[1fr_1fr_auto_auto]"
                    >
                      <div className="space-y-1">
                        <Label className="text-xs">Key</Label>
                        <Input
                          {...register(`leadCapture.fields.${index}.key`)}
                          placeholder="email"
                          className="text-sm"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Label</Label>
                        <Input
                          {...register(`leadCapture.fields.${index}.label`)}
                          placeholder="Email address"
                          className="text-sm"
                        />
                      </div>
                      <div className="flex items-end gap-1.5 pb-0.5">
                        <Controller
                          name={`leadCapture.fields.${index}.required`}
                          control={control}
                          render={({ field: f }) => (
                            <Switch
                              checked={f.value}
                              onCheckedChange={f.onChange}
                              size="sm"
                              id={`field-required-${index}`}
                            />
                          )}
                        />
                        <Label
                          htmlFor={`field-required-${index}`}
                          className="text-xs whitespace-nowrap"
                        >
                          Required
                        </Label>
                      </div>
                      <div className="flex items-end">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-sm"
                          onClick={() => leadFieldsArray.remove(index)}
                          aria-label="Remove field"
                        >
                          <TrashIcon />
                        </Button>
                      </div>
                    </div>
                  ))}
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      leadFieldsArray.append({ key: '', label: '', required: false })
                    }
                  >
                    <PlusIcon />
                    Add field
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* ── Store / Products ── */}
        <CommerceSection control={control} watch={watch} />

        {/* ── Allowed Domains (Advanced) ── */}
        <Card className="overflow-visible rounded-none border-b pt-0 shadow-none ring-0">
          <CardHeader className="header-grid relative sticky top-16 z-[5] overflow-hidden rounded-none border-b bg-muted/70 py-3 backdrop-blur">
            <SectionHeader
              icon={ShieldIcon}
              title="Allowed domains"
              description="Restrict which websites can embed this widget. Leave empty to allow any domain."
            />
          </CardHeader>
          <CardContent className="space-y-3">
            {allowedDomainsField.fields.map((field, index) => (
              <div key={field.id} className="flex items-center gap-2">
                <Input
                  {...register(`allowedDomains.${index}` as const)}
                  placeholder="example.com"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => allowedDomainsField.remove(index)}
                  aria-label="Remove domain"
                >
                  <TrashIcon />
                </Button>
              </div>
            ))}
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => allowedDomainsField.append('')}
            >
              <PlusIcon />
              Add domain
            </Button>
            <p className="text-xs text-muted-foreground">
              Not recommended to leave empty in production.
            </p>
          </CardContent>
        </Card>

        </form>
      </ResizablePanel>

      {/* ── Live Preview — fixed overlay, bottom-right, like the real embed widget ── */}
      <div
        className="relative flex-1 min-w-0 overflow-hidden bg-dots"
        aria-label="Live preview"
        role="complementary"
      >
        <div className="absolute bottom-6 right-6 z-20 pointer-events-none">
          <TestChat botId={botId} config={liveConfig} activeLang={activeLang} />
        </div>
      </div>
    </div>
  )
}

// -------------------------------------------------------------------------
// CommerceSection — "Store / products" card
// -------------------------------------------------------------------------
interface CommerceSectionProps {
  control: Control<FormValues>
  watch: UseFormWatch<FormValues>
}

function CommerceSection({ control, watch }: CommerceSectionProps) {
  const commerceEnabled = watch('commerce.enabled')
  const provider = watch('commerce.provider') ?? 'woocommerce'
  const storeUrl = watch('commerce.storeUrl') ?? ''
  const shopifyDomain = watch('commerce.shopifyDomain') ?? ''
  const shopifyToken = watch('commerce.shopifyToken') ?? ''
  const restKey = watch('commerce.restKey') ?? ''
  const restSecret = watch('commerce.restSecret') ?? ''
  const magentoToken = watch('commerce.magentoToken') ?? ''
  const discountEnabled = watch('commerce.discount.enabled')
  const [testState, setTestState] = useState<CommerceTestState>({ status: 'idle' })
  const [orderTest, setOrderTest] = useState<{
    status: 'idle' | 'loading' | 'ok' | 'error'
    message?: string
  }>({ status: 'idle' })

  const handleTestOrders = useCallback(async () => {
    const isMagento = provider === 'magento'
    const missing = isMagento ? !storeUrl.trim() || !magentoToken.trim() : !storeUrl.trim() || !restKey.trim() || !restSecret.trim()
    if (missing) {
      setOrderTest({
        status: 'error',
        message: isMagento ? 'Enter the store URL and access token first.' : 'Enter the store URL, key and secret first.',
      })
      return
    }
    setOrderTest({ status: 'loading' })
    try {
      const body = isMagento
        ? { provider: 'magento', storeUrl: storeUrl.trim(), mode: 'orders', magentoToken: magentoToken.trim() }
        : {
            provider: 'woocommerce',
            storeUrl: storeUrl.trim(),
            mode: 'orders',
            restKey: restKey.trim(),
            restSecret: restSecret.trim(),
          }
      const res = await fetch('/api/commerce/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const data = (await res.json()) as { ok: boolean; error?: string }
      setOrderTest(data.ok ? { status: 'ok' } : { status: 'error', message: data.error ?? 'Connection failed.' })
    } catch {
      setOrderTest({ status: 'error', message: 'Network error — please try again.' })
    }
  }, [provider, storeUrl, restKey, restSecret, magentoToken])

  const testReady =
    provider === 'shopify' ? Boolean(shopifyDomain.trim() && shopifyToken.trim()) : Boolean(storeUrl.trim())

  const handleTest = useCallback(async () => {
    if (!testReady) {
      setTestState({
        status: 'error',
        message: provider === 'shopify' ? 'Enter the Shopify domain and token first.' : 'Enter a store URL first.',
      })
      return
    }
    setTestState({ status: 'loading' })
    try {
      const body =
        provider === 'shopify'
          ? { provider, shopifyDomain: shopifyDomain.trim(), shopifyToken: shopifyToken.trim() }
          : { provider, storeUrl: storeUrl.trim() }
      const res = await fetch('/api/commerce/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const data = (await res.json()) as { ok: boolean; error?: string; total?: number }
      if (data.ok) {
        setTestState({ status: 'ok', count: data.total ?? 0 })
      } else {
        setTestState({ status: 'error', message: data.error ?? 'Connection failed.' })
      }
    } catch {
      setTestState({ status: 'error', message: 'Network error — please try again.' })
    }
  }, [provider, storeUrl, shopifyDomain, shopifyToken, testReady])

  // Reset test state when the connection inputs change.
  const connKey = `${provider}:${storeUrl}:${shopifyDomain}:${shopifyToken}`
  const prevConnRef = useRef(connKey)
  if (prevConnRef.current !== connKey) {
    prevConnRef.current = connKey
    if (testState.status !== 'idle') setTestState({ status: 'idle' })
  }

  return (
    <Card className="overflow-visible rounded-none border-b pt-0 shadow-none ring-0">
      <CardHeader className="header-grid relative sticky top-16 z-[5] overflow-hidden rounded-none border-b bg-muted/70 py-3 backdrop-blur">
        <SectionHeader
          icon={ShoppingBagIcon}
          title="Store / products"
          description="Connect your store (WooCommerce, Shopify, or Magento) so the bot can search your catalog and show product cards."
        />
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-3">
          <Controller
            name="commerce.enabled"
            control={control}
            render={({ field }) => (
              <Switch
                checked={field.value ?? false}
                onCheckedChange={field.onChange}
                id="commerceEnabled"
              />
            )}
          />
          <Label htmlFor="commerceEnabled">Enable store integration</Label>
        </div>

        {commerceEnabled && (
          <div className="space-y-4 rounded-lg border p-4">
            {/* Provider */}
            <div className="space-y-1.5">
              <Label>Provider</Label>
              <Controller
                name="commerce.provider"
                control={control}
                render={({ field }) => (
                  <Select value={field.value ?? 'woocommerce'} onValueChange={field.onChange}>
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="woocommerce">WooCommerce</SelectItem>
                      <SelectItem value="shopify">Shopify</SelectItem>
                      <SelectItem value="magento">Magento</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              />
            </div>

            {/* WooCommerce / Magento: store URL */}
            {(provider === 'woocommerce' || provider === 'magento') && (
              <div className="space-y-1.5">
                <Label htmlFor="commerceStoreUrl">Store URL</Label>
                <Controller
                  name="commerce.storeUrl"
                  control={control}
                  render={({ field }) => (
                    <Input
                      id="commerceStoreUrl"
                      name={field.name}
                      ref={field.ref}
                      value={field.value ?? ''}
                      onChange={field.onChange}
                      onBlur={field.onBlur}
                      placeholder="https://yourstore.com"
                      autoComplete="url"
                      inputMode="url"
                    />
                  )}
                />
              </div>
            )}

            {/* Shopify: Storefront domain + token */}
            {provider === 'shopify' && (
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="shopifyDomain">Store domain</Label>
                  <Controller
                    name="commerce.shopifyDomain"
                    control={control}
                    render={({ field }) => (
                      <Input
                        id="shopifyDomain"
                        value={field.value ?? ''}
                        onChange={field.onChange}
                        onBlur={field.onBlur}
                        placeholder="your-store.myshopify.com"
                        autoComplete="off"
                        className="font-mono text-sm"
                      />
                    )}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="shopifyToken">Storefront access token</Label>
                  <Controller
                    name="commerce.shopifyToken"
                    control={control}
                    render={({ field }) => (
                      <Input
                        id="shopifyToken"
                        type="password"
                        value={field.value ?? ''}
                        onChange={field.onChange}
                        onBlur={field.onBlur}
                        placeholder="shpat_… / public token"
                        autoComplete="off"
                        className="font-mono text-sm"
                      />
                    )}
                  />
                  <p className="text-xs text-muted-foreground sm:col-span-2">
                    Create a Storefront API access token in Shopify admin → Settings → Apps → Develop apps.
                  </p>
                </div>
              </div>
            )}

            {/* Test connection button + result */}
            <div className="flex items-center gap-3 flex-wrap">
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={testState.status === 'loading' || !testReady}
                onClick={handleTest}
              >
                {testState.status === 'loading' ? 'Testing…' : 'Test connection'}
              </Button>

              {testState.status === 'ok' && (
                <TestBadge variant="ok">
                  {testState.count > 0
                    ? `Connected — ${testState.count.toLocaleString()} product${testState.count !== 1 ? 's' : ''} in catalog`
                    : 'Connected'}
                </TestBadge>
              )}
              {testState.status === 'error' && (
                <TestBadge variant="error">{testState.message}</TestBadge>
              )}
            </div>

            <p className="text-xs text-muted-foreground bg-muted/50 rounded-md px-3 py-2">
              Your bot will search this store&apos;s catalog live and show product cards in chat.
            </p>

            {/* Order lookup (optional) — WooCommerce REST credentials (Woo only) */}
            {provider === 'woocommerce' && (
            <div className="space-y-3 border-t pt-4">
              <div>
                <Label>Order lookup (optional)</Label>
                <p className="text-xs text-muted-foreground">
                  Add read-only WooCommerce REST keys so the bot can check order status. Create them in
                  WooCommerce → Settings → Advanced → REST API (permission: Read). Stored securely and
                  never sent to the browser.
                </p>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="restKey">Consumer key</Label>
                  <Controller
                    name="commerce.restKey"
                    control={control}
                    render={({ field }) => (
                      <Input
                        id="restKey"
                        value={field.value ?? ''}
                        onChange={field.onChange}
                        onBlur={field.onBlur}
                        placeholder="ck_…"
                        autoComplete="off"
                        className="font-mono text-sm"
                      />
                    )}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="restSecret">Consumer secret</Label>
                  <Controller
                    name="commerce.restSecret"
                    control={control}
                    render={({ field }) => (
                      <Input
                        id="restSecret"
                        type="password"
                        value={field.value ?? ''}
                        onChange={field.onChange}
                        onBlur={field.onBlur}
                        placeholder="cs_…"
                        autoComplete="off"
                        className="font-mono text-sm"
                      />
                    )}
                  />
                </div>
              </div>
              <div className="flex items-center gap-3 flex-wrap">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={orderTest.status === 'loading' || !restKey.trim() || !restSecret.trim()}
                  onClick={handleTestOrders}
                >
                  {orderTest.status === 'loading' ? 'Testing…' : 'Test order access'}
                </Button>
                {orderTest.status === 'ok' && <TestBadge variant="ok">REST access OK</TestBadge>}
                {orderTest.status === 'error' && (
                  <TestBadge variant="error">{orderTest.message}</TestBadge>
                )}
              </div>
            </div>
            )}

            {/* Order lookup (optional) — Magento integration access token */}
            {provider === 'magento' && (
            <div className="space-y-3 border-t pt-4">
              <div>
                <Label>Order lookup (optional)</Label>
                <p className="text-xs text-muted-foreground">
                  Add a Magento integration access token so the bot can check order status. Create it in
                  Magento Admin → System → Integrations (resource access: Sales). Stored securely and
                  never sent to the browser.
                </p>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="magentoToken">Access token</Label>
                <Controller
                  name="commerce.magentoToken"
                  control={control}
                  render={({ field }) => (
                    <Input
                      id="magentoToken"
                      type="password"
                      value={field.value ?? ''}
                      onChange={field.onChange}
                      onBlur={field.onBlur}
                      placeholder="Integration access token"
                      autoComplete="off"
                      className="font-mono text-sm"
                    />
                  )}
                />
              </div>
              <div className="flex items-center gap-3 flex-wrap">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={orderTest.status === 'loading' || !magentoToken.trim()}
                  onClick={handleTestOrders}
                >
                  {orderTest.status === 'loading' ? 'Testing…' : 'Test order access'}
                </Button>
                {orderTest.status === 'ok' && <TestBadge variant="ok">REST access OK</TestBadge>}
                {orderTest.status === 'error' && (
                  <TestBadge variant="error">{orderTest.message}</TestBadge>
                )}
              </div>
            </div>
            )}

            {/* Discount code (optional) */}
            <div className="space-y-3 border-t pt-4">
              <div className="flex items-center gap-3">
                <Controller
                  name="commerce.discount.enabled"
                  control={control}
                  render={({ field }) => (
                    <Switch
                      id="discountEnabled"
                      checked={field.value ?? false}
                      onCheckedChange={field.onChange}
                    />
                  )}
                />
                <Label htmlFor="discountEnabled">Offer a discount code</Label>
              </div>
              {discountEnabled && (
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label htmlFor="discountCode">Code</Label>
                    <Controller
                      name="commerce.discount.code"
                      control={control}
                      render={({ field }) => (
                        <Input
                          id="discountCode"
                          value={field.value ?? ''}
                          onChange={field.onChange}
                          onBlur={field.onBlur}
                          placeholder="WELCOME10"
                          className="font-mono text-sm"
                        />
                      )}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="discountDesc">Description</Label>
                    <Controller
                      name="commerce.discount.description"
                      control={control}
                      render={({ field }) => (
                        <Input
                          id="discountDesc"
                          value={field.value ?? ''}
                          onChange={field.onChange}
                          onBlur={field.onBlur}
                          placeholder="10% off your first order"
                        />
                      )}
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function TestBadge({ variant, children }: { variant: 'ok' | 'error'; children: ReactNode }) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 text-xs font-medium rounded-full px-2.5 py-1',
        variant === 'ok'
          ? 'bg-green-50 text-green-700 border border-green-200'
          : 'bg-red-50 text-red-700 border border-red-200',
      )}
      role="status"
    >
      {variant === 'ok' ? '✓' : '✗'} {children}
    </span>
  )
}
