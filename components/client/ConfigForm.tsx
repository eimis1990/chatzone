'use client'

import { useState, useCallback, useEffect, useMemo, useRef, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { useRouter } from 'next/navigation'
import {
  useForm,
  useFieldArray,
  Controller,
  type Control,
  type UseFormWatch,
  type UseFormSetValue,
  type FieldErrors,
  type FieldPath,
} from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { formatDistanceToNow } from '@/lib/date-utils'
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
  GlobeIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  InfoIcon,
  type LucideIcon,
} from 'lucide-react'
import { botConfigFormSchema } from '@/lib/validation/schemas'
import {
  QUICK_ACTION_SUGGESTIONS,
  buildQuickAction,
} from '@/lib/quick-action-suggestions'
import type { BotLanguage, SuggestedQuestionAction, SystemPrompt } from '@/lib/types'
import type { z } from 'zod'
import { saveConfig, type SaveConfigResult } from '@/app/(client)/app/bots/[botId]/configure/actions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { Checkbox } from '@/components/ui/checkbox'
import { Scrubber } from '@/components/ui/scrubber'
import { trackEvent } from '@/lib/analytics'
import { createBrowserClient } from '@/lib/supabase/browser'
import {
  CardContent,
  Card,
  CardAction,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card'
import { CollapsibleSection } from '@/components/client/CollapsibleSection'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { TestChat } from '@/components/client/TestChat'
import { ResizablePanel } from '@/components/ui/resizable-panel'
import { VoiceSection } from '@/components/client/VoiceSection'
import { LogoUpload } from '@/components/client/LogoUpload'
import type { BotConfig } from '@/lib/types'
import { FONT_OPTIONS, fontStack } from '@/lib/fonts'
import {
  WIDGET_THEME_PRESETS,
  PRESET_PRESERVED_THEME_KEYS,
} from '@/lib/widget-theme-presets'
import { cn } from '@/lib/utils'
import { normalizeLanguageSelection } from '@/lib/validation/normalize-languages'
import { SUPPORTED_LANGUAGES, languageMeta } from '@/lib/i18n/languages'

interface ConfigFormProps {
  botId: string
  /** Internal bot name (sidebar label) — editable, distinct from displayName. */
  botName: string
  initialConfig: BotConfig
  /** Plan gating — disable controls the org's plan doesn't include. */
  /** Plan's max visitor languages (1 = free/single-language). */
  maxLanguages?: number
  canUseLeadCapture?: boolean
  /** Voice add-on gating — disable voice unless the add-on is active. */
  canUseVoice?: boolean
  /** Free plan: enabling voice opens an upgrade dialog instead of toggling. */
  voiceLocked?: boolean
  /** Save handler — defaults to the client saveConfig; the owner editor injects its own. */
  onSave?: (botId: string, rawConfig: unknown, name?: string) => Promise<SaveConfigResult>
  /** Optional control rendered next to Save (e.g. the owner's show-on-landing toggle). */
  headerAction?: ReactNode
  /** 'client' hides the technical sections (AI behaviour, Voice, Store, Allowed
   *  domains) — those are configured for them by the owner. 'owner' shows all. */
  audience?: 'owner' | 'client'
  /** Optional bar at the very top of the config panel (e.g. the owner's
   *  Configure / Knowledge tabs) — spans the config-panel width. */
  topSlot?: ReactNode
}

// Use botConfigFormSchema (plain, no preprocessing) for the RHF resolver.
// FormValues = what RHF stores (Zod input type, with optionals).
type FormValues = z.input<typeof botConfigFormSchema>

const baseConfigResolver = zodResolver(botConfigFormSchema)

// Commerce validation result state
type CommerceTestState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'ok'; count: number }
  | { status: 'error'; message: string }

const MAX_SUGGESTED_QUESTIONS = 6

// Quick-action type picker (dialog). 'text' and 'url' map to the prompt/url
// fields; 'handoff' and 'lead' become the typed `action` on the saved item.
type QaMode = 'text' | 'url' | 'handoff' | 'lead'

const QA_MODE_OPTIONS: { value: QaMode; title: string; description: string }[] = [
  { value: 'text', title: 'Send a message', description: 'Sends text to the bot' },
  { value: 'url', title: 'Open a link', description: 'Replies with a link button' },
  { value: 'handoff', title: 'Talk to a human', description: 'Requests a team member' },
  { value: 'lead', title: 'Get contact details', description: 'Opens the contact form' },
]

