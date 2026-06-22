/**
 * Hand-written row types mirroring supabase/migrations.
 * (Can later be replaced by `supabase gen types typescript`.)
 */

export type UserRole = 'owner' | 'client'
export type OrgStatus = 'active' | 'suspended'
export type MemberRole = 'admin' | 'member'
export type InviteStatus = 'pending' | 'accepted' | 'expired'
export type BotStatus = 'active' | 'paused'
export type SourceType = 'file' | 'url' | 'qa' | 'text'
export type SourceStatus = 'pending' | 'processing' | 'ready' | 'error'
export type MessageRole = 'user' | 'assistant' | 'system'

export interface Profile {
  id: string
  role: UserRole
  full_name: string | null
  avatar_url: string | null
  created_at: string
  updated_at: string
}

export interface Organization {
  id: string
  name: string
  slug: string | null
  status: OrgStatus
  created_by: string | null
  created_at: string
  updated_at: string
}

export interface OrganizationMember {
  id: string
  org_id: string
  user_id: string
  role: MemberRole
  created_at: string
}

export interface Invite {
  id: string
  org_id: string
  email: string
  token: string
  status: InviteStatus
  expires_at: string
  invited_by: string | null
  created_at: string
}

/** Lead-capture field definition (part of BotConfig). */
export interface LeadField {
  key: string
  label: string
  required: boolean
}

export type LeadTrigger = 'on_fallback' | 'after_n_messages' | 'manual'

export type VoiceGender = 'male' | 'female'
export type BotLanguage = 'en' | 'lt'

export interface PlatformVoice {
  id: string
  voice_id: string
  name: string
  gender: VoiceGender
  preview_url: string | null
  sort_order: number
  created_at: string
}

export interface VoiceConfig {
  enabled: boolean
  ttsEnabled: boolean
  sttEnabled: boolean
  /** Per-language voice ids. `en` is required; others optional. */
  voices: Partial<Record<BotLanguage, string>> & { en: string }
  /** Built-in ElevenLabs LLM the live-call agent uses. See lib/ai/voice-models.ts. */
  llmModel?: string
}

/** Visitor-facing content that differs per language. */
export interface LanguageContent {
  greeting: string
  suggestedQuestions: string[]
  fallbackMessage: string
}

export interface BotConfig {
  displayName: string
  avatarUrl?: string
  /** Optional privacy-policy URL; shows a consent line in the widget when set. */
  privacyUrl?: string
  theme: {
    primaryColor: string
    position: 'bottom-right' | 'bottom-left'
    bubbleIcon?: string
    cornerRadius: number
    bubbleRadius: number
    /** Chat font key — see lib/fonts.ts FONT_OPTIONS. */
    fontFamily?: string
  }
  voice: VoiceConfig
  /** Enabled languages. Always includes 'en'; the first entry is the default. */
  languages: BotLanguage[]
  /** Per-language content. `en` is always present. */
  content: Partial<Record<BotLanguage, LanguageContent>> & { en: LanguageContent }
  systemPrompt: string
  persona: {
    tone: string
    verbosity: 'concise' | 'balanced' | 'detailed'
  }
  model: string
  temperature: number
  leadCapture: {
    enabled: boolean
    trigger: LeadTrigger
    afterNMessages?: number
    fields: LeadField[]
  }
  allowedDomains: string[]
  /** Live product search (e-commerce). */
  commerce: {
    enabled: boolean
    provider: 'woocommerce'
    storeUrl: string
  }
}

export interface Bot {
  id: string
  org_id: string
  name: string
  status: BotStatus
  public_key: string
  config: BotConfig
  elevenlabs_agent_id: string | null
  elevenlabs_agent_hash: string | null
  created_at: string
  updated_at: string
}

export interface KnowledgeSource {
  id: string
  bot_id: string
  type: SourceType
  name: string
  status: SourceStatus
  error_message: string | null
  metadata: Record<string, unknown>
  created_at: string
  updated_at: string
}

export interface DocumentChunk {
  id: string
  bot_id: string
  source_id: string
  content: string
  embedding: number[] | null
  token_count: number | null
  chunk_index: number
  created_at: string
}

export interface Conversation {
  id: string
  bot_id: string
  visitor_id: string
  metadata: Record<string, unknown>
  started_at: string
  last_message_at: string
  // Conversation intelligence (Phase 1)
  summary?: string | null
  topics?: string[] | null
  analyzed_at?: string | null
  had_fallback?: boolean
}

export interface Citation {
  source_id: string
  snippet: string
}

export interface Message {
  id: string
  conversation_id: string
  role: MessageRole
  content: string
  citations: Citation[]
  token_count: number | null
  created_at: string
  /** Visitor thumbs feedback on an assistant reply (Phase 1). */
  feedback?: 'up' | 'down' | null
}

export interface Lead {
  id: string
  bot_id: string
  conversation_id: string | null
  fields: Record<string, string>
  created_at: string
}

/** Return shape of the match_chunks RPC. */
export interface MatchedChunk {
  id: string
  content: string
  source_id: string
  similarity: number
}
