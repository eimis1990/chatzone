/**
 * Built-in ElevenLabs Agent LLMs a client can pick for voice calls.
 * Values are the exact model ids ElevenLabs expects in
 * conversation_config.agent.prompt.llm.
 * See https://elevenlabs.io/docs/eleven-agents/customization/llm
 */
export interface VoiceLlmOption {
  value: string
  label: string
}

// Values are exact ElevenLabs agent LLM ids (validated against the API's
// accepted enum — invalid ids cause the agent PATCH to 400).
export const VOICE_LLM_OPTIONS: VoiceLlmOption[] = [
  { value: 'gpt-4o-mini', label: 'GPT-4o mini — fast (default)' },
  { value: 'gpt-4o', label: 'GPT-4o — most capable OpenAI' },
  { value: 'gemini-2.5-flash', label: 'Gemini 2.5 Flash' },
  { value: 'gemini-2.5-flash-lite', label: 'Gemini 2.5 Flash Lite' },
  { value: 'qwen35-397b-a17b', label: 'Qwen 3.5 397B' },
  { value: 'claude-haiku-4-5', label: 'Claude Haiku 4.5' },
]

export const DEFAULT_VOICE_LLM = 'gpt-4o-mini'

/** True if `value` is one of our offered, API-valid model ids. */
export function isValidVoiceLlm(value?: string): boolean {
  return !!value && VOICE_LLM_OPTIONS.some((o) => o.value === value)
}

export function voiceLlmLabel(value?: string): string {
  return VOICE_LLM_OPTIONS.find((o) => o.value === value)?.label ?? value ?? DEFAULT_VOICE_LLM
}
