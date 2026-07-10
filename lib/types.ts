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
  /** Loqara's own internal org (not a client) — powers the dogfooded landing bot. */
  is_platform: boolean
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

export type LinkedInPostStatus = 'idea' | 'draft' | 'posted'

/** Owner-only LinkedIn content tracker entry (see /owner/linkedin). */
export interface LinkedInPost {
  id: string
  title: string
  body: string
  link: string | null
  status: LinkedInPostStatus
  posted_at: string | null
  created_at: string
  updated_at: string
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

/** Typed quick-action behaviors beyond plain text/url. */
export type SuggestedQuestionAction = 'handoff' | 'lead'

/**
 * A welcome-screen quick action. A plain string is shorthand for a button whose
 * label and sent message are identical (legacy). The object form lets the label
 * (what the visitor sees) differ from what happens on click:
 *   - `action: 'handoff'` → request a human (same flow as "Talk to a person").
 *   - `action: 'lead'`    → open the lead-capture contact form (when enabled).
 *   - `url` set           → the bot replies with a link button to that URL.
 *   - `prompt` set        → that message is sent to the bot.
 *   - none of the above   → the label itself is sent.
 * Precedence: `action` > `url` > `prompt`.
 */
export type SuggestedQuestion =
  | string
  | { label: string; prompt?: string; url?: string; action?: SuggestedQuestionAction }

/** Visitor-facing content that differs per language. */
export interface LanguageContent {
  greeting: string
  suggestedQuestions: SuggestedQuestion[]
  fallbackMessage: string
}

export interface ProactiveGreetingConfig {
  enabled: boolean
  /** Seconds after launcher load; 0 shows immediately. */
  delaySeconds: number
  frequency: 'once_per_session' | 'every_page'
  /** Editable objects keep React Hook Form field arrays stable. */
  messages: Partial<Record<BotLanguage, Array<{ text: string }>>>
  backgroundColor: string
  textColor: string
  cornerRadius: number
  /** `inherit` follows the main chat font. */
  fontFamily: string
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
  /** Business working hours (Mon–Fri, "HH:MM"); drives the after-hours analytics. */
  businessHours?: { start: string; end: string }
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
    /** Animated pulse rings radiating from the circle launcher (circle style only). */
    launcherPulse?: boolean
    /** Launcher background color; falls back to primaryColor when unset. */
    launcherColor?: string
    /** Show the "talk with agent" voice call button in the header (when voice on). */
    showCallButton?: boolean
    /** Show the "talk to a person" human-handoff button (once a chat is underway). */
    showHandoffButton?: boolean
    /** Background color for the voice call button (text auto-contrasts). */
    callButtonColor?: string
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
    /** Composer message-field background; text/placeholder auto-contrast. */
    composerFieldColor?: string
    /** Composer message-field border; empty = auto from field color. */
    composerBorderColor?: string
    /** Send button background; empty = primary color. Radius follows navButtonRadius. */
    sendButtonColor?: string
    /** Border on message bubbles + suggested-action tiles. */
    /** Bot (assistant) bubble background; text auto-contrasts. Empty = default grey. */
    botBubbleColor?: string
    bubbleBorderColor?: string
    bubbleBorderWidth?: number
  }
  voice: VoiceConfig
  /** Languages the bot offers visitors (at least one; first entry is the default). */
  languages: BotLanguage[]
  /** Widget shows a visitor-facing language picker (multilingual bots only). */
  showLanguageSelector?: boolean
  /** Language the widget opens in (must be one of `languages`; defaults to the first). */
  defaultLanguage?: BotLanguage
  /** Per-language content (required for each language in `languages[]`; not English-anchored). */
  content: Partial<Record<BotLanguage, LanguageContent>>
  /** Dismissible message shown above the closed launcher before chat opens. */
  proactiveGreeting?: ProactiveGreetingConfig
  systemPrompt: string
  /** Id of the reusable system_prompts library entry this bot uses (owner-managed).
   *  When set, `systemPrompt` holds a snapshot of that entry's content. */
  systemPromptId?: string
  persona: {
    tone: string
    verbosity: 'concise' | 'balanced' | 'detailed'
  }
  /** "Request rich responses" — append a hidden instruction asking the model to
   *  format replies as Markdown (bold, lists, links). Rendered safely in the
   *  bubble. Defaults to on (treat undefined as true). */
  richResponses?: boolean
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
    provider: 'woocommerce' | 'shopify' | 'magento' | 'feed'
    storeUrl: string
    /** WooCommerce REST consumer key/secret — server-only, for order lookups. */
    restKey?: string
    restSecret?: string
    /** Shopify Storefront domain + access token (token is server-only). */
    shopifyDomain?: string
    shopifyToken?: string
    /** Magento integration access token — server-only, for order lookups. */
    magentoToken?: string
    /** Product feed URL (JSON/XML/CSV) for the 'feed' provider. */
    feedUrl?: string
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
  /** Owner toggle: show this bot's live widget on Loqara's marketing landing page. */
  show_on_landing: boolean
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

/** A knowledge-base quality issue surfaced by the lint pass. */
export type LintFindingType = 'contradiction' | 'stale' | 'gap'
export type LintSeverity = 'high' | 'medium' | 'low'
export interface LintFinding {
  /** Stable fingerprint (type + topic + evidence) — used to dismiss/persist. */
  id: string
  type: LintFindingType
  severity: LintSeverity
  /** The support topic this finding belongs to (e.g. "Returns & refunds"). */
  topic: string
  summary: string
  detail: string
  /** Verbatim snippets from the KB that evidence the issue (e.g. the two conflicting statements). */
  evidence: string[]
  /** The knowledge sources the conflicting excerpts came from — where to go to fix it. */
  sources: { id: string; title: string }[]
  /** One-line concrete resolution the AI suggests (e.g. which value is authoritative). */
  suggestedFix?: string
}

/** A reusable, owner-managed system prompt in the prompt library. */
export interface SystemPrompt {
  id: string
  name: string
  content: string
  created_by: string | null
  created_at: string
  updated_at: string
}

export type HandoffStatus = 'bot' | 'requested' | 'live' | 'resolved'

export type ConversationChannel = 'chat' | 'voice'

export interface Conversation {
  id: string
  bot_id: string
  visitor_id: string
  metadata: Record<string, unknown>
  started_at: string
  last_message_at: string
  /** How the conversation happened: text chat (default) or a voice call. */
  channel?: ConversationChannel
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

export type SalesLeadStatus = 'ready' | 'email_sent' | 'rejected' | 'accepted' | 'client'

/** Owner outreach pipeline row (researched prospect company). */
export interface SalesLead {
  id: string
  name: string
  legal_name: string | null
  website: string
  city: string | null
  vertical: string
  ceo: string | null
  email: string | null
  phone: string | null
  size_info: string | null
  platform: string | null
  hook: string | null
  fit_note: string | null
  source: string | null
  score: number
  score_why: string | null
  email_subject: string | null
  email_body: string | null
  /** Whether the prospect already runs a chatbot (null = unknown). */
  has_chatbot: boolean | null
  status: SalesLeadStatus
  created_at: string
  updated_at: string
}

export type BugStatus = 'open' | 'in_progress' | 'resolved'

export interface BugReport {
  id: string
  reporter_id: string | null
  reporter_email: string | null
  org_id: string | null
  title: string
  description: string
  page: string | null
  user_agent: string | null
  status: BugStatus
  created_at: string
  updated_at: string
}
