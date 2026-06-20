'use client'

/**
 * VoiceSection — Voice configuration block for ConfigForm.
 *
 * Renders:
 *  - Master enable toggle (voice.enabled)
 *  - TTS toggle (voice.ttsEnabled)
 *  - STT toggle (voice.sttEnabled)
 *  - Voice picker for voice.voiceId, fetched from GET /api/voices
 *  - Preview button that plays the selected voice's previewUrl
 *
 * When ELEVENLABS_API_KEY is absent the GET /api/voices endpoint returns 503;
 * in that case the picker is disabled and an inline notice is shown.
 */

import { useEffect, useRef, useReducer, useCallback } from 'react'
import { Controller, type Control, type UseFormWatch } from 'react-hook-form'
import { PlayIcon, LoaderCircleIcon, AlertCircleIcon } from 'lucide-react'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import type { z } from 'zod'
import type { botConfigSchema } from '@/lib/validation/schemas'

type FormValues = z.input<typeof botConfigSchema>

interface Voice {
  id: string
  name: string
  previewUrl?: string
}

type VoiceLoadState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'ready'; voices: Voice[] }
  | { status: 'unavailable' }

type VoiceLoadAction =
  | { type: 'FETCH_START' }
  | { type: 'FETCH_SUCCESS'; voices: Voice[] }
  | { type: 'FETCH_FAIL' }
  | { type: 'RESET' }

function voiceLoadReducer(state: VoiceLoadState, action: VoiceLoadAction): VoiceLoadState {
  switch (action.type) {
    case 'FETCH_START':
      return { status: 'loading' }
    case 'FETCH_SUCCESS':
      return action.voices.length > 0
        ? { status: 'ready', voices: action.voices }
        : { status: 'unavailable' }
    case 'FETCH_FAIL':
      return { status: 'unavailable' }
    case 'RESET':
      return { status: 'idle' }
    default:
      return state
  }
}

interface VoiceSectionProps {
  control: Control<FormValues>
  watch: UseFormWatch<FormValues>
}

export function VoiceSection({ control, watch }: VoiceSectionProps) {
  const voiceEnabled = watch('voice.enabled')
  const selectedVoiceId = watch('voice.voiceId')

  const [loadState, dispatch] = useReducer(voiceLoadReducer, { status: 'idle' })
  const [previewStatus, dispatchPreview] = useReducer(
    (s: 'idle' | 'loading' | 'playing', a: 'idle' | 'loading' | 'playing') => a,
    'idle',
  )
  const audioRef = useRef<HTMLAudioElement | null>(null)

  // Fetch voices or reset when voiceEnabled changes.
  useEffect(() => {
    if (!voiceEnabled) {
      dispatch({ type: 'RESET' })
      return
    }
    if (loadState.status !== 'idle') return

    let cancelled = false
    dispatch({ type: 'FETCH_START' })

    fetch('/api/voices')
      .then(async (res) => {
        const data = (await res.json()) as { voices?: Voice[] }
        if (cancelled) return
        if (!res.ok || !data.voices) {
          dispatch({ type: 'FETCH_FAIL' })
        } else {
          dispatch({ type: 'FETCH_SUCCESS', voices: data.voices })
        }
      })
      .catch(() => {
        if (!cancelled) dispatch({ type: 'FETCH_FAIL' })
      })

    return () => {
      cancelled = true
    }
  }, [voiceEnabled, loadState.status])

  // Stop preview when section is disabled.
  useEffect(() => {
    if (!voiceEnabled) {
      stopPreview()
    }
  // stopPreview is defined inline and stable — omitting from deps is intentional.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [voiceEnabled])

  function stopPreview() {
    if (audioRef.current) {
      audioRef.current.pause()
      audioRef.current = null
    }
    dispatchPreview('idle')
  }

  const voices = loadState.status === 'ready' ? loadState.voices : []
  const selectedVoice = voices.find((v) => v.id === selectedVoiceId)

  const handlePreview = useCallback(async () => {
    if (!selectedVoice?.previewUrl) return
    if (previewStatus === 'playing') {
      stopPreview()
      return
    }

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
            <Label>Bot voice</Label>

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

            {loadState.status === 'loading' && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <LoaderCircleIcon className="w-4 h-4 animate-spin" aria-hidden="true" />
                Loading voices…
              </div>
            )}

            {(loadState.status === 'ready' || loadState.status === 'idle') && (
              <div className="flex items-center gap-2">
                <Controller
                  name="voice.voiceId"
                  control={control}
                  render={({ field }) => (
                    <Select
                      value={field.value}
                      onValueChange={field.onChange}
                      disabled={loadState.status !== 'ready'}
                    >
                      <SelectTrigger className="flex-1">
                        <SelectValue placeholder="Select a voice…" />
                      </SelectTrigger>
                      <SelectContent>
                        {voices.map((v) => (
                          <SelectItem key={v.id} value={v.id}>
                            {v.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />

                <Button
                  type="button"
                  variant="outline"
                  size="icon-sm"
                  onClick={handlePreview}
                  disabled={!selectedVoice?.previewUrl || loadState.status !== 'ready'}
                  aria-label={previewStatus === 'playing' ? 'Stop preview' : 'Preview voice'}
                >
                  {previewStatus === 'loading' ? (
                    <LoaderCircleIcon className="w-4 h-4 animate-spin" aria-hidden="true" />
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