/** One-line description of what a saved quick action does (list rows). */
function qaSummary(f: { prompt?: string; url?: string; action?: SuggestedQuestionAction }): string {
  if (f.action === 'handoff') return 'Requests a human'
  if (f.action === 'lead') return 'Opens the contact form'
  if (f.url) return `Opens ${f.url}`
  if (f.prompt) return `Sends: ${f.prompt}`
  return 'Sends the title'
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
      <span className="flex size-7 shrink-0 items-center justify-center text-primary">
        <Icon className="size-5" aria-hidden="true" />
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
  businessHours: 'Working hours',
  start: 'Working hours start',
  end: 'Working hours end',
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
  maxLanguages = Infinity,
  canUseLeadCapture = true,
  canUseVoice = true,
  voiceLocked = false,
  onSave = saveConfig,
  headerAction,
  audience = 'owner',
  topSlot,
}: ConfigFormProps) {
  const router = useRouter()
  // Clients get a trimmed config — the owner manages the technical sections.
  const showAdvanced = audience === 'owner'
  const canUseMultiple = maxLanguages > 1
  // Internal bot name — lives outside the config schema, saved alongside it.
  const [name, setName] = useState(botName)
  const [savedName, setSavedName] = useState(botName)
  const [previewMounted, setPreviewMounted] = useState(false)
  // Quick-action add/edit dialog.
  const [qaOpen, setQaOpen] = useState(false)
  const [qaIndex, setQaIndex] = useState<number | null>(null)
  const [qaMode, setQaMode] = useState<QaMode>('text')
  const [qaDraft, setQaDraft] = useState({ label: '', prompt: '', url: '' })
  // Active language tab — drives which content.<lang> fields are shown + live preview.
  // Persisted to localStorage keyed by botId so it survives refresh.
  const lsKey = `cbz_cfg_lang_${botId}`

  // Start from the bot's default language on both server and first client render
  // (reading localStorage here would cause a hydration mismatch). The saved
  // language is applied in a mount effect below.
  const [activeLang, setActiveLang] = useState<BotLanguage>(
    (initialConfig.languages?.[0] as BotLanguage) ?? 'en',
  )

  useEffect(() => setPreviewMounted(true), [])

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
                action: (q as { action?: SuggestedQuestionAction }).action,
              },
        )
      }
    }
    if (cfg.showLanguageSelector === undefined) cfg.showLanguageSelector = false
    if (!cfg.proactiveGreeting) {
      cfg.proactiveGreeting = {
        enabled: false,
        delaySeconds: 3,
        frequency: 'once_per_session',
        messages: { en: [{ text: 'Hi! How can we help?' }] },
        backgroundColor: '#ffffff',
        textColor: '#111827',
        cornerRadius: 14,
        fontFamily: 'inherit',
      }
    }
    // Bots created before the working-hours field get the default on first edit.
    if (!cfg.businessHours) cfg.businessHours = { start: '08:00', end: '17:00' }

    // Clamp to the plan entitlement so a bot downgraded since it was last saved
    // (e.g. paid → free with 2 languages still stored) never loads with more
    // languages selected than it's allowed. Mirrors the server-side clamp in
    // publicBotConfig — leave the order untouched when nothing needs clamping.
    const cfgLanguages = (cfg.languages as BotLanguage[] | undefined) ?? ['en']
    if (maxLanguages < cfgLanguages.length) {
      const cfgDefaultLanguage = cfg.defaultLanguage as BotLanguage | undefined
      const primary =
        cfgDefaultLanguage && cfgLanguages.includes(cfgDefaultLanguage)
          ? cfgDefaultLanguage
          : (cfgLanguages[0] ?? 'en')
      const clamped = [primary, ...cfgLanguages.filter((l) => l !== primary)].slice(0, maxLanguages)
      cfg.languages = clamped
      if (!clamped.includes(cfg.defaultLanguage as BotLanguage)) cfg.defaultLanguage = clamped[0]
      if (clamped.length < 2) cfg.showLanguageSelector = false
    }
    return cfg as FormValues
  }, [initialConfig, maxLanguages])

  const form = useForm<FormValues>({
    resolver: (values, context, options) =>
      baseConfigResolver(normalizeLanguageSelection(values), context, options),
    defaultValues: initialFormValues,
    mode: 'onChange',
  })

  const {
    register,
    control,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors, isDirty, isSubmitting },
  } = form

  const watchedLanguages = watch('languages')
  const selectedLanguages = useMemo(
    () => (watchedLanguages ?? ['en']) as BotLanguage[],
    [watchedLanguages],
  )

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

  // Never leave the tab on a language that's no longer selected.
  useEffect(() => {
    if (!selectedLanguages.includes(activeLang)) selectLang(selectedLanguages[0] ?? 'en')
  }, [selectedLanguages, activeLang, selectLang])

  // Keep defaultLanguage a concrete, committed value. The select only *displays*
  // a fallback when it's unset, so without this it would persist as undefined and
  // the live widget would silently open in English regardless of enabled languages.
  const watchedDefaultLanguage = watch('defaultLanguage')
  useEffect(() => {
    if (!watchedDefaultLanguage || !selectedLanguages.includes(watchedDefaultLanguage)) {
      setValue('defaultLanguage', selectedLanguages[0] ?? 'en', { shouldDirty: false })
    }
  }, [watchedDefaultLanguage, selectedLanguages, setValue])

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

  const proactiveMessagesEn = useFieldArray({
    control,
    name: 'proactiveGreeting.messages.en',
  })
  const proactiveMessagesLt = useFieldArray({
    control,
    name: 'proactiveGreeting.messages.lt',
  })
  const activeProactiveMessages =
    activeLang === 'lt' ? proactiveMessagesLt : proactiveMessagesEn

  const setProactiveGreetingEnabled = (enabled: boolean) => {
    setValue('proactiveGreeting.enabled', enabled, { shouldDirty: true, shouldValidate: true })
    if (!enabled) return

    for (const lang of selectedLanguages) {
      const fieldArray = lang === 'lt' ? proactiveMessagesLt : proactiveMessagesEn
      if (!fieldArray.fields.length) {
        const seeded = {
          text: lang === 'lt' ? 'Sveiki! Kaip galime padėti?' : 'Hi! How can we help?',
        }
        fieldArray.replace([seeded])
      }
    }
  }

  const activeSuggestedField =
    activeLang === 'lt' ? suggestedQuestionsFieldLt : suggestedQuestionsFieldEn
  const suggestedCount = activeSuggestedField.fields.length

  // Open the quick-action dialog to add (index null) or edit an existing one.
  const openQuickAction = (index: number | null) => {
    if (index === null) {
      setQaDraft({ label: '', prompt: '', url: '' })
      setQaMode('text')
    } else {
      const f = activeSuggestedField.fields[index] as {
        label?: string
        prompt?: string
        url?: string
        action?: SuggestedQuestionAction
      }
      setQaDraft({ label: f.label ?? '', prompt: f.prompt ?? '', url: f.url ?? '' })
      setQaMode(f.action ?? (f.url ? 'url' : 'text'))
    }
    setQaIndex(index)
    setQaOpen(true)
  }

  const saveQuickAction = () => {
    const label = qaDraft.label.trim()
    if (!label) return
    // Exactly one behavior: text-to-send, url-to-open, or a typed action.
    const value = {
      label,
      prompt: qaMode === 'text' ? qaDraft.prompt.trim() : '',
      url: qaMode === 'url' ? qaDraft.url.trim() : '',
      action: qaMode === 'handoff' || qaMode === 'lead' ? qaMode : undefined,
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

  // Opening the LT tab seeds any missing fields so a partially-materialized
  // content.lt (from the field array mounting) never fails validation.
  const openLtTab = useCallback(() => {
    const ltContent = watch('content.lt')
    setValue(
      'content.lt',
      {
        greeting: ltContent?.greeting ?? '',
        suggestedQuestions: ltContent?.suggestedQuestions ?? [],
        fallbackMessage: ltContent?.fallbackMessage ?? '',
      },
      { shouldDirty: false },
    )
    selectLang('lt')
  }, [watch, setValue, selectLang])

  // Toggle a language in/out of the selection. On free (single) plans, selecting
  // replaces the current choice; on paid plans it adds/removes (min one).
  const toggleLanguage = useCallback(
    (lang: BotLanguage) => {
      const current = (watch('languages') ?? ['en']) as BotLanguage[]
      let next: BotLanguage[]
      if (!canUseMultiple) {
        next = [lang]
      } else if (current.includes(lang)) {
        next = current.filter((l) => l !== lang)
        if (next.length === 0) next = [lang] // never empty
      } else {
        next = [...current, lang]
      }
      setValue('languages', next, { shouldDirty: true })
      // Seed content for a newly-selected language so validation passes.
      if (next.includes('lt') && !current.includes('lt')) openLtTab()
      if (!current.includes(lang) && watch('proactiveGreeting.enabled')) {
        setValue(
          `proactiveGreeting.messages.${lang}`,
          [{ text: lang === 'lt' ? 'Sveiki! Kaip galime padėti?' : 'Hi! How can we help?' }],
          { shouldDirty: true, shouldValidate: true },
        )
      }
      if (!next.includes(activeLang)) selectLang(next[0])
    },
    [watch, setValue, canUseMultiple, openLtTab, activeLang, selectLang],
  )

  const onSubmit = useCallback(
    async (values: FormValues) => {
      try {
        const result = await onSave(botId, normalizeLanguageSelection(values), name.trim())
        if (result.success) {
          reset(values)
          setSavedName(name.trim())
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
    [botId, name, onSave, reset, router],
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
  const hasChanges = isDirty || name.trim() !== savedName.trim()

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
    richResponses: watchedValues.richResponses,
    leadCapture: watchedValues.leadCapture,
    allowedDomains: watchedValues.allowedDomains,
    avatarUrl: watchedValues.avatarUrl,
    botAvatarUrl: watchedValues.botAvatarUrl,
    privacyUrl: watchedValues.privacyUrl,
    languages: selectedLanguages,
    defaultLanguage: watchedValues.defaultLanguage,
    showLanguageSelector: watchedValues.showLanguageSelector ?? false,
    content: watchedValues.content,
    commerce: watchedValues.commerce,
    proactiveGreeting: watchedValues.proactiveGreeting,
  }

  return (
    <div className="flex h-full min-h-0 overflow-hidden">
      {/* ── Config panel — fixed ~half width, scrolls internally ── */}
      <ResizablePanel defaultFraction={0.5} defaultWidth={480} min={380} max={1100} resizable={false}>
        <form onSubmit={handleSubmit(onSubmit, onInvalid)} className="pb-10">

        {topSlot}

        {/* Sticky toolbar — title + always-visible Save (fixed height so the
            section headers below can pin exactly beneath it). */}
        <div className="sticky top-0 z-20 flex h-16 items-center justify-between gap-3 border-b bg-card/95 px-5 backdrop-blur">
          <div>
            <h2 className="text-base font-semibold leading-tight">Configuration</h2>
            <p className="text-xs text-muted-foreground">Changes go live when you save.</p>
          </div>
          <div className="flex items-center gap-3">
            {headerAction != null && (
              <span key="header-action" className="contents">
                {headerAction}
              </span>
            )}
            <Button type="submit" size="lg" disabled={isSubmitting || !hasChanges} className="px-4">
              <SaveIcon data-icon="inline-start" />
              {isSubmitting ? 'Publishing…' : 'Save & Publish'}
            </Button>
          </div>
        </div>

        {/* ── Display ── */}
        <CollapsibleSection defaultOpen header={<SectionHeader
              icon={MonitorIcon}
              title="Display"
              description="Bot name and avatar shown to visitors."
            />}>
          <CardContent className="flex flex-col gap-3 bg-muted/70 py-3">
            <SettingsGroup title="Names and introduction" description="How this bot is identified in the dashboard and widget.">
              <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5 sm:col-span-2">
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
            </div>
              </div>
            </SettingsGroup>

            <SettingsGroup title="Brand imagery" description="Choose the images visitors see in the header and conversation.">
              <div className="grid gap-4 sm:grid-cols-2">
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
              description="Shown next to replies"
            />
              </div>
            </SettingsGroup>

            <SettingsGroup title="Privacy and availability" description="Set the consent link and hours used by reporting.">
              <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <InfoLabel
                htmlFor="privacyUrl"
                label="Privacy policy URL (optional)"
                tooltip="When set, the widget shows a short consent line linking to it."
              />
              <Input
                id="privacyUrl"
                {...register('privacyUrl')}
                placeholder="https://yourstore.com/privacy"
              />
            </div>

            <div className="space-y-1.5">
              <InfoLabel
                htmlFor="businessHoursStart"
                label="Working hours"
                tooltip="Mon–Fri. Analytics uses this to show how many conversations the bot handles after hours."
              />
              <div className="flex items-center gap-2">
                <Input
                  id="businessHoursStart"
                  type="time"
                  className="w-32"
                  {...register('businessHours.start')}
                />
                <span className="text-sm text-muted-foreground">–</span>
                <Input
                  id="businessHoursEnd"
                  type="time"
                  className="w-32"
                  aria-label="Working hours end"
                  {...register('businessHours.end')}
                />
              </div>
            </div>
              </div>
            </SettingsGroup>
          </CardContent>
        </CollapsibleSection>

        {/* ── Language & Content ── */}
        <CollapsibleSection header={<SectionHeader
              icon={LanguagesIcon}
              title="Language & content"
              description="Greeting, suggested questions, and fallback message — per language."
            />}>
          <CardContent className="flex flex-col gap-3 bg-muted/70 py-3">
            <SettingsGroup title="Language setup" description="Choose available languages and the visitor’s default experience.">
            {/* Available languages — which languages visitors can use. */}
            <div className="space-y-1.5">
              <Label>Available languages</Label>
              <Popover>
                <PopoverTrigger
                  render={
                    <Button
                      type="button"
                      variant="outline"
                      className="h-10 w-full max-w-xs justify-between px-3 font-normal"
                    />
                  }
                >
                  <span className="truncate">
                    {selectedLanguages.map((lang) => languageMeta(lang).label).join(', ')}
                  </span>
                  <ChevronDownIcon data-icon="inline-end" />
                </PopoverTrigger>
                <PopoverContent align="start" className="w-72 gap-1 p-1.5">
                  {SUPPORTED_LANGUAGES.map((language) => {
                    const selected = selectedLanguages.includes(language.code)
                    return (
                      <label
                        key={language.code}
                        className="flex min-h-10 cursor-pointer items-center gap-3 rounded-md px-2.5 py-2 text-sm transition-colors hover:bg-accent"
                      >
                        <Checkbox
                          checked={selected}
                          onCheckedChange={() => toggleLanguage(language.code)}
                          aria-label={`${selected ? 'Remove' : 'Add'} ${language.label}`}
                        />
                        <span aria-hidden="true">{language.flag}</span>
                        <span className="flex-1">{language.label}</span>
                        {selected ? <span className="text-xs text-muted-foreground">Selected</span> : null}
                      </label>
                    )
                  })}
                </PopoverContent>
              </Popover>
              {!canUseMultiple && (
                <p className="text-xs text-muted-foreground">
                  Your plan includes one language. Pick the one you want —{' '}
                  <a href="/app/subscription" className="text-primary hover:underline">
                    upgrade to offer more
                  </a>
                  .
                </p>
              )}
            </div>

            <div className="mt-5 space-y-4">
              <div className="space-y-1.5">
                <Label>Primary language</Label>
                <Controller
                  name="defaultLanguage"
                  control={control}
                  render={({ field }) => (
                    <Select
                      value={field.value ?? selectedLanguages[0] ?? 'en'}
                      onValueChange={field.onChange}
                      disabled={!canUseMultiple || selectedLanguages.length < 2}
                    >
                      <SelectTrigger className="w-full max-w-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {selectedLanguages.map((l) => (
                          <SelectItem key={l} value={l}>
                            {languageMeta(l).label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
                <p className="text-xs text-muted-foreground">
                  The language the widget opens in for visitors.
                </p>
              </div>

              <div className="flex items-center gap-2.5">
                <Controller
                  name="showLanguageSelector"
                  control={control}
                  render={({ field }) => (
                    <Switch
                      checked={(field.value ?? false) && selectedLanguages.length > 1}
                      onCheckedChange={field.onChange}
                      id="showLanguageSelector"
                      size="sm"
                      disabled={!canUseMultiple || selectedLanguages.length < 2}
                    />
                  )}
                />
                <Label htmlFor="showLanguageSelector" className="text-sm font-normal cursor-pointer">
                  Let visitors switch language
                </Label>
              </div>
              <p className="-mt-2 text-xs text-muted-foreground">
                {selectedLanguages.length < 2
                  ? 'Add a second language to let visitors switch.'
                  : 'Shows a flag button in the widget header. Off = the widget stays in the primary language.'}
              </p>
            </div>
            </SettingsGroup>

            {/* Per-language content fields */}
            <SettingsGroup title={`Widget content · ${languageMeta(activeLang).label}`} description="Edit the welcome copy and actions for the selected language.">
            <div className="space-y-4 pt-1">
              {selectedLanguages.length > 1 ? (
                <div className="flex w-fit items-center gap-1 rounded-lg bg-muted p-1" aria-label="Language to edit">
                  {selectedLanguages.map((lang) => (
                    <button
                      key={lang}
                      type="button"
                      onClick={() => selectLang(lang)}
                      className={cn(
                        'rounded-md px-3 py-1.5 text-sm font-medium transition-all',
                        activeLang === lang
                          ? 'bg-background text-foreground shadow-sm'
                          : 'text-muted-foreground hover:text-foreground',
                      )}
                      aria-pressed={activeLang === lang}
                    >
                      {languageMeta(lang).label}
                    </button>
                  ))}
                </div>
              ) : null}
              {/* Greeting */}
              <div className="space-y-1.5">
                <Label htmlFor={`greeting-${activeLang}`}>
                  Greeting message
                  <span className="ml-1.5 text-xs text-muted-foreground font-normal">
                    ({languageMeta(activeLang).label})
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
                    ({languageMeta(activeLang).label}, max {MAX_SUGGESTED_QUESTIONS})
                  </span>
                </Label>
                <p className="text-xs text-muted-foreground">
                  Buttons shown on the welcome screen. Each sends a message, opens a link,
                  requests a human, or opens the contact form.
                </p>

                {/* One-click suggestions, prefilled in the active language */}
                <div className="space-y-1.5 rounded-lg border border-dashed p-2.5">
                  <p className="text-xs font-medium text-muted-foreground">Suggestions</p>
                  {QUICK_ACTION_SUGGESTIONS.map((group) => (
                    <div key={group.id} className="flex flex-wrap items-center gap-1.5">
                      <span className="w-20 shrink-0 text-[11px] text-muted-foreground">
                        {group.title}
                      </span>
                      {group.suggestions.map((s) => {
                        const leadOff = s.action === 'lead' && !leadCaptureEnabled
                        const disabled =
                          suggestedCount >= MAX_SUGGESTED_QUESTIONS || leadOff
                        return (
                          <button
                            key={s.id}
                            type="button"
                            disabled={disabled}
                            title={
                              leadOff
                                ? 'Enable lead capture below to use this'
                                : `Add “${s.label[activeLang] ?? s.label.en}”`
                            }
                            onClick={() =>
                              activeSuggestedField.append(buildQuickAction(s, activeLang))
                            }
                            className="inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs transition-colors hover:border-primary hover:text-primary disabled:pointer-events-none disabled:opacity-40"
                          >
                            <PlusIcon className="size-3" aria-hidden="true" />
                            {s.label[activeLang] ?? s.label.en}
                          </button>
                        )
                      })}
                    </div>
                  ))}
                </div>

                <div className="space-y-2">
                  {activeSuggestedField.fields.map((field, index) => {
                    const f = field as {
                      id: string
                      label?: string
                      prompt?: string
                      url?: string
                      action?: SuggestedQuestionAction
                    }
                    const summary = qaSummary(f)
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

                    {/* Action type picker */}
                    <div className="space-y-1.5">
                      <Label>When clicked</Label>
                      <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label="Action type">
                        {QA_MODE_OPTIONS.map((opt) => {
                          const leadOff = opt.value === 'lead' && !leadCaptureEnabled
                          return (
                            <button
                              key={opt.value}
                              type="button"
                              role="radio"
                              aria-checked={qaMode === opt.value}
                              disabled={leadOff}
                              onClick={() => setQaMode(opt.value)}
                              className={cn(
                                'rounded-lg border p-2.5 text-left transition-colors',
                                qaMode === opt.value
                                  ? 'border-primary bg-primary/5'
                                  : 'hover:border-muted-foreground/40',
                                leadOff && 'pointer-events-none opacity-40',
                              )}
                            >
                              <p className="text-sm font-medium leading-tight">{opt.title}</p>
                              <p className="mt-0.5 text-xs text-muted-foreground">{opt.description}</p>
                            </button>
                          )
                        })}
                      </div>
                      {!leadCaptureEnabled && (
                        <p className="text-xs text-muted-foreground">
                          “Get contact details” needs lead capture enabled (see the Lead capture
                          section).
                        </p>
                      )}
                    </div>

                    {qaMode === 'text' && (
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
                    )}
                    {qaMode === 'url' && (
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
                    {qaMode === 'handoff' && (
                      <p className="text-xs text-muted-foreground">
                        Connects the visitor to your team — the same flow as the
                        “Talk to a person” button, even when that button is hidden.
                      </p>
                    )}
                    {qaMode === 'lead' && (
                      <p className="text-xs text-muted-foreground">
                        Opens the contact form so the visitor can leave their details.
                      </p>
                    )}
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
                    ({languageMeta(activeLang).label})
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

            </div>
            </SettingsGroup>
          </CardContent>
        </CollapsibleSection>

        {/* ── Theme ── */}
        <CollapsibleSection header={<SectionHeader
              icon={PaletteIcon}
              title="Appearance"
              description="Make the widget feel at home on your website."
            />}>
          <CardContent className="flex flex-col gap-3 bg-muted/70 py-3">
            <SettingsGroup
              title="Choose a starting point"
              description="Apply a complete look, then fine-tune only what you need."
            >
              <ThemePresetPicker watch={watch} setValue={setValue} />
            </SettingsGroup>

            <SettingsGroup
              title="Color palette"
              description="The four colors that define most of the widget."
            >
              <div className="grid gap-2 sm:grid-cols-2">
                <ColorField control={control} name="theme.primaryColor" label="Brand color" swatchDefault="#4f46e5" clearable={false} description="Buttons and user bubbles" />
                <ColorField control={control} name="theme.backgroundColor" label="Chat background" swatchDefault="#ffffff" clearable={false} description="Conversation canvas" />
                <ColorField control={control} name="theme.botBubbleColor" label="Assistant messages" swatchDefault="#f3f4f6" defaultLabel="Soft grey" description="Bot reply bubbles" />
                <ColorField control={control} name="theme.launcherColor" label="Launcher" swatchDefault={watch('theme.primaryColor') || '#4f46e5'} defaultLabel="Uses brand color" description="Floating chat button" />
              </div>
              <AdvancedColorFields
                control={control}
                primaryColor={watch('theme.primaryColor') || '#4f46e5'}
                voiceEnabled={watch('voice.enabled') ?? false}
              />
            </SettingsGroup>

            <SettingsGroup
              title="Shape"
              description="Adjust the widget’s visual softness."
            >
              <div className="grid gap-3 sm:grid-cols-2">
                <SliderField label="Window corners"><Controller control={control} name="theme.cornerRadius" render={({ field }) => (
                  <Scrubber size="sm" showLabel={false} label="Window corners" min={0} max={32} step={1} decimals={0} suffix="px" value={field.value ?? 16} onValueChange={field.onChange} />
                )} /></SliderField>
                <SliderField label="Message corners"><Controller control={control} name="theme.bubbleRadius" render={({ field }) => (
                  <Scrubber size="sm" showLabel={false} label="Message corners" min={0} max={24} step={1} decimals={0} suffix="px" value={field.value ?? 16} onValueChange={field.onChange} />
                )} /></SliderField>
                <SliderField label="Button corners"><Controller control={control} name="theme.navButtonRadius" render={({ field }) => (
                  <Scrubber size="sm" showLabel={false} label="Button corners" min={0} max={24} step={1} decimals={0} suffix="px" value={field.value ?? 12} onValueChange={field.onChange} />
                )} /></SliderField>
                <SliderField label="Message border"><Controller control={control} name="theme.bubbleBorderWidth" render={({ field }) => (
                  <Scrubber size="sm" showLabel={false} label="Message border width" min={0} max={6} step={1} decimals={0} suffix="px" value={field.value ?? 0} onValueChange={field.onChange} />
                )} /></SliderField>
              </div>
            </SettingsGroup>

            <SettingsGroup
              title="Launcher"
              description="The button visitors use to open chat."
            >
              <div className="flex flex-col gap-3">
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="flex flex-col gap-1.5">
                    <Label>Position</Label>
                    <Controller name="theme.position" control={control} render={({ field }) => (
                      <Select value={field.value} onValueChange={field.onChange}>
                        <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                        <SelectContent><SelectGroup>
                          <SelectItem value="bottom-right">Bottom right</SelectItem>
                          <SelectItem value="bottom-left">Bottom left</SelectItem>
                        </SelectGroup></SelectContent>
                      </Select>
                    )} />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <Label>Style</Label>
                    <Controller name="theme.launcherStyle" control={control} render={({ field }) => (
                      <Select value={field.value ?? 'circle'} onValueChange={field.onChange}>
                        <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                        <SelectContent><SelectGroup>
                          <SelectItem value="circle">Circle</SelectItem>
                          <SelectItem value="pill">Pill with text</SelectItem>
                        </SelectGroup></SelectContent>
                      </Select>
                    )} />
                  </div>
                </div>
                {watch('theme.launcherStyle') === 'pill' && (
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="launcherLabel">Button text</Label>
                    <Input id="launcherLabel" {...register('theme.launcherLabel')} placeholder="Chat with us" />
                  </div>
                )}
                <div className="grid gap-2 sm:grid-cols-2">
                  <CompactToggle label="Use company logo" description="Replace the chat icon">
                    <Controller name="theme.launcherShowLogo" control={control} render={({ field }) => (
                      <Switch aria-label="Use company logo" checked={field.value ?? false} onCheckedChange={field.onChange} />
                    )} />
                  </CompactToggle>
                  <CompactToggle label="Pulse effect" description="Draw attention gently">
                    <Controller name="theme.launcherPulse" control={control} render={({ field }) => (
                      <Switch aria-label="Pulse effect" checked={field.value ?? false} onCheckedChange={field.onChange} disabled={watch('theme.launcherStyle') === 'pill'} />
                    )} />
                  </CompactToggle>
                </div>
              </div>
            </SettingsGroup>

            <SettingsGroup
              title="Greeting prompt"
              description="Invite visitors to start a conversation."
              action={
                <Controller name="proactiveGreeting.enabled" control={control} render={({ field }) => (
                  <Switch aria-label="Enable greeting prompt" checked={field.value ?? false} onCheckedChange={setProactiveGreetingEnabled} />
                )} />
              }
            >
              {watch('proactiveGreeting.enabled') ? (
                <div className="flex flex-col gap-4">
                  <div className="flex flex-col gap-2">
                    <div>
                      <p className="text-sm font-medium">Messages <span className="font-normal text-muted-foreground">· {languageMeta(activeLang).label}</span></p>
                      <p className="text-xs text-muted-foreground">One variant is chosen randomly when the greeting appears.</p>
                    </div>
                    {activeProactiveMessages.fields.map((field, index) => (
                      <div key={field.id} className="flex items-start gap-2">
                        <Textarea
                          aria-label={`Greeting variant ${index + 1}`}
                          {...register(`proactiveGreeting.messages.${activeLang}.${index}.text`)}
                          defaultValue={(field as { text?: string }).text ?? ''}
                          maxLength={160}
                          rows={2}
                          className="min-h-16"
                          placeholder={activeLang === 'lt' ? 'Sveiki! Kaip galime padėti?' : 'Hi! How can we help?'}
                        />
                        <Button type="button" variant="ghost" size="icon" onClick={() => activeProactiveMessages.remove(index)} disabled={activeProactiveMessages.fields.length === 1} aria-label={`Remove greeting variant ${index + 1}`}>
                          <TrashIcon />
                        </Button>
                      </div>
                    ))}
                    <Button type="button" variant="outline" size="sm" className="self-start" onClick={() => activeProactiveMessages.append({ text: '' })} disabled={activeProactiveMessages.fields.length >= 5}>
                      <PlusIcon data-icon="inline-start" /> Add another
                    </Button>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="flex flex-col gap-1.5">
                      <Label>Show</Label>
                      <Controller name="proactiveGreeting.frequency" control={control} render={({ field }) => (
                        <Select value={field.value ?? 'once_per_session'} onValueChange={field.onChange}>
                          <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                          <SelectContent><SelectGroup>
                            <SelectItem value="once_per_session">Once per session</SelectItem>
                            <SelectItem value="every_page">On every page</SelectItem>
                          </SelectGroup></SelectContent>
                        </Select>
                      )} />
                    </div>
                    <SliderField label="Delay time"><Controller control={control} name="proactiveGreeting.delaySeconds" render={({ field }) => (
                      <Scrubber size="sm" showLabel={false} label="Delay time" min={0} max={30} step={1} decimals={0} suffix="s" value={field.value ?? 3} onValueChange={field.onChange} />
                    )} /></SliderField>
                    <ColorField control={control} name="proactiveGreeting.backgroundColor" label="Greeting background" swatchDefault="#ffffff" clearable={false} description="Prompt surface" />
                    <ColorField control={control} name="proactiveGreeting.textColor" label="Greeting text" swatchDefault="#111827" clearable={false} description="Prompt copy" />
                    <div className="flex flex-col gap-1.5">
                      <Label>Font</Label>
                      <Controller name="proactiveGreeting.fontFamily" control={control} render={({ field }) => (
                        <Select value={field.value ?? 'inherit'} onValueChange={field.onChange}>
                          <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                          <SelectContent><SelectGroup>
                            <SelectItem value="inherit">Same as chat</SelectItem>
                            {FONT_OPTIONS.map((font) => <SelectItem key={font.value} value={font.value} style={{ fontFamily: font.stack }}>{font.label}</SelectItem>)}
                          </SelectGroup></SelectContent>
                        </Select>
                      )} />
                    </div>
                    <SliderField label="Corner radius"><Controller control={control} name="proactiveGreeting.cornerRadius" render={({ field }) => (
                      <Scrubber size="sm" showLabel={false} label="Greeting corner radius" min={0} max={24} step={1} decimals={0} suffix="px" value={field.value ?? 14} onValueChange={field.onChange} />
                    )} /></SliderField>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">Turn this on to configure messages, timing, and styling.</p>
              )}
            </SettingsGroup>

            <SettingsGroup
              title="Chat surface"
              description="Typography, imagery, and in-chat controls."
            >
              <div className="flex flex-col gap-4">
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="flex flex-col gap-1.5">
                    <Label>Chat font</Label>
                    <Controller name="theme.fontFamily" control={control} render={({ field }) => (
                      <Select value={field.value ?? 'geist'} onValueChange={field.onChange}>
                        <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                        <SelectContent><SelectGroup>
                          {FONT_OPTIONS.map((font) => <SelectItem key={font.value} value={font.value} style={{ fontFamily: font.stack }}>{font.label}</SelectItem>)}
                        </SelectGroup></SelectContent>
                      </Select>
                    )} />
                  </div>
                  <p className="flex items-end pb-1 text-sm text-muted-foreground" style={{ fontFamily: fontStack(watch('theme.fontFamily')) }}>The quick brown fox jumps over the lazy dog.</p>
                </div>
                <div className="grid gap-2 sm:grid-cols-2">
                  <CompactToggle label="Glass bubbles" description="Frosted message surfaces">
                    <Controller name="theme.glassBubbles" control={control} render={({ field }) => (
                      <Switch aria-label="Glass bubbles" checked={field.value ?? false} onCheckedChange={field.onChange} />
                    )} />
                  </CompactToggle>
                  <CompactToggle label="Human handoff" description="Show talk-to-a-person option">
                    <Controller name="theme.showHandoffButton" control={control} render={({ field }) => (
                      <Switch aria-label="Human handoff" checked={field.value ?? true} onCheckedChange={field.onChange} />
                    )} />
                  </CompactToggle>
                </div>
                <LogoUpload botId={botId} control={control} setValue={setValue} name="theme.backgroundImageUrl" label="Chat background image (optional)" filePrefix="bg" description="Shown behind the conversation." />
                {watch('theme.backgroundImageUrl') ? (
                  <Controller control={control} name="theme.backgroundImageOpacity" render={({ field }) => (
                    <Scrubber size="sm" label="Image opacity" min={0} max={100} step={1} decimals={0} suffix="%" value={field.value ?? 100} onValueChange={field.onChange} />
                  )} />
                ) : null}
                <LogoUpload botId={botId} control={control} setValue={setValue} name="theme.sendIconUrl" label="Send button icon (optional)" description="Replaces the default arrow in the composer." filePrefix="sendicon" />
              </div>
            </SettingsGroup>
          </CardContent>
        </CollapsibleSection>

        {/* ── AI Behaviour ── */}
        {showAdvanced && (<>
        <CollapsibleSection header={<SectionHeader
              icon={SparklesIcon}
              title="AI behaviour"
              description="System prompt and persona."
            />}>
          <CardContent className="flex flex-col gap-3 bg-muted/70 py-3">
            <SettingsGroup title="Core instructions" description="Define the assistant’s role, knowledge boundaries, and priorities.">
              <SystemPromptSelect watch={watch} setValue={setValue} errors={errors} />
            </SettingsGroup>

            <SettingsGroup title="Response style" description="Control how answers sound and how much structure they use.">
            <div className="flex items-center justify-between gap-4 rounded-xl bg-muted/60 px-3 py-2.5">
              <div className="space-y-0.5">
                <Label htmlFor="richResponses">Request rich responses</Label>
                <p className="text-xs text-muted-foreground">
                  Asks the AI to format answers with bold, bullet/numbered lists, and links so
                  they render as rich text in the chat bubble.
                </p>
              </div>
              <Controller
                name="richResponses"
                control={control}
                render={({ field }) => (
                  <Switch
                    id="richResponses"
                    checked={field.value ?? true}
                    onCheckedChange={field.onChange}
                  />
                )}
              />
            </div>

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
            </SettingsGroup>
          </CardContent>
        </CollapsibleSection>
        </>)}

        {/* ── Voice ── (clients see it too; TTS/STT toggles are owner-only) */}
        <VoiceSection
          control={control}
          watch={watch}
          setValue={setValue}
          activeLang={activeLang}
          enabledLanguages={selectedLanguages}
          canUseVoice={canUseVoice}
          voiceLocked={voiceLocked}
          audience={audience}
        />

        {/* ── Lead Capture ── */}
        <CollapsibleSection header={<SectionHeader
              icon={UserPlusIcon}
              title="Lead capture"
              description="Collect visitor contact information during the conversation."
            />}>
          <CardContent className="flex flex-col gap-3 bg-muted/70 py-3">
            <SettingsGroup title="Capture status" description="Invite visitors to leave contact details when the conversation needs a follow-up.">
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
            </SettingsGroup>

            {leadCaptureEnabled && (
              <SettingsGroup title="Trigger and form" description="Choose when the form appears and which details it requests.">
              <div className="space-y-4">
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
              </SettingsGroup>
            )}
          </CardContent>
        </CollapsibleSection>

        {/* ── Store / Products ── */}
        <CommerceSection control={control} watch={watch} botId={botId} />

        {/* ── Allowed Domains (Advanced) ── */}
        <CollapsibleSection header={<SectionHeader
              icon={ShieldIcon}
              title="Allowed domains"
              description="Choose which websites can embed this widget."
            />}>
          <CardContent className="flex flex-col gap-3 bg-muted/70 py-3">
            <SettingsGroup title="Embedding access" description="Allow the widget everywhere, or limit it to trusted websites.">
            <div className="space-y-3">
            {allowedDomainsField.fields.length === 0 && (
              <div className="flex items-start gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-800 dark:text-amber-300">
                <ShieldIcon className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
                <span>
                  Your widget can currently be embedded on <strong>any</strong> website. Add your
                  domain to restrict it to your own site and protect your conversation usage.
                </span>
              </div>
            )}
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
              A bare domain works best (e.g. <code>example.com</code>); www and https:// are handled
              automatically.
            </p>
            </div>
            </SettingsGroup>
          </CardContent>
        </CollapsibleSection>

        </form>
      </ResizablePanel>

      {/* ── Live Preview canvas. The widget itself is portaled to <body> so it
          can sit between a color dialog's backdrop and content layers. ── */}
      <div
        className="relative flex-1 min-w-0 overflow-hidden bg-dots"
        aria-hidden="true"
      />
      {previewMounted
        ? createPortal(
          <div
            className="pointer-events-none fixed bottom-6 right-6 z-[45]"
            aria-label="Live preview"
            role="complementary"
          >
          <TestChat botId={botId} config={liveConfig} activeLang={activeLang} />
          </div>,
          document.body,
        )
        : null}
    </div>
  )
}

// -------------------------------------------------------------------------
// SystemPromptSelect — pick a reusable prompt from the owner's library
// -------------------------------------------------------------------------
function SystemPromptSelect({
  watch,
  setValue,
  errors,
}: {
  watch: UseFormWatch<FormValues>
  setValue: UseFormSetValue<FormValues>
  errors: FieldErrors<FormValues>
}) {
  const [prompts, setPrompts] = useState<Pick<SystemPrompt, 'id' | 'name' | 'content'>[]>([])
  const [loaded, setLoaded] = useState(false)
  const selectedId = watch('systemPromptId')
  const currentContent = watch('systemPrompt') ?? ''

  useEffect(() => {
    let cancelled = false
    const supabase = createBrowserClient()
    supabase
      .from('system_prompts')
      .select('id, name, content')
      .order('created_at', { ascending: false })
      .then(({ data }) => {
        if (!cancelled) {
          setPrompts((data ?? []) as Pick<SystemPrompt, 'id' | 'name' | 'content'>[])
          setLoaded(true)
        }
      })
    return () => {
      cancelled = true
    }
  }, [])

  const isCustom = !selectedId && currentContent.trim().length > 0
  const pick = (id: string | null) => {
    const p = prompts.find((x) => x.id === id)
    if (!p) return
    setValue('systemPromptId', p.id, { shouldDirty: true })
    setValue('systemPrompt', p.content, { shouldDirty: true, shouldValidate: true })
  }

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <Label>System prompt</Label>
        <a
          href="/owner/prompts"
          target="_blank"
          rel="noreferrer"
          className="text-xs text-primary hover:underline"
        >
          Manage prompts →
        </a>
      </div>

      {/* `null` (never `undefined`) keeps the Select controlled for its lifetime. */}
      <Select value={selectedId ?? null} onValueChange={pick}>
        <SelectTrigger className="w-full">
          <SelectValue
            placeholder={
              loaded && prompts.length === 0
                ? 'No prompts yet — create one first'
                : 'Choose a system prompt'
            }
          />
        </SelectTrigger>
        <SelectContent>
          {prompts.map((p) => (
            <SelectItem key={p.id} value={p.id}>
              {p.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {loaded && prompts.length === 0 && (
        <p className="text-xs text-muted-foreground">
          Create prompts in{' '}
          <a href="/owner/prompts" target="_blank" rel="noreferrer" className="text-primary hover:underline">
            System prompts
          </a>
          , then pick one here.
        </p>
      )}
      {isCustom && (
        <p className="text-xs text-amber-600">
          This bot uses a custom prompt that isn&apos;t in your library. Pick one above to replace it.
        </p>
      )}
      {currentContent.trim() && (
        <div className="max-h-40 overflow-y-auto whitespace-pre-wrap rounded-md border bg-muted/30 p-2 font-mono text-xs text-muted-foreground">
          {currentContent.slice(0, 1200)}
          {currentContent.length > 1200 ? '…' : ''}
        </div>
      )}
      {errors.systemPrompt && <p className="text-xs text-destructive">{errors.systemPrompt.message}</p>}
    </div>
  )
}

// -------------------------------------------------------------------------
// CommerceSection — "Store / products" card
// -------------------------------------------------------------------------
interface CommerceSectionProps {
  control: Control<FormValues>
  watch: UseFormWatch<FormValues>
  botId: string
}

function CommerceSection({ control, watch, botId }: CommerceSectionProps) {
  const commerceEnabled = watch('commerce.enabled')
  const provider = watch('commerce.provider') ?? 'woocommerce'
  const storeUrl = watch('commerce.storeUrl') ?? ''
  const shopifyDomain = watch('commerce.shopifyDomain') ?? ''
  const shopifyToken = watch('commerce.shopifyToken') ?? ''
  const restKey = watch('commerce.restKey') ?? ''
  const restSecret = watch('commerce.restSecret') ?? ''
  const magentoToken = watch('commerce.magentoToken') ?? ''
  const feedUrl = watch('commerce.feedUrl') ?? ''
  const discountEnabled = watch('commerce.discount.enabled')
  const [testState, setTestState] = useState<CommerceTestState>({ status: 'idle' })
  const [orderTest, setOrderTest] = useState<{
    status: 'idle' | 'loading' | 'ok' | 'error'
    message?: string
  }>({ status: 'idle' })
  const [syncState, setSyncState] = useState<{
    status: 'idle' | 'loading' | 'ok' | 'error'
    synced?: number
    message?: string
  }>({ status: 'idle' })
  const [syncProgress, setSyncProgress] = useState<{
    phase: string
    processed: number
    total: number
  } | null>(null)
  // Current index status: how much of the store's catalog is indexed + when.
  const [indexInfo, setIndexInfo] = useState<{
    indexed: number
    storeTotal: number
    lastSyncedAt: string | null
  } | null>(null)
  const refreshIndexInfo = useCallback(async () => {
    try {
      const res = await fetch(`/api/products/sync?botId=${botId}`)
      if (res.ok) setIndexInfo(await res.json())
    } catch {
      /* status is decorative — never block the form on it */
    }
  }, [botId])
  useEffect(() => {
    if (commerceEnabled && provider !== 'feed') void refreshIndexInfo()
  }, [commerceEnabled, provider, refreshIndexInfo])

  const handleSync = useCallback(async () => {
    setSyncState({ status: 'loading' })
    setSyncProgress({ phase: 'fetching', processed: 0, total: 0 })

    // Poll the sync status row for live progress while the request runs.
    const supabase = createBrowserClient()
    let polling = true
    const poll = async () => {
      while (polling) {
        const { data } = await supabase
          .from('catalog_sync_status')
          .select('phase, processed, total')
          .eq('bot_id', botId)
          .single<{ phase: string; processed: number; total: number }>()
        if (data) {
          setSyncProgress({ phase: data.phase, processed: data.processed, total: data.total })
          if (data.phase === 'done' || data.phase === 'error') break
        }
        await new Promise((r) => setTimeout(r, 1500))
      }
    }
    void poll()

    try {
      const res = await fetch('/api/products/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ botId }),
      })
      const data = (await res.json()) as { synced?: number; error?: string }
      if (res.ok) {
        setSyncState({ status: 'ok', synced: data.synced ?? 0 })
        void refreshIndexInfo()
      } else setSyncState({ status: 'error', message: data.error ?? 'Sync failed.' })
    } catch {
      setSyncState({ status: 'error', message: 'Network error — please try again.' })
    } finally {
      polling = false
      setSyncProgress(null)
    }
  }, [botId, refreshIndexInfo])

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
    provider === 'shopify'
      ? Boolean(shopifyDomain.trim() && shopifyToken.trim())
      : provider === 'feed'
        ? Boolean(feedUrl.trim())
        : Boolean(storeUrl.trim())

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
          : provider === 'feed'
            ? { provider, feedUrl: feedUrl.trim() }
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
  }, [provider, storeUrl, shopifyDomain, shopifyToken, feedUrl, testReady])

  // Reset test state when the connection inputs change.
  const connKey = `${provider}:${storeUrl}:${shopifyDomain}:${shopifyToken}:${feedUrl}`
  const prevConnRef = useRef(connKey)
  if (prevConnRef.current !== connKey) {
    prevConnRef.current = connKey
    if (testState.status !== 'idle') setTestState({ status: 'idle' })
  }

  return (
    <CollapsibleSection header={<SectionHeader
          icon={ShoppingBagIcon}
          title="Store / products"
          description="Connect your store so the bot can recommend products."
        />}>
      <CardContent className="flex flex-col gap-3 bg-muted/70 py-3">
        <SettingsGroup title="Integration status" description="Connect a catalog when you want the assistant to recommend live products.">
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
        </SettingsGroup>

        {commerceEnabled && (
          <SettingsGroup title="Store connection" description="Choose a provider, verify access, and keep product search up to date.">
          <div className="space-y-4">
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
                      <SelectItem value="feed">Product feed (XML / CSV / JSON)</SelectItem>
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

            {/* Feed: product feed URL */}
            {provider === 'feed' && (
              <div className="space-y-1.5">
                <Label htmlFor="commerceFeedUrl">Product feed URL</Label>
                <Controller
                  name="commerce.feedUrl"
                  control={control}
                  render={({ field }) => (
                    <Input
                      id="commerceFeedUrl"
                      value={field.value ?? ''}
                      onChange={field.onChange}
                      onBlur={field.onBlur}
                      placeholder="https://yourstore.com/feed/products.xml"
                      autoComplete="url"
                      inputMode="url"
                      className="font-mono text-sm"
                    />
                  )}
                />
                <p className="text-xs text-muted-foreground">
                  A Google Shopping / RSS XML, CSV, or JSON product feed. Use this when your store&apos;s
                  live API isn&apos;t available (e.g. a locked-down Magento). Order lookup isn&apos;t available
                  with a feed.
                </p>
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

            {/* Semantic catalog index — WooCommerce/Shopify/Magento (feed has no live price/stock API) */}
            {provider !== 'feed' && (
              <div className="space-y-2 rounded-lg border p-4">
                <div className="flex items-center justify-between gap-3 flex-wrap">
                  <div>
                    <p className="text-sm font-medium">Smart product search</p>
                    <p className="text-xs text-muted-foreground">
                      {'Indexes your store\u2019s '}
                      <strong>product catalog</strong>
                      {' so the bot understands intent (e.g. \u201Cgift ideas for her\u201D), not just ' +
                        'keywords. Prices & stock stay live at answer time \u2014 and once indexed, the ' +
                        'catalog re-syncs automatically every night; the button is only for the first ' +
                        'sync or to pick up store changes right away. Separate from the Knowledge ' +
                        'screen, which indexes your website\u2019s pages and policies.'}
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={syncState.status === 'loading' || !testReady}
                    onClick={handleSync}
                  >
                    {syncState.status === 'loading' ? 'Syncing…' : 'Sync catalog'}
                  </Button>
                </div>
                {syncState.status === 'ok' && (
                  <TestBadge variant="ok">
                    Indexed {syncState.synced?.toLocaleString() ?? 0} product
                    {syncState.synced !== 1 ? 's' : ''}
                  </TestBadge>
                )}
                {syncState.status === 'error' && (
                  <TestBadge variant="error">{syncState.message}</TestBadge>
                )}
                {syncState.status !== 'loading' && indexInfo && indexInfo.indexed > 0 && (
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span className="tabular-nums">
                        {indexInfo.indexed.toLocaleString()}
                        {indexInfo.storeTotal > indexInfo.indexed
                          ? ` / ${indexInfo.storeTotal.toLocaleString()}`
                          : ''}{' '}
                        products indexed
                      </span>
                      {indexInfo.lastSyncedAt && (
                        <span>
                          Last synced {formatDistanceToNow(indexInfo.lastSyncedAt)} · auto-resyncs
                          nightly
                        </span>
                      )}
                    </div>
                    {indexInfo.storeTotal > indexInfo.indexed && (
                      <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                        <div
                          className="h-full rounded-full bg-primary/70"
                          style={{
                            width: `${Math.min(100, Math.round((100 * indexInfo.indexed) / indexInfo.storeTotal))}%`,
                          }}
                        />
                      </div>
                    )}
                  </div>
                )}
                {syncState.status === 'loading' &&
                  (() => {
                    const phase = syncProgress?.phase ?? 'fetching'
                    const label =
                      (
                        {
                          fetching: 'Fetching products from your store…',
                          enriching: 'Understanding your products…',
                          embedding: 'Building the search index…',
                          indexing: 'Saving to the index…',
                          done: 'Finishing up…',
                        } as Record<string, string>
                      )[phase] ?? 'Working…'
                    const hasBar =
                      !!syncProgress &&
                      syncProgress.total > 0 &&
                      (phase === 'enriching' || phase === 'embedding' || phase === 'indexing')
                    // Fetching has no known total (pages stream in) — show the count.
                    const countOnly =
                      !hasBar && !!syncProgress && phase === 'fetching' && syncProgress.processed > 0
                    const pct = hasBar
                      ? Math.min(100, Math.round((100 * syncProgress!.processed) / syncProgress!.total))
                      : 0
                    return (
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between text-xs text-muted-foreground">
                          <span>{label}</span>
                          {hasBar && (
                            <span className="tabular-nums">
                              {syncProgress!.processed.toLocaleString()}/
                              {syncProgress!.total.toLocaleString()}
                            </span>
                          )}
                          {countOnly && (
                            <span className="tabular-nums">
                              {syncProgress!.processed.toLocaleString()} products
                            </span>
                          )}
                        </div>
                        <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                          {hasBar ? (
                            <div
                              className="h-full rounded-full bg-primary transition-all"
                              style={{ width: `${pct}%` }}
                            />
                          ) : (
                            <div className="h-full w-1/3 animate-pulse rounded-full bg-primary/60" />
                          )}
                        </div>
                      </div>
                    )
                  })()}
              </div>
            )}

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
          </SettingsGroup>
        )}
      </CardContent>
    </CollapsibleSection>
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

function SettingsGroup({
  title,
  description,
  action,
  children,
}: {
  title: string
  description: string
  action?: ReactNode
  children: ReactNode
}) {
  return (
    <Card size="sm" className="gap-0 py-0 shadow-none">
      <CardHeader className="py-3">
        <CardTitle>{title}</CardTitle>
        <CardDescription className="text-xs">{description}</CardDescription>
        {action ? <CardAction>{action}</CardAction> : null}
      </CardHeader>
      <CardContent className="border-t py-3">{children}</CardContent>
    </Card>
  )
}

function SliderField({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label>{label}</Label>
      {children}
    </div>
  )
}

function InfoLabel({
  htmlFor,
  label,
  tooltip,
}: {
  htmlFor: string
  label: string
  tooltip: string
}) {
  return (
    <div className="flex items-center gap-1.5">
      <Label htmlFor={htmlFor}>{label}</Label>
      <Tooltip>
        <TooltipTrigger
          render={
            <button
              type="button"
              className="flex size-5 items-center justify-center rounded-full text-muted-foreground outline-none transition-colors hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
              aria-label={`About ${label}`}
            />
          }
        >
          <InfoIcon className="size-3.5" aria-hidden="true" />
        </TooltipTrigger>
        <TooltipContent className="max-w-72 leading-relaxed">{tooltip}</TooltipContent>
      </Tooltip>
    </div>
  )
}

function CompactToggle({
  label,
  description,
  children,
}: {
  label: string
  description: string
  children: ReactNode
}) {
  return (
    <div className="flex min-h-14 items-center justify-between gap-3 rounded-xl bg-muted/60 px-3 py-2">
      <div className="min-w-0">
        <p className="text-sm font-medium">{label}</p>
        <p className="truncate text-xs text-muted-foreground">{description}</p>
      </div>
      {children}
    </div>
  )
}

function normalizeHexColor(value: string): string | null {
  const trimmed = value.trim()
  if (/^#[0-9a-fA-F]{6}$/.test(trimmed)) return trimmed.toLowerCase()
  if (/^#[0-9a-fA-F]{3}$/.test(trimmed)) {
    return `#${trimmed.slice(1).split('').map((char) => char + char).join('')}`.toLowerCase()
  }
  return null
}

// Compact color card. The technical hex value stays in a focused dialog so
// the main settings page can emphasize color roles instead of implementation.
function ColorField({
  control,
  name,
  label,
  swatchDefault = '#000000',
  description,
  clearable = true,
  defaultLabel = 'Automatic',
}: {
  control: Control<FormValues>
  name: FieldPath<FormValues>
  label: string
  /** Color shown in the swatch when the value is empty. */
  swatchDefault?: string
  description?: string
  clearable?: boolean
  defaultLabel?: string
}) {
  const [open, setOpen] = useState(false)
  const [draft, setDraft] = useState(swatchDefault)
  const [invalid, setInvalid] = useState(false)
  const originalValueRef = useRef('')
  const committedRef = useRef(false)

  return (
    <Controller
      name={name}
      control={control}
      render={({ field }) => {
        const value = typeof field.value === 'string' ? field.value : ''
        const resolved = normalizeHexColor(value) ?? normalizeHexColor(swatchDefault) ?? '#000000'
        const openEditor = () => {
          originalValueRef.current = value
          committedRef.current = false
          setDraft(resolved)
          setInvalid(false)
          setOpen(true)
        }
        const closeEditor = (commit: boolean) => {
          if (!commit) field.onChange(originalValueRef.current)
          committedRef.current = commit
          setOpen(false)
          field.onBlur()
        }
        const applyDraft = () => {
          const normalized = normalizeHexColor(draft)
          if (!normalized) {
            setInvalid(true)
            return
          }
          field.onChange(normalized)
          closeEditor(true)
        }
        return (
          <>
            <Button
              type="button"
              variant="outline"
              onClick={openEditor}
              className="h-auto w-full justify-start rounded-xl px-3 py-2.5 text-left"
              aria-label={`Edit ${label.toLowerCase()}`}
            >
              <span
                className="size-9 shrink-0 rounded-lg border border-black/10 shadow-sm"
                style={{ backgroundColor: resolved }}
                aria-hidden="true"
              />
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-medium">{label}</span>
                <span className="block truncate text-xs font-normal text-muted-foreground">
                  {value ? description : defaultLabel}
                </span>
              </span>
              <ChevronRightIcon data-icon="inline-end" className="text-muted-foreground" />
            </Button>

            <Dialog
              open={open}
              onOpenChange={(next) => {
                if (!next && !committedRef.current) {
                  field.onChange(originalValueRef.current)
                  field.onBlur()
                }
                setOpen(next)
              }}
            >
              <DialogContent className="sm:max-w-sm" overlayStyle={{ zIndex: 40 }}>
                <DialogHeader>
                  <DialogTitle>{label}</DialogTitle>
                  <DialogDescription>
                    Pick visually or enter an exact hex value.
                  </DialogDescription>
                </DialogHeader>
              <input
                id={`${name}-picker`}
                type="color"
                value={normalizeHexColor(draft) ?? resolved}
                onChange={(event) => {
                  setDraft(event.target.value)
                  field.onChange(event.target.value)
                  setInvalid(false)
                }}
                className="h-28 w-full cursor-pointer rounded-xl border border-input bg-transparent p-1"
                aria-label={`Pick ${label.toLowerCase()}`}
              />
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor={`${name}-hex`}>Hex color</Label>
                  <Input
                    id={`${name}-hex`}
                    value={draft}
                    onChange={(event) => {
                      const next = event.target.value
                      setDraft(next)
                      const normalized = normalizeHexColor(next)
                      if (normalized) field.onChange(normalized)
                      setInvalid(false)
                    }}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter') {
                        event.preventDefault()
                        applyDraft()
                      }
                    }}
                    aria-invalid={invalid}
                    className="font-mono"
                    placeholder="#4f46e5"
                  />
                  {invalid ? <p className="text-xs text-destructive">Use a 3- or 6-digit hex color.</p> : null}
                </div>
                <DialogFooter>
                  {clearable && value ? (
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={() => {
                        field.onChange('')
                        closeEditor(true)
                      }}
                      className="sm:mr-auto"
                    >
                      Use default
                    </Button>
                  ) : null}
                  <Button type="button" variant="outline" onClick={() => closeEditor(false)}>Cancel</Button>
                  <Button type="button" onClick={applyDraft}>Apply color</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </>
        )
      }}
    />
  )
}

function AdvancedColorFields({
  control,
  primaryColor,
  voiceEnabled,
}: {
  control: Control<FormValues>
  primaryColor: string
  voiceEnabled: boolean
}) {
  const [open, setOpen] = useState(false)
  return (
    <div className="mt-2 border-t pt-2">
      <Button
        type="button"
        variant="ghost"
        className="w-full justify-between"
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
      >
        Advanced colors
        <ChevronDownIcon data-icon="inline-end" className={cn('transition-transform', open && 'rotate-180')} />
      </Button>
      {open ? (
        <div className="mt-2 grid gap-2 sm:grid-cols-2">
          <ColorField control={control} name="theme.composerFieldColor" label="Message field" swatchDefault="#ffffff" description="Composer surface" />
          <ColorField control={control} name="theme.composerBorderColor" label="Field border" swatchDefault="#e5e7eb" defaultLabel="Automatic" description="Composer outline" />
          <ColorField control={control} name="theme.sendButtonColor" label="Send button" swatchDefault={primaryColor} defaultLabel="Uses brand color" description="Composer action" />
          <ColorField control={control} name="theme.bubbleBorderColor" label="Bubble border" swatchDefault="#e5e7eb" description="Message outlines" />
          {voiceEnabled ? <ColorField control={control} name="theme.callButtonColor" label="Call button" swatchDefault="#22c55e" description="Voice action" /> : null}
        </div>
      ) : null}
    </div>
  )
}

// -------------------------------------------------------------------------
// ThemePresetPicker — one-click theme presets + "Match my website".
// Applying writes only *visual* theme keys into the form via setValue
// (dirty, so Save activates); functional keys (position, uploaded images,
// launcher text/logo, feature toggles) are preserved, and nothing outside
// `theme` is ever touched. Every field stays editable afterwards.
// -------------------------------------------------------------------------
function ThemePresetPicker({
  watch,
  setValue,
}: {
  watch: UseFormWatch<FormValues>
  setValue: UseFormSetValue<FormValues>
}) {
  const [matchOpen, setMatchOpen] = useState(false)
  const [matchUrl, setMatchUrl] = useState('')
  const [matching, setMatching] = useState(false)

  const applyTheme = useCallback(
    (partial: Record<string, unknown>, label: string, extras?: { avatarUrl?: string }) => {
      // Snapshot the whole theme (and logo, when we're about to change it) so
      // Revert restores EXACTLY what was there — including a background image
      // the preset clears.
      const before = structuredClone(watch('theme')) as Record<string, unknown>
      const beforeAvatar = extras?.avatarUrl !== undefined ? (watch('avatarUrl') ?? '') : undefined
      const preserved = PRESET_PRESERVED_THEME_KEYS as readonly string[]
      const write = (key: string, value: unknown) =>
        setValue(`theme.${key}` as FieldPath<FormValues>, value as never, {
          shouldDirty: true,
          shouldValidate: true,
        })
      for (const [key, value] of Object.entries(partial)) {
        if (preserved.includes(key) || value === undefined) continue
        write(key, value)
      }
      // A leftover photo behind new preset colors reads as broken — clear it
      // whenever the applied theme defines its own background.
      if (partial.backgroundColor !== undefined && partial.backgroundImageUrl === undefined) {
        write('backgroundImageUrl', '')
      }
      if (extras?.avatarUrl) {
        setValue('avatarUrl', extras.avatarUrl, { shouldDirty: true, shouldValidate: true })
      }
      toast.success(`${label} applied`, {
        description: 'Save to make it live — or revert.',
        duration: 8000,
        action: { label: 'Keep', onClick: () => {} },
        cancel: {
          label: 'Revert',
          onClick: () => {
            for (const [key, value] of Object.entries(before)) write(key, value)
            if (beforeAvatar !== undefined) {
              setValue('avatarUrl', beforeAvatar, { shouldDirty: true, shouldValidate: true })
            }
            toast.message('Theme reverted')
          },
        },
      })
    },
    [setValue, watch],
  )

  // Pre-fill with the bot's own site when we know it.
  const openMatchDialog = () => {
    const store = watch('commerce.storeUrl')
    const domain = watch('allowedDomains')?.[0]
    const guess = (store || domain || '').trim()
    setMatchUrl(guess && !/^https?:\/\//i.test(guess) ? `https://${guess}` : guess)
    setMatchOpen(true)
  }

  const runMatch = async () => {
    const url = matchUrl.trim()
    if (!url || matching) return
    setMatching(true)
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
        toast.error(data?.error ?? 'Could not read a theme from that site')
        return
      }
      applyTheme(data.theme, 'Website theme', data.logoUrl ? { avatarUrl: data.logoUrl } : undefined)
      setMatchOpen(false)
    } catch {
      toast.error('Could not read a theme from that site')
    } finally {
      setMatching(false)
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="grid gap-2 sm:grid-cols-2">
        {WIDGET_THEME_PRESETS.map((preset) => (
          <Button
            key={preset.id}
            type="button"
            variant="outline"
            onClick={() => applyTheme(preset.theme, preset.name)}
            title={preset.description}
            className="h-auto justify-start rounded-xl px-3 py-3"
          >
            <span className="flex -space-x-1.5">
              {[
                preset.theme.primaryColor,
                preset.theme.botBubbleColor || '#f3f4f6',
                preset.theme.backgroundColor,
              ].map((color, i) => (
                <span
                  key={i}
                  className="size-5 rounded-full ring-2 ring-background"
                  style={{ backgroundColor: color }}
                />
              ))}
            </span>
            <span className="truncate">{preset.name}</span>
          </Button>
        ))}
        <Button
          type="button"
          variant="outline"
          onClick={openMatchDialog}
          title="Read your website's brand colors, font, and logo and apply them here"
          className="h-auto justify-start rounded-xl border-dashed px-3 py-3 text-muted-foreground sm:col-span-2"
        >
          <GlobeIcon data-icon="inline-start" />
          Match my website
        </Button>
      </div>

      <Dialog open={matchOpen} onOpenChange={setMatchOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Match my website</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              We&apos;ll read your site&apos;s brand colors and font and apply them to the widget
              theme. You can tweak everything afterwards.
            </p>
            <div className="space-y-1.5">
              <Label htmlFor="matchWebsiteUrl">Website URL</Label>
              <Input
                id="matchWebsiteUrl"
                value={matchUrl}
                onChange={(e) => setMatchUrl(e.target.value)}
                placeholder="https://your-site.com"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    void runMatch()
                  }
                }}
              />
            </div>
            <div className="flex justify-end gap-2 pt-1">
              <Button type="button" variant="ghost" onClick={() => setMatchOpen(false)}>
                Cancel
              </Button>
              <Button type="button" onClick={() => void runMatch()} disabled={matching || !matchUrl.trim()}>
                {matching ? 'Reading site…' : 'Extract theme'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
