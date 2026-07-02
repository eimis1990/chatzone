/**
 * Chat LLM used for visitor-facing conversations (text widget + preview).
 * gpt-4o-mini was too weak for the 14-step commerce tool loop in Lithuanian —
 * inconsistent answers, missed tool calls. Side tasks (tag enrichment, canonical
 * pages, lint, conversation intel) intentionally stay on gpt-4o-mini for cost.
 */
export const DEFAULT_CHAT_MODEL = 'gpt-4.1'

/** Lower default than before (0.3) — consistency beats variety for support. */
export const DEFAULT_TEMPERATURE = 0.2

export interface ChatModelOption {
  value: string
  label: string
}

export const CHAT_MODEL_OPTIONS: ChatModelOption[] = [
  { value: 'gpt-4.1', label: 'GPT-4.1 — best quality (default)' },
  { value: 'gpt-4o', label: 'GPT-4o' },
  { value: 'gpt-4o-mini', label: 'GPT-4o mini — cheapest' },
]
