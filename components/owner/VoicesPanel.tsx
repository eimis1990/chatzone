'use client'

/**
 * VoicesPanel — combines VoiceList + AddVoiceDialog with shared state.
 * Receives the server-fetched initial voices and manages client-side mutations.
 */

import { useState, useRef, useCallback } from 'react'
import { TrashIcon, PlayIcon, SquareIcon, LoaderCircleIcon, MicIcon, PlusIcon, AlertCircleIcon, SearchIcon } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '@/components/ui/dialog'
import { toast } from 'sonner'
import type { PlatformVoice, VoiceGender } from '@/lib/types'

// ---------------------------------------------------------------------------
// Add Voice Dialog
// ---------------------------------------------------------------------------

interface CatalogVoice {
  id: string
  name: string
  previewUrl?: string
}

type LoadStatus = 'idle' | 'loading' | 'ready' | 'unavailable'

interface AddVoiceDialogProps {
  onAdded: (voice: PlatformVoice) => void
}

function AddVoiceDialog({ onAdded }: AddVoiceDialogProps) {
  const [open, setOpen] = useState(false)
  const [loadStatus, setLoadStatus] = useState<LoadStatus>('idle')
  const [voices, setVoices] = useState<CatalogVoice[]>([])
  const [search, setSearch] = useState('')
  const [selectedId, setSelectedId] = useState('')
  const [gender, setGender] = useState<VoiceGender>('male')
  const [saving, setSaving] = useState(false)
  const [previewState, setPreviewState] = useState<'idle' | 'loading' | 'playing'>('idle')
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const cancelRef = useRef(false)

  const stopPreview = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause()
      audioRef.current = null
    }
    setPreviewState('idle')
  }, [])

  const handleOpenChange = useCallback(
    async (next: boolean) => {
      setOpen(next)
      if (!next) {
        cancelRef.current = true
        setSearch('')
        setSelectedId('')
        setGender('male')
        setLoadStatus('idle')
        setVoices([])
        stopPreview()
        return
      }
      cancelRef.current = false
      setLoadStatus('loading')
      try {
        const res = await fetch('/api/voices')
        const data = (await res.json()) as { voices?: CatalogVoice[] }
        if (cancelRef.current) return
        if (!res.ok || !data.voices || data.voices.length === 0) {
          setLoadStatus('unavailable')
        } else {
          setVoices(data.voices)
          setLoadStatus('ready')
        }
      } catch {
        if (!cancelRef.current) setLoadStatus('unavailable')
      }
    },
    [stopPreview],
  )

  const selectedVoice = voices.find((v) => v.id === selectedId)
  const filtered = voices.filter((v) => v.name.toLowerCase().includes(search.toLowerCase()))

  const handlePreview = useCallback(async () => {
    if (!selectedVoice?.previewUrl) return
    if (previewState === 'playing') { stopPreview(); return }
    setPreviewState('loading')
    stopPreview()
    const audio = new Audio(selectedVoice.previewUrl)
    audioRef.current = audio
    audio.onended = () => setPreviewState('idle')
    audio.onerror = () => setPreviewState('idle')
    try { await audio.play(); setPreviewState('playing') } catch { setPreviewState('idle') }
  }, [selectedVoice, previewState, stopPreview])

  const handleSave = useCallback(async () => {
    if (!selectedVoice) return
    setSaving(true)
    try {
      const res = await fetch('/api/owner/voices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          voiceId: selectedVoice.id,
          name: selectedVoice.name,
          gender,
          previewUrl: selectedVoice.previewUrl,
        }),
      })
      const data = (await res.json()) as { id?: string; error?: string }
      if (!res.ok) { toast.error(data.error ?? 'Failed to add voice'); return }
      const newVoice: PlatformVoice = {
        id: data.id!,
        voice_id: selectedVoice.id,
        name: selectedVoice.name,
        gender,
        preview_url: selectedVoice.previewUrl ?? null,
        sort_order: 0,
        created_at: new Date().toISOString(),
      }
      onAdded(newVoice)
      toast.success(`"${selectedVoice.name}" added`)
      setOpen(false)
    } catch {
      toast.error('Failed to add voice')
    } finally {
      setSaving(false)
    }
  }, [selectedVoice, gender, onAdded])

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger
        render={
          <Button type="button">
            <PlusIcon className="size-4" aria-hidden="true" />
            Add voice
          </Button>
        }
      />
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Add a voice</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {loadStatus === 'loading' && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <LoaderCircleIcon className="size-4 animate-spin" aria-hidden="true" />
              Loading catalog…
            </div>
          )}
          {loadStatus === 'unavailable' && (
            <div className="flex items-start gap-2 rounded-md bg-amber-50 border border-amber-200 px-3 py-2 text-sm text-amber-800">
              <AlertCircleIcon className="size-4 mt-0.5 flex-shrink-0" aria-hidden="true" />
              <span>
                Set{' '}
                <code className="font-mono text-xs bg-amber-100 px-1 rounded">ELEVENLABS_API_KEY</code>{' '}
                to add voices.
              </span>
            </div>
          )}
          {loadStatus === 'ready' && (
            <>
              <div className="relative">
                <SearchIcon className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" aria-hidden="true" />
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search voices…"
                  className="pl-8"
                  aria-label="Search ElevenLabs voices"
                />
              </div>
              <div
                className="border rounded-lg overflow-y-auto max-h-56"
                role="listbox"
                aria-label="ElevenLabs voices"
              >
                {filtered.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-6">No voices match.</p>
                ) : (
                  filtered.map((v) => (
                    <button
                      key={v.id}
                      type="button"
                      role="option"
                      aria-selected={selectedId === v.id}
                      onClick={() => { setSelectedId(v.id); stopPreview() }}
                      className={`w-full text-left px-3 py-2 text-sm transition-colors hover:bg-muted ${
                        selectedId === v.id ? 'bg-primary/10 font-medium' : ''
                      }`}
                    >
                      {v.name}
                    </button>
                  ))
                )}
              </div>
              <div className="space-y-1.5">
                <Label>Gender</Label>
                <div className="flex gap-4">
                  {(['male', 'female'] as const).map((g) => (
                    <label key={g} className="flex items-center gap-2 cursor-pointer text-sm">
                      <input
                        type="radio"
                        name="voice-gender"
                        value={g}
                        checked={gender === g}
                        onChange={() => setGender(g)}
                        className="accent-primary"
                      />
                      {g === 'male' ? 'Male' : 'Female'}
                    </label>
                  ))}
                </div>
              </div>
              {selectedVoice && (
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground flex-1 truncate">
                    Selected: <span className="font-medium text-foreground">{selectedVoice.name}</span>
                  </span>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={!selectedVoice.previewUrl || previewState === 'loading'}
                    onClick={handlePreview}
                    aria-label={previewState === 'playing' ? 'Stop preview' : 'Preview voice'}
                  >
                    {previewState === 'loading' ? (
                      <LoaderCircleIcon className="size-4 animate-spin" aria-hidden="true" />
                    ) : previewState === 'playing' ? (
                      <SquareIcon className="size-4" aria-hidden="true" />
                    ) : (
                      <PlayIcon className="size-4" aria-hidden="true" />
                    )}
                    {previewState === 'playing' ? 'Stop' : 'Preview'}
                  </Button>
                </div>
              )}
            </>
          )}
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => handleOpenChange(false)} disabled={saving}>
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleSave}
            disabled={!selectedId || saving || loadStatus !== 'ready'}
          >
            {saving ? (
              <><LoaderCircleIcon className="size-4 animate-spin" aria-hidden="true" />Saving…</>
            ) : 'Add voice'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ---------------------------------------------------------------------------
// Voices Panel (list + add dialog combined)
// ---------------------------------------------------------------------------

interface VoicesPanelProps {
  initialVoices: PlatformVoice[]
}

export function VoicesPanel({ initialVoices }: VoicesPanelProps) {
  const [voices, setVoices] = useState<PlatformVoice[]>(initialVoices)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [previewStates, setPreviewStates] = useState<Record<string, 'idle' | 'loading' | 'playing'>>({})
  const activeAudioRef = useRef<{ id: string; audio: HTMLAudioElement } | null>(null)

  const setPreviewState = (id: string, state: 'idle' | 'loading' | 'playing') => {
    setPreviewStates((prev) => ({ ...prev, [id]: state }))
  }

  const handlePreview = useCallback(
    async (voice: PlatformVoice) => {
      const currentState = previewStates[voice.id] ?? 'idle'
      if (activeAudioRef.current) {
        activeAudioRef.current.audio.pause()
        const prevId = activeAudioRef.current.id
        activeAudioRef.current = null
        if (prevId !== voice.id) setPreviewState(prevId, 'idle')
      }
      if (currentState === 'playing') { setPreviewState(voice.id, 'idle'); return }
      if (!voice.preview_url) return
      setPreviewState(voice.id, 'loading')
      const audio = new Audio(voice.preview_url)
      activeAudioRef.current = { id: voice.id, audio }
      audio.onended = () => {
        if (activeAudioRef.current?.id === voice.id) activeAudioRef.current = null
        setPreviewState(voice.id, 'idle')
      }
      audio.onerror = () => {
        if (activeAudioRef.current?.id === voice.id) activeAudioRef.current = null
        setPreviewState(voice.id, 'idle')
        toast.error('Could not play preview')
      }
      try { await audio.play(); setPreviewState(voice.id, 'playing') }
      catch { setPreviewState(voice.id, 'idle') }
    },
    [previewStates],
  )

  const handleDelete = useCallback(async (id: string, name: string) => {
    setDeletingId(id)
    try {
      const res = await fetch(`/api/owner/voices?id=${encodeURIComponent(id)}`, { method: 'DELETE' })
      if (!res.ok) {
        const data = (await res.json()) as { error?: string }
        toast.error(data.error ?? 'Failed to delete voice')
        return
      }
      setVoices((prev) => prev.filter((v) => v.id !== id))
      toast.success(`"${name}" removed`)
    } catch {
      toast.error('Failed to delete voice')
    } finally {
      setDeletingId(null)
    }
  }, [])

  const handleAdded = useCallback((voice: PlatformVoice) => {
    setVoices((prev) => [...prev, voice])
  }, [])

  return (
    <div className="space-y-6">
      {/* Header row */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Voices</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manage the curated voice catalog available to clients.
          </p>
        </div>
        <AddVoiceDialog onAdded={handleAdded} />
      </div>

      {/* List */}
      {voices.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed py-20 text-center gap-3">
          <MicIcon className="size-10 text-muted-foreground" aria-hidden="true" />
          <p className="font-medium">No voices yet</p>
          <p className="text-sm text-muted-foreground max-w-sm">
            Add voices from your ElevenLabs catalog. Clients will see a Men / Women grouped picker.
          </p>
          <AddVoiceDialog onAdded={handleAdded} />
        </div>
      ) : (
        <div className="rounded-lg border overflow-hidden">
          {/* Table header */}
          <div className="grid grid-cols-[1fr_110px_80px_80px] gap-4 px-4 py-2.5 text-xs font-medium text-muted-foreground bg-muted/40 border-b">
            <span>Name</span>
            <span>Gender</span>
            <span className="text-center">Preview</span>
            <span className="text-center">Remove</span>
          </div>

          {voices.map((voice) => {
            const previewState = previewStates[voice.id] ?? 'idle'
            const isDeleting = deletingId === voice.id
            return (
              <div
                key={voice.id}
                className="grid grid-cols-[1fr_110px_80px_80px] gap-4 px-4 py-3 items-center border-b last:border-b-0 text-sm hover:bg-muted/20 transition-colors"
              >
                <span className="font-medium">{voice.name}</span>
                <span>
                  <Badge variant={voice.gender === 'male' ? 'default' : 'secondary'}>
                    {voice.gender === 'male' ? 'Male' : 'Female'}
                  </Badge>
                </span>
                <span className="flex justify-center">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    disabled={!voice.preview_url || previewState === 'loading'}
                    onClick={() => handlePreview(voice)}
                    aria-label={previewState === 'playing' ? `Stop preview of ${voice.name}` : `Preview ${voice.name}`}
                  >
                    {previewState === 'loading' ? (
                      <LoaderCircleIcon className="size-4 animate-spin" aria-hidden="true" />
                    ) : previewState === 'playing' ? (
                      <SquareIcon className="size-4" aria-hidden="true" />
                    ) : (
                      <PlayIcon className="size-4" aria-hidden="true" />
                    )}
                  </Button>
                </span>
                <span className="flex justify-center">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    disabled={isDeleting}
                    onClick={() => handleDelete(voice.id, voice.name)}
                    aria-label={`Remove ${voice.name}`}
                    className="text-destructive hover:text-destructive hover:bg-destructive/10"
                  >
                    {isDeleting ? (
                      <LoaderCircleIcon className="size-4 animate-spin" aria-hidden="true" />
                    ) : (
                      <TrashIcon className="size-4" aria-hidden="true" />
                    )}
                  </Button>
                </span>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
