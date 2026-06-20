'use client'

import { useCallback } from 'react'
import { useForm, useFieldArray, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
import { PlusIcon, TrashIcon } from 'lucide-react'
import { botConfigSchema } from '@/lib/validation/schemas'
import type { BotConfig } from '@/lib/types'
import type { z } from 'zod'
import { saveConfig } from '@/app/(client)/app/bots/[botId]/configure/actions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { TestChat } from '@/components/client/TestChat'
import { VoiceSection } from '@/components/client/VoiceSection'
import { LogoUpload } from '@/components/client/LogoUpload'

interface ConfigFormProps {
  botId: string
  initialConfig: BotConfig
}

// Use the Zod input type for the form (what RHF stores) and the output type
// for what we send to the server action. The resolver fills in defaults so by
// the time handleSubmit fires the values satisfy the output type.
type FormValues = z.input<typeof botConfigSchema>
type ParsedValues = z.output<typeof botConfigSchema>

const MAX_SUGGESTED_QUESTIONS = 4

export function ConfigForm({ botId, initialConfig }: ConfigFormProps) {
  const form = useForm<FormValues>({
    resolver: zodResolver(botConfigSchema),
    defaultValues: initialConfig,
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

  // Watch all values needed by the live TestChat preview.
  // Using `watch()` with no args subscribes to the full form; slice below.
  const watchedValues = watch([
    'displayName',
    'greeting',
    'suggestedQuestions',
    'theme',
    'voice',
    'fallbackMessage',
    'model',
    'temperature',
    'systemPrompt',
    'persona',
    'leadCapture',
    'allowedDomains',
    'avatarUrl',
    'language',
  ])
  const liveConfig = {
    displayName: watchedValues[0],
    greeting: watchedValues[1],
    suggestedQuestions: watchedValues[2],
    theme: watchedValues[3],
    voice: watchedValues[4],
    fallbackMessage: watchedValues[5],
    model: watchedValues[6],
    temperature: watchedValues[7],
    systemPrompt: watchedValues[8],
    persona: watchedValues[9],
    leadCapture: watchedValues[10],
    allowedDomains: watchedValues[11],
    avatarUrl: watchedValues[12],
    language: watchedValues[13],
  }

  // Dynamic list for suggested questions
  const suggestedQuestionsField = useFieldArray({
    control,
    // @ts-expect-error — useFieldArray expects object items; we store strings
    name: 'suggestedQuestions',
  })

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

  const onSubmit = useCallback(
    // zodResolver fills in defaults so at submit time values satisfy ParsedValues
    async (values: FormValues) => {
      const parsed = values as unknown as ParsedValues
      const result = await saveConfig(botId, parsed)
      if (result.success) {
        toast.success('Configuration saved')
      } else {
        toast.error(result.error ?? 'Failed to save configuration')
      }
    },
    [botId],
  )

  const leadCaptureEnabled = watch('leadCapture.enabled')
  const suggestedCount = suggestedQuestionsField.fields.length

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_400px]">
      {/* ── Form ── */}
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">

        {/* Display */}
        <section className="space-y-4">
          <h2 className="text-base font-semibold border-b pb-2">Display</h2>

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
            <Label htmlFor="greeting">Greeting message</Label>
            <Textarea
              id="greeting"
              {...register('greeting')}
              placeholder="Hi! How can I help you today?"
              className="min-h-20"
            />
            {errors.greeting && (
              <p className="text-xs text-destructive">{errors.greeting.message}</p>
            )}
          </div>

          {/* Logo upload */}
          <LogoUpload botId={botId} control={control} setValue={setValue} />
        </section>

        {/* Theme */}
        <section className="space-y-4">
          <h2 className="text-base font-semibold border-b pb-2">Theme</h2>

          <div className="grid gap-4 sm:grid-cols-2">
            {/* Primary color — single source of truth via Controller */}
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

          {/* Radius sliders */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="cornerRadius">
                Chat window roundness{' '}
                <span className="text-muted-foreground font-normal">
                  ({watch('theme.cornerRadius') ?? 16}px)
                </span>
              </Label>
              <input
                id="cornerRadius"
                type="range"
                min={0}
                max={32}
                step={1}
                {...register('theme.cornerRadius', { valueAsNumber: true })}
                className="w-full accent-primary"
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Square</span>
                <span>Rounded</span>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="bubbleRadius">
                Bubble roundness{' '}
                <span className="text-muted-foreground font-normal">
                  ({watch('theme.bubbleRadius') ?? 16}px)
                </span>
              </Label>
              <input
                id="bubbleRadius"
                type="range"
                min={0}
                max={24}
                step={1}
                {...register('theme.bubbleRadius', { valueAsNumber: true })}
                className="w-full accent-primary"
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Square</span>
                <span>Pill</span>
              </div>
            </div>
          </div>
        </section>

        {/* AI behaviour */}
        <section className="space-y-4">
          <h2 className="text-base font-semibold border-b pb-2">AI behaviour</h2>

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

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Language</Label>
              <Controller
                name="language"
                control={control}
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="en">English</SelectItem>
                      <SelectItem value="lt">Lithuanian</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              />
            </div>

            <div className="space-y-1.5">
              <Label>Model</Label>
              <Controller
                name="model"
                control={control}
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="gpt-4o-mini">GPT-4o mini (fast)</SelectItem>
                      <SelectItem value="gpt-4o">GPT-4o (powerful)</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="temperature">
                Temperature{' '}
                <span className="text-muted-foreground font-normal">
                  ({watch('temperature')?.toFixed(1) ?? '0.3'})
                </span>
              </Label>
              <input
                id="temperature"
                type="range"
                min={0}
                max={2}
                step={0.1}
                {...register('temperature', { valueAsNumber: true })}
                className="w-full accent-primary"
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Precise</span>
                <span>Creative</span>
              </div>
            </div>
          </div>
        </section>

        {/* Suggested questions */}
        <section className="space-y-4">
          <h2 className="text-base font-semibold border-b pb-2">Suggested questions</h2>
          <div className="space-y-2">
            {suggestedQuestionsField.fields.map((field, index) => (
              <div key={field.id} className="flex items-center gap-2">
                <Input
                  {...register(`suggestedQuestions.${index}` as const)}
                  placeholder="Enter a suggested question…"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => suggestedQuestionsField.remove(index)}
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
                onClick={() => suggestedQuestionsField.append('')}
              >
                <PlusIcon />
                Add question
              </Button>
              {suggestedCount >= MAX_SUGGESTED_QUESTIONS && (
                <p className="text-xs text-muted-foreground">
                  Maximum {MAX_SUGGESTED_QUESTIONS} questions allowed
                </p>
              )}
            </div>
          </div>
        </section>

        {/* Fallback message */}
        <section className="space-y-4">
          <h2 className="text-base font-semibold border-b pb-2">Fallback</h2>

          <div className="space-y-1.5">
            <Label htmlFor="fallbackMessage">Fallback message</Label>
            <Textarea
              id="fallbackMessage"
              {...register('fallbackMessage')}
              placeholder="I'm not sure about that — let me take your details…"
              className="min-h-20"
            />
            {errors.fallbackMessage && (
              <p className="text-xs text-destructive">{errors.fallbackMessage.message}</p>
            )}
          </div>
        </section>

        {/* Lead capture */}
        <section className="space-y-4">
          <h2 className="text-base font-semibold border-b pb-2">Lead capture</h2>

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
        </section>

        {/* Voice */}
        <VoiceSection control={control} watch={watch} setValue={setValue} />

        {/* Allowed domains */}
        <section className="space-y-4">
          <h2 className="text-base font-semibold border-b pb-2">Allowed domains</h2>
          <div className="space-y-2">
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
          </div>
          <p className="text-xs text-muted-foreground">
            Leave empty to allow any domain (not recommended for production).
          </p>
        </section>

        {/* Save */}
        <div className="flex justify-end pt-4 border-t">
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Saving…' : 'Save configuration'}
          </Button>
        </div>
      </form>

      {/* ── Live Preview (interactive TestChat) ── */}
      <aside className="hidden lg:block">
        <div className="sticky top-20 space-y-3">
          <p className="text-sm font-medium text-muted-foreground">Live preview</p>
          <div className="h-[520px]">
            <TestChat botId={botId} config={liveConfig} />
          </div>
        </div>
      </aside>
    </div>
  )
}
