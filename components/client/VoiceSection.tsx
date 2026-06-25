'use client'

/**
 * VoiceSection — Voice configuration block for ConfigForm.
 *
 * Renders:
 *  - Master enable toggle (voice.enabled)
 *  - TTS toggle (voice.ttsEnabled)
 *  - STT toggle (voice.sttEnabled)
 *  - Per-language voice picker (voice.voices.<lang>) for each enabled language
 *    → two <optgroup> sections: Men / Women
 *  - Preview ▶ button per language
 */

import { useEffect, useRef, useReducer, useCallback } from 'react'
import { Controller, type Control, type UseFormWatch, type UseFormSetValue } from 'react-hook-form'
import { PlayIcon, SquareIcon, LoaderCircleIcon, AlertCircleIcon, MicIcon } from 'lucide-react'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import type { BotLanguage } from '@/lib/types'
import type { z } from 'zod'
import type { botConfigFormSchema } from '@/lib/validation/schemas'

type FormValues = z.input<typeof botConfigFormSchema>

interface VoiceOption {
  id: string
  name: string
  previewUrl?: string
}

interface GroupedVoices {
  male: VoiceOption[]
  female: VoiceOption[]
}

type LoadState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'ready'; grouped: GroupedVoices }
  | { status: 'empty' }
  | { status: 'unavailable' }

type LoadAction =
  | { type: 'FETCH_START' }
  | { type: 'FETCH_SUCCESS'; grouped: GroupedVoices }
  | { type: 'FETCH_EMPTY' }
  | { type: 'FETCH_FAIL' }
  | { type: 'RESET' }

function reducer(state: LoadState, action: LoadAction): LoadState {
  switch (action.type) {
    case 'FETCH_START':   return { status: 'loading' }
    case 'FETCH_SUCCESS': return { status: 'ready', grouped: action.grouped }
    case 'FETCH_EMPTY':   return { status: 'empty' }
    case 'FETCH_FAIL':    return { status: 'unavailable' }
    case 'RESET':         return { status: 'idle' }
    default:              return state
  }
}

const LANG_LABELS: Record<BotLanguage, string> = {
  en: 'English',
  lt: 'Lithuanian',
}

interface VoiceSectionProps {
  control: Control<FormValues>
  watch: UseFormWatch<FormValues>
  setValue: UseFormSetValue<FormValues>
  activeLang: BotLanguage
  enabledLanguages: BotLanguage[]
}

