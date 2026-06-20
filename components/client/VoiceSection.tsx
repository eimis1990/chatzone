'use client'

/**
 * VoiceSection — Voice configuration block for ConfigForm.
 *
 * Renders:
 *  - Master enable toggle (voice.enabled)
 *  - TTS toggle (voice.ttsEnabled)
 *  - STT toggle (voice.sttEnabled)
 *  - Voice picker (voice.voiceId) built from GET /api/platform-voices
 *    → two <optgroup> sections: Men / Women
 *  - Preview ▶ button that plays the selected voice's previewUrl
 *
 * When no curated voices are configured the picker shows an informational notice.
 * When ELEVENLABS_API_KEY is absent the notice indicates the key is missing.
 */

import { useEffect, useRef, useReducer, useCallback } from 'react'
import { Controller, type Control, type UseFormWatch } from 'react-hook-form'
import { PlayIcon, SquareIcon, LoaderCircleIcon, AlertCircleIcon } from 'lucide-react'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import type { z } from 'zod'
import type { botConfigSchema } from '@/lib/validation/schemas'

type FormValues = z.input<typeof botConfigSchema>

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
  | { status: 'empty' }       // curated list is empty
  | { status: 'unavailable' } // key missing or fetch error

type LoadAction =
  | { type: 'FETCH_START' }
  | { type: 'FETCH_SUCCESS'; grouped: GroupedVoices }
  | { type: 'FETCH_EMPTY' }
  | { type: 'FETCH_FAIL' }
  | { type: 'RESET' }

function reducer(state: LoadState, action: LoadAction): LoadState {
  switch (action.type) {
    case 'FETCH_START':    return { status: 'loading' }
    case 'FETCH_SUCCESS':  return { status: 'ready', grouped: action.grouped }
    case 'FETCH_EMPTY':    return { status: 'empty' }
    case 'FETCH_FAIL':     return { status: 'unavailable' }
    case 'RESET':          return { status: 'idle' }
    default:               return state
  }
}

interface VoiceSectionProps {
  control: Control<FormValues>
  watch: UseFormWatch<FormValues>
}

export function VoiceSection({ control, watch }: VoiceSectionProps) {
  const voiceEnabled = watch('voice.enabled')
  const selectedVoiceId = watch('voice.voiceId')

  const [loadState, dispatch] = useReducer(reducer, { status: 'idle' })
  const [previewStatus, dispatchPreview] = useReducer(
    (_s: 'idle' | 'loading' | 'playing', a: 'idle' | 'loading' | 'playing') => a,
    'idle',
  )
  const audioRef = useRef<HTMLAudioElement | null>(null)

  // Fetch curated voices once when voice is enabled. Depend ONLY on
  // voiceEnabled — including loadState.status here would re-run the effect on
  // the idle→loading transition, whose cleanup cancels the in-flight request.
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

  // Stop preview when voice section is disabled.
  useEffect(() => {
    if (!voiceEnabled) stopPreview()
  }, [voiceEnabled]) // stopPreview is a stable local function — dep omission is intentional

  function stopPreview() {
    if (audioRef.current) {
      audioRef.current.pause()
      audioRef.current = null
    }
    dispatchPreview('idle')
  }

  // Find selected voice in grouped data for preview URL lookup.
  const allVoices: VoiceOption[] =
    loadState.status === 'ready'
      ? [...loadState.grouped.male, ...loadState.grouped.female]
      : []
  const selectedVoice = allVoices.find((v) => v.id === selectedVoiceId)

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
  }, [selectedVoice, previewStatus]) // stopPreview is a stable local function

  return (
    <section className="space-y-4">
      <h2 className="text-base font-semibold border-b pb-2">Voice</h2>

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
        <div className="space-y-4 rounded-lg border p-4">
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

          {/* Voice picker */}
          <div className="space-y-1.5">
            <Label htmlFor="voiceId">Bot voice</Label>

            {/* Unavailable: API key missing or fetch error */}
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

            {/* Empty: curated list has no voices yet */}
            {loadState.status === 'empty' && (
              <div className="flex items-start gap-2 rounded-md bg-muted border px-3 py-2 text-sm text-muted-foreground">
                <AlertCircleIcon className="w-4 h-4 mt-0.5 flex-shrink-0" aria-hidden="true" />
                <span>
                  No voices available yet — ask the platform owner to add voices.
                </span>
              </div>
            )}

            {/* Loading spinner */}
            {loadState.status === 'loading' && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <LoaderCircleIcon className="w-4 h-4 animate-spin" aria-hidden="true" />
                Loading voices…
              </div>
            )}

            {/* Grouped select + preview button */}
            {loadState.status === 'ready' && (
              <div className="flex items-center gap-2">
                <Controller
                  name="voice.voiceId"
                  control={control}
                  render={({ field }) => (
                    <select
                      id="voiceId"
                      value={field.value ?? ''}
                      onChange={(e) => field.onChange(e.target.value)}
                      className="flex-1 h-9 rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                      aria-label="Select a voice"
                    >
                      <option value="" disabled>Select a voice…</option>
                      {loadState.grouped.male.length > 0 && (
                        <optgroup label="Men">
                          {loadState.grouped.male.map((v) => (
                            <option key={v.id} value={v.id}>{v.name}</option>
                          ))}
                        </optgroup>
                      )}
                      {loadState.grouped.female.length > 0 && (
                        <optgroup label="Women">
                          {loadState.grouped.female.map((v) => (
                            <option key={v.id} value={v.id}>{v.name}</option>
                          ))}
                        </optgroup>
                      )}
                    </select>
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
            )}
          </div>
        </div>
      )}
    </section>
  )
}
