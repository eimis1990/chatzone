/**
 * Hand-written row types mirroring supabase/migrations.
 * (Can later be replaced by `supabase gen types typescript`.)
 */
import type { CommerceProduct } from '@/lib/commerce/types'

export type UserRole = 'owner' | 'client'
export type OrgStatus = 'active' | 'suspended'
export type MemberRole = 'admin' | 'member'
export type InviteStatus = 'pending' | 'accepted' | 'expired'
export type BotStatus = 'active' | 'paused'
export type SourceType = 'file' | 'url' | 'qa' | 'text'
export type SourceStatus = 'pending' | 'processing' | 'ready' | 'error'
export type MessageRole = 'user' | 'assistant' | 'system'
export type Plan = 'free' | 'starter' | 'growth' | 'scale' | 'enterprise'
export type BillingInterval = 'month' | 'year'
export type SubscriptionStatus =
  | 'inactive'
  | 'trialing'
  | 'active'
  | 'past_due'
  | 'canceled'
  | 'unpaid'

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
  // Billing (Stripe). See supabase/migrations/0014_billing.sql.
  stripe_customer_id: string | null
  stripe_subscription_id: string | null
  plan: Plan
  subscription_status: SubscriptionStatus
  billing_interval: BillingInterval | null
  current_period_end: string | null
  cancel_at_period_end: boolean
  voice_addon: boolean
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
  role: MemberRole
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

/**
 * A welcome-screen quick action. A plain string is shorthand for a button whose
 * label and sent message are identical (legacy). The object form lets the label
 * (what the visitor sees) differ from what happens on click:
 *   - `url` set    → the server fetches that endpoint and renders product cards.
 *   - `prompt` set → that message is sent to the bot.
 *   - neither      → the label itself is sent.
 * `url` takes priority over `prompt`.
 */
export type SuggestedQuestion = string | { label: string; prompt?: string; url?: string }

/** Visitor-facing content that differs per language. */
export interface LanguageContent {
  greeting: string
  suggestedQuestions: SuggestedQuestion[]
  fallbackMessage: string
}

export interface BotConfig {
  displayName: string
  /** Short subtitle under the name on the welcome screen (e.g. "Virtual assistant"). */
  tagline?: string
  /** Company logo — the default avatar shown in the widget. */
  avatarUrl?: string
  /** Optional bot-specific image; overrides the company logo when set. */
  botAvatarUrl?: string
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
    /** Floating launcher shape: a plain circle, or a pill with a text label. */
    launcherStyle?: 'circle' | 'pill'
    /** Text shown next to the icon when launcherStyle is 'pill'. */
    launcherLabel?: string
    /** Show the company logo in the launcher instead of the default chat icon. */
    launcherShowLogo?: boolean
    /** Launcher background color; falls back to primaryColor when unset. */
    launcherColor?: string
    /** Show the "talk with agent" voice call button in the header (when voice on). */
    showCallButton?: boolean
    /** Corner radius (px) for the header nav buttons (call + restart). */
    navButtonRadius?: number
    /** Chat-body background color (base layer). Defaults to white. */
    backgroundColor?: string
    /** Optional chat-body background image, overlaid on top of backgroundColor. */
    backgroundImageUrl?: string
    /** Opacity (0–100) of the background image over the color. Defaults to 100. */
    backgroundImageOpacity?: number
    /** Frosted-glass message bubbles (translucent + backdrop blur). */
    glassBubbles?: boolean
    /** Optional custom send-button icon (uploaded image URL). */
    sendIconUrl?: string
    /** Border on message bubbles + suggested-action tiles. */
    bubbleBorderColor?: string
    bubbleBorderWidth?: number
  }
  voice: VoiceConfig
  /** Enabled languages. Always includes 'en'; the first entry is the default. */
  languages: BotLanguage[]
  /** Language the widget opens in (must be one of `languages`; defaults to the first). */
  defaultLanguage?: BotLanguage
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
    provider: 'woocommerce' | 'shopify'
    storeUrl: string
    /** WooCommerce REST consumer key/secret — server-only, for order lookups. */
    restKey?: string
    restSecret?: string
    /** Shopify Storefront domain + access token (token is server-only). */
    shopifyDomain?: string
    shopifyToken?: string
    /** A static discount the agent can offer on discount intent. */
    discount?: { enabled: boolean; code?: string; description?: string }
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
  /** Last time the widget loaded this bot's config (embedded & visited). */
  last_seen_at: string | null
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

export type HandoffStatus = 'bot' | 'requested' | 'live' | 'resolved'

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
  /** AI self-evaluation: how well the conversation was handled (1–5) + why. */
  success_score?: number | null
  success_reason?: string | null
  // Human handoff (Phase 2)
  handoff_status?: HandoffStatus
  assigned_to?: string | null
  handoff_requested_at?: string | null
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
  /** Assistant message authored by a human agent vs. the bot (Phase 2). */
  from_human?: boolean
  /** Product suggestions the bot surfaced this turn (Phase 3). */
  products?: CommerceProduct[] | null
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