export function VoiceSection({ control, watch, setValue, activeLang, enabledLanguages }: VoiceSectionProps) {
  const voiceEnabled = watch('voice.enabled')

  // When voice is turned on, make sure the sub-flags have real boolean values
  useEffect(() => {
    if (!voiceEnabled) return
    if (watch('voice.ttsEnabled') === undefined) {
      setValue('voice.ttsEnabled', true, { shouldDirty: false })
    }
    if (watch('voice.sttEnabled') === undefined) {
      setValue('voice.sttEnabled', true, { shouldDirty: false })
    }
  }, [voiceEnabled, watch, setValue])

  const [loadState, dispatch] = useReducer(reducer, { status: 'idle' })

  // Fetch curated voices once when voice is enabled.
  useEffect(() => {
    if (!voiceEnabled) {
      dispatch({ type: 'RESET' })
      return
    }

    let cancelled = false
    dispatch({ type: 'FETCH_START' })

    fetch('/api/platform-voices')
      .then(async (res) => {
        if (cancelled) return
        if (!res.ok) {
          dispatch({ type: 'FETCH_FAIL' })
          return
        }
        const data = (await res.json()) as { male?: VoiceOption[]; female?: VoiceOption[] }
        const male = data.male ?? []
        const female = data.female ?? []
        if (male.length === 0 && female.length === 0) {
          dispatch({ type: 'FETCH_EMPTY' })
        } else {
          dispatch({ type: 'FETCH_SUCCESS', grouped: { male, female } })
        }
      })
      .catch(() => {
        if (!cancelled) dispatch({ type: 'FETCH_FAIL' })
      })

    return () => {
      cancelled = true
    }
  }, [voiceEnabled])

  const allVoices: VoiceOption[] =
    loadState.status === 'ready'
      ? [...loadState.grouped.male, ...loadState.grouped.female]
      : []

  // Auto-select first available voice for each language if none set
  useEffect(() => {
    if (loadState.status !== 'ready' || allVoices.length === 0) return
    for (const lang of enabledLanguages) {
      const current = watch(`voice.voices.${lang}` as keyof FormValues)
      if (!allVoices.some((v) => v.id === current)) {
        setValue(`voice.voices.${lang}` as keyof FormValues, allVoices[0].id as never, { shouldDirty: false })
      }
    }
  }, [loadState.status, allVoices, enabledLanguages, watch, setValue])

  return (
    <Card className="overflow-visible rounded-none border-b pt-0 shadow-none ring-0">
      <CardHeader className="header-grid relative sticky top-16 z-[5] overflow-hidden rounded-none border-b bg-muted/70 py-3 backdrop-blur">
        <div className="relative z-10 flex items-center gap-2.5">
          <span className="flex size-7 shrink-0 items-center justify-center rounded-md bg-primary text-primary-foreground">
            <MicIcon className="size-4" aria-hidden="true" />
          </span>
          <div>
            <CardTitle className="text-sm font-semibold leading-tight">Voice</CardTitle>
            <CardDescription className="text-xs leading-tight">TTS, STT, and per-language voice settings.</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Master toggle */}
        <div className="flex items-center gap-3">
          <Controller
            name="voice.enabled"
            control={control}
            render={({ field }) => (
              <Switch
                checked={field.value ?? false}
                onCheckedChange={field.onChange}
                id="voiceEnabled"
              />
            )}
          />
          <Label htmlFor="voiceEnabled">Enable voice</Label>
        </div>

        {voiceEnabled && (
          <div className="space-y-5 rounded-lg border p-4">
            {/* TTS toggle */}
            <div className="flex items-center gap-3">
              <Controller
                name="voice.ttsEnabled"
                control={control}
                render={({ field }) => (
                  <Switch
                    checked={field.value ?? true}
                    onCheckedChange={field.onChange}
                    id="ttsEnabled"
                  />
                )}
              />
              <Label htmlFor="ttsEnabled">Text-to-speech (bot speaks replies)</Label>
            </div>

            {/* STT toggle */}
            <div className="flex items-center gap-3">
              <Controller
                name="voice.sttEnabled"
                control={control}
                render={({ field }) => (
                  <Switch
                    checked={field.value ?? true}
                    onCheckedChange={field.onChange}
                    id="sttEnabled"
                  />
                )}
              />
              <Label htmlFor="sttEnabled">Speech-to-text (visitor speaks questions)</Label>
            </div>

            {/* Voice status messages */}
            {loadState.status === 'unavailable' && (
              <div className="flex items-start gap-2 rounded-md bg-amber-50 border border-amber-200 px-3 py-2 text-sm text-amber-800">
                <AlertCircleIcon className="w-4 h-4 mt-0.5 flex-shrink-0" aria-hidden="true" />
                <span>
                  Add{' '}
                  <code className="font-mono text-xs bg-amber-100 px-1 rounded">
                    ELEVENLABS_API_KEY
                  </code>{' '}
                  to your environment to enable voice selection.
                </span>
              </div>
            )}
            {loadState.status === 'empty' && (
              <div className="flex items-start gap-2 rounded-md bg-muted border px-3 py-2 text-sm text-muted-foreground">
                <AlertCircleIcon className="w-4 h-4 mt-0.5 flex-shrink-0" aria-hidden="true" />
                <span>No voices available yet — ask the platform owner to add voices.</span>
              </div>
            )}
            {loadState.status === 'loading' && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <LoaderCircleIcon className="w-4 h-4 animate-spin" aria-hidden="true" />
                Loading voices…
              </div>
            )}

            {/* Per-language voice pickers */}
            {loadState.status === 'ready' && (
              <div className="space-y-4">
                <Label className="text-sm font-medium">Voice per language</Label>
                {enabledLanguages.map((lang) => (
                  <LanguageVoicePicker
                    key={lang}
                    lang={lang}
                    label={LANG_LABELS[lang]}
                    control={control}
                    watch={watch}
                    grouped={loadState.grouped}
                    allVoices={allVoices}
                    isActive={lang === activeLang}
                  />
                ))}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

// ── Per-language voice picker ──────────────────────────────────────────────
interface LanguageVoicePickerProps {
  lang: BotLanguage
  label: string
  control: Control<FormValues>
  watch: UseFormWatch<FormValues>
  grouped: GroupedVoices
  allVoices: VoiceOption[]
  isActive: boolean
}

function LanguageVoicePicker({
  lang,
  label,
  control,
  watch,
  grouped,
  allVoices,
  isActive,
}: LanguageVoicePickerProps) {
  const selectedVoiceId = watch(`voice.voices.${lang}` as keyof FormValues) as string | undefined
  const selectedVoice = allVoices.find((v) => v.id === selectedVoiceId)

  const [previewStatus, dispatchPreview] = useReducer(
    (_s: 'idle' | 'loading' | 'playing', a: 'idle' | 'loading' | 'playing') => a,
    'idle',
  )
  const audioRef = useRef<HTMLAudioElement | null>(null)

  function stopPreview() {
    if (audioRef.current) {
      audioRef.current.pause()
      audioRef.current = null
    }
    dispatchPreview('idle')
  }

  const handlePreview = useCallback(async () => {
    if (!selectedVoice?.previewUrl) return
    if (previewStatus === 'playing') { stopPreview(); return }

    dispatchPreview('loading')
    stopPreview()

    const audio = new Audio(selectedVoice.previewUrl)
    audioRef.current = audio
    audio.onended = () => dispatchPreview('idle')
    audio.onerror = () => dispatchPreview('idle')

    try {
      await audio.play()
      dispatchPreview('playing')
    } catch {
      dispatchPreview('idle')
    }
  }, [selectedVoice, previewStatus])

  return (
    <div className={`space-y-1.5 p-3 rounded-lg border ${isActive ? 'border-primary/30 bg-primary/5' : ''}`}>
      <Label htmlFor={`voice-${lang}`} className="text-sm flex items-center gap-1.5">
        {label}
        {isActive && (
          <span className="text-xs text-primary font-normal">(active in preview)</span>
        )}
      </Label>
      <div className="flex items-center gap-2">
        <Controller
          name={`voice.voices.${lang}` as keyof FormValues}
          control={control}
          render={({ field }) => (
            <Select
              value={(field.value as string) || undefined}
              onValueChange={field.onChange}
            >
              <SelectTrigger id={`voice-${lang}`} className="flex-1" aria-label={`Select ${label} voice`}>
                <SelectValue placeholder="Select a voice…" />
              </SelectTrigger>
              <SelectContent>
                {grouped.male.length > 0 && (
                  <SelectGroup>
                    <SelectLabel>Men</SelectLabel>
                    {grouped.male.map((v) => (
                      <SelectItem key={v.id} value={v.id}>
                        {v.name}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                )}
                {grouped.female.length > 0 && (
                  <SelectGroup>
                    <SelectLabel>Women</SelectLabel>
                    {grouped.female.map((v) => (
                      <SelectItem key={v.id} value={v.id}>
                        {v.name}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                )}
              </SelectContent>
            </Select>
          )}
        />

        <Button
          type="button"
          variant="outline"
          size="icon-sm"
          onClick={handlePreview}
          disabled={!selectedVoice?.previewUrl || previewStatus === 'loading'}
          aria-label={previewStatus === 'playing' ? 'Stop preview' : 'Preview voice'}
        >
          {previewStatus === 'loading' ? (
            <LoaderCircleIcon className="w-4 h-4 animate-spin" aria-hidden="true" />
          ) : previewStatus === 'playing' ? (
            <SquareIcon className="w-4 h-4" aria-hidden="true" />
          ) : (
            <PlayIcon className="w-4 h-4" aria-hidden="true" />
          )}
        </Button>
      </div>
    </div>
  )
}
