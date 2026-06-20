import type { PlatformVoice } from '@/lib/types'
import type { VoiceOption } from '@/lib/ai/voices'

export interface GroupedVoices {
  male: VoiceOption[]
  female: VoiceOption[]
}

function toOption(v: PlatformVoice): VoiceOption {
  return {
    id: v.voice_id,
    name: v.name,
    ...(v.preview_url ? { previewUrl: v.preview_url } : {}),
  }
}

/**
 * Groups owner-curated voices into male/female for the configurator picker,
 * ordered by sort_order then name within each group.
 */
export function groupVoicesByGender(rows: PlatformVoice[]): GroupedVoices {
  const sorted = [...rows].sort(
    (a, b) => a.sort_order - b.sort_order || a.name.localeCompare(b.name),
  )
  return {
    male: sorted.filter((v) => v.gender === 'male').map(toOption),
    female: sorted.filter((v) => v.gender === 'female').map(toOption),
  }
}
