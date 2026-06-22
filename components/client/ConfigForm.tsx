'use client'

import { useState, useCallback, useEffect, useRef, type ReactNode } from 'react'
import { useForm, useFieldArray, Controller, type Control, type UseFormWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
import { PlusIcon, TrashIcon } from 'lucide-react'
import { botConfigFormSchema } from '@/lib/validation/schemas'
import type { BotLanguage } from '@/lib/types'
import type { z } from 'zod'
import { saveConfig } from '@/app/(client)/app/bots/[botId]/configure/actions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { Slider } from '@/components/ui/slider'
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
import { TestChat } from '@/components/client/TestChat'
import { ResizablePanel } from '@/components/ui/resizable-panel'
import { VoiceSection } from '@/components/client/VoiceSection'
import { LogoUpload } from '@/components/client/LogoUpload'
import type { BotConfig } from '@/lib/types'
import { FONT_OPTIONS, fontStack } from '@/lib/fonts'
import { cn } from '@/lib/utils'

interface ConfigFormProps {
  botId: string
  initialConfig: BotConfig
}

// Use botConfigFormSchema (plain, no preprocessing) for the RHF resolver.
// FormValues = what RHF stores (Zod input type, with optionals).
type FormValues = z.input<typeof botConfigFormSchema>

// Commerce validation result state
type CommerceTestState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'ok'; count: number }
  | { status: 'error'; message: string }

const MAX_SUGGESTED_QUESTIONS = 4

const LANG_LABELS: Record<BotLanguage, string> = {
  en: 'English',
  lt: 'Lithuanian',
}

