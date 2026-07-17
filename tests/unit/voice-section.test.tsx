import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { useForm } from 'react-hook-form'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { VoiceSection } from '@/components/client/VoiceSection'
import { DEFAULT_VOICE_LLM } from '@/lib/ai/voice-models'
import type { botConfigFormSchema } from '@/lib/validation/schemas'
import type { z } from 'zod'

type FormValues = z.input<typeof botConfigFormSchema>

function VoiceSectionHarness() {
  const { control, watch, setValue } = useForm<FormValues>({
    defaultValues: {
      voice: {
        enabled: false,
        ttsEnabled: true,
        sttEnabled: true,
        voices: {},
        llmModel: DEFAULT_VOICE_LLM,
      },
    },
  })

  return (
    <VoiceSection
      control={control}
      watch={watch}
      setValue={setValue}
      activeLang="en"
      enabledLanguages={['en']}
    />
  )
}

describe('VoiceSection', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  it('keeps the async voice picker controlled while selecting its initial voice', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          male: [{ id: 'voice-alex', name: 'Alex' }],
          female: [],
        }),
      }),
    )
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})

    render(<VoiceSectionHarness />)

    fireEvent.click(screen.getByRole('button', { name: 'Expand section' }))
    fireEvent.click(screen.getByRole('switch', { name: 'Enable voice' }))

    await waitFor(() => {
      expect(screen.getByRole('combobox', { name: 'Select English voice' })).toHaveTextContent('Alex')
    })

    const controlledStateWarnings = consoleError.mock.calls.filter(([message]) =>
      String(message).includes('changing the uncontrolled value state of Select'),
    )
    expect(controlledStateWarnings).toHaveLength(0)
  })
})