export function ConfigForm({ botId, initialConfig }: ConfigFormProps) {
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

  const form = useForm<FormValues>({
    resolver: zodResolver(botConfigFormSchema),
    defaultValues: initialConfig as FormValues,
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

  // Watch all values for the live preview
  const watchedValues = watch()

  // Suggested questions for the active language
  const suggestedQuestionsFieldEn = useFieldArray({
    control,
    // @ts-expect-error — useFieldArray expects object items; we store strings
    name: 'content.en.suggestedQuestions',
  })
  const suggestedQuestionsFieldLt = useFieldArray({
    control,
    // @ts-expect-error — useFieldArray expects object items; we store strings
    name: 'content.lt.suggestedQuestions',
  })

  const activeSuggestedField =
    activeLang === 'lt' ? suggestedQuestionsFieldLt : suggestedQuestionsFieldEn
  const suggestedCount = activeSuggestedField.fields.length

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
        // Initialize lt content if not present
        const ltContent = watch('content.lt')
        if (!ltContent) {
          setValue(
            'content.lt',
            { greeting: '', suggestedQuestions: [], fallbackMessage: '' },
            { shouldDirty: true },
          )
        }
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
      const result = await saveConfig(botId, values)
      if (result.success) {
        toast.success('Configuration saved')
      } else {
        toast.error(result.error ?? 'Failed to save configuration')
      }
    },
    [botId],
  )

  const leadCaptureEnabled = watch('leadCapture.enabled')

  // Build a live config for the preview — typed to match TestChat's LiveConfig
  const liveConfig = {
    displayName: watchedValues.displayName,
    theme: watchedValues.theme,
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
    content: watchedValues.content,
    commerce: watchedValues.commerce,
  }

  return (
    <div className="flex h-full min-h-0">
      {/* ── Config panel — resizable from its right edge, scrolls internally ── */}
      <ResizablePanel defaultWidth={480} min={380} max={760}>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5 p-5">

        {/* ── Display ── */}
        <Card>
          <CardHeader>
            <CardTitle>Display</CardTitle>
            <CardDescription>Bot name and avatar shown to visitors.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
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

            <LogoUpload
              botId={botId}
              control={control}
              setValue={setValue}
              name="avatarUrl"
              label="Company logo"
              filePrefix="logo"
              description="Shown in the widget. Used as the default bot avatar."
            />
            <LogoUpload
              botId={botId}
              control={control}
              setValue={setValue}
              name="botAvatarUrl"
              label="Bot image (optional)"
              filePrefix="bot"
              description="Overrides the company logo for this bot. If empty, the company logo is used."
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
        <Card>
          <CardHeader>
            <CardTitle>Language &amp; content</CardTitle>
            <CardDescription>
              Greeting, suggested questions, and fallback message — per language.
            </CardDescription>
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
                />
                <Label htmlFor="ltEnabled" className="text-sm font-normal cursor-pointer">
                  Enable Lithuanian content
                </Label>
              </div>
            </div>

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

              {/* Suggested questions */}
              <div className="space-y-2">
                <Label>
                  Suggested questions
                  <span className="ml-1.5 text-xs text-muted-foreground font-normal">
                    ({LANG_LABELS[activeLang]}, max {MAX_SUGGESTED_QUESTIONS})
                  </span>
                </Label>
                {activeSuggestedField.fields.map((field, index) => (
                  <div key={field.id} className="flex items-center gap-2">
                    <Input
                      {...register(`content.${activeLang}.suggestedQuestions.${index}` as const)}
                      placeholder="Enter a suggested question…"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => activeSuggestedField.remove(index)}
                      aria-label="Remove question"
                    >
                      <TrashIcon />
                    </Button>
                  </div>
                ))}
                <div className="flex items-center gap-3">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={suggestedCount >= MAX_SUGGESTED_QUESTIONS}
                    // @ts-expect-error — FieldArray append for string[] is fine at runtime
                    onClick={() => activeSuggestedField.append('')}
                  >
                    <PlusIcon />
                    Add question
                  </Button>
                  {suggestedCount >= MAX_SUGGESTED_QUESTIONS && (
                    <p className="text-xs text-muted-foreground">
                      Maximum {MAX_SUGGESTED_QUESTIONS} allowed
                    </p>
                  )}
                </div>
              </div>

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
        <Card>
          <CardHeader>
            <CardTitle>Theme</CardTitle>
            <CardDescription>Colors, widget position, and corner roundness.</CardDescription>
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

            {/* Radius sliders — stacked vertically */}
            <div className="space-y-5">
              <div className="space-y-2">
                <Label>
                  Chat window roundness{' '}
                  <span className="text-muted-foreground font-normal">
                    ({watch('theme.cornerRadius') ?? 16}px)
                  </span>
                </Label>
                <Controller
                  control={control}
                  name="theme.cornerRadius"
                  render={({ field }) => (
                    <Slider
                      min={0}
                      max={32}
                      step={1}
                      value={field.value ?? 16}
                      onValueChange={(v) => field.onChange(Array.isArray(v) ? v[0] : v)}
                    />
                  )}
                />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Square</span>
                  <span>Rounded</span>
                </div>
              </div>

              <div className="space-y-2">
                <Label>
                  Bubble roundness{' '}
                  <span className="text-muted-foreground font-normal">
                    ({watch('theme.bubbleRadius') ?? 16}px)
                  </span>
                </Label>
                <Controller
                  control={control}
                  name="theme.bubbleRadius"
                  render={({ field }) => (
                    <Slider
                      min={0}
                      max={24}
                      step={1}
                      value={field.value ?? 16}
                      onValueChange={(v) => field.onChange(Array.isArray(v) ? v[0] : v)}
                    />
                  )}
                />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Square</span>
                  <span>Pill</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* ── AI Behaviour ── */}
        <Card>
          <CardHeader>
            <CardTitle>AI behaviour</CardTitle>
            <CardDescription>System prompt and persona.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="systemPrompt">System prompt</Label>
              <Textarea
                id="systemPrompt"
                {...register('systemPrompt')}
                placeholder="You are a helpful assistant…"
                className="min-h-28 font-mono text-sm"
              />
              {errors.systemPrompt && (
                <p className="text-xs text-destructive">{errors.systemPrompt.message}</p>
              )}
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
          </CardContent>
        </Card>

        {/* ── Voice ── */}
        <VoiceSection
          control={control}
          watch={watch}
          setValue={setValue}
          activeLang={activeLang}
          enabledLanguages={watchedLanguages as BotLanguage[]}
        />

        {/* ── Lead Capture ── */}
        <Card>
          <CardHeader>
            <CardTitle>Lead capture</CardTitle>
            <CardDescription>Collect visitor contact information during the conversation.</CardDescription>
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
                  />
                )}
              />
              <Label htmlFor="leadCaptureEnabled">Enable lead capture</Label>
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
        <Card>
          <CardHeader>
            <CardTitle>Allowed domains</CardTitle>
            <CardDescription>
              Restrict which websites can embed this widget. Leave empty to allow any domain.
            </CardDescription>
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
              // @ts-expect-error — FieldArray append for string[] is fine at runtime
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

        {/* Save */}
        <div className="flex justify-end pt-2 border-t">
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Saving…' : 'Save configuration'}
          </Button>
        </div>
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
  const storeUrl = watch('commerce.storeUrl') ?? ''
  const [testState, setTestState] = useState<CommerceTestState>({ status: 'idle' })

  const handleTest = useCallback(async () => {
    if (!storeUrl.trim()) {
      setTestState({ status: 'error', message: 'Enter a store URL first.' })
      return
    }
    setTestState({ status: 'loading' })
    try {
      const res = await fetch('/api/commerce/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider: 'woocommerce', storeUrl: storeUrl.trim() }),
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
  }, [storeUrl])

  // Reset test state when URL changes
  const prevUrlRef = useRef(storeUrl)
  if (prevUrlRef.current !== storeUrl) {
    prevUrlRef.current = storeUrl
    if (testState.status !== 'idle') setTestState({ status: 'idle' })
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Store / products</CardTitle>
        <CardDescription>
          Connect your WooCommerce store so the bot can search your catalog and show product cards.
        </CardDescription>
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
            {/* Provider — read-only single option */}
            <div className="space-y-1.5">
              <Label>Provider</Label>
              <Select disabled value="woocommerce">
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="woocommerce">WooCommerce</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                WooCommerce is auto-detected from your store URL.
              </p>
            </div>

            {/* Store URL */}
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

            {/* Test connection button + result */}
            <div className="flex items-center gap-3 flex-wrap">
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={testState.status === 'loading' || !storeUrl.trim()}
                onClick={handleTest}
              >
                {testState.status === 'loading' ? 'Testing…' : 'Test connection'}
              </Button>

              {testState.status === 'ok' && (
                <TestBadge variant="ok">
                  Connected — {testState.count.toLocaleString()} product
                  {testState.count !== 1 ? 's' : ''} in catalog
                </TestBadge>
              )}
              {testState.status === 'error' && (
                <TestBadge variant="error">{testState.message}</TestBadge>
              )}
            </div>

            <p className="text-xs text-muted-foreground bg-muted/50 rounded-md px-3 py-2">
              Your bot will search this store&apos;s catalog live and show product cards in chat.
            </p>
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
