/**
 * Room visualizer — image editing that places selected store products into a
 * visitor's room photo. Two engines: Gemini ("Nano Banana Pro", default) and
 * OpenAI GPT Image 2, selected per bot via config.roomVisualizerModel.
 * Server-only (Node): never import from edge routes or the prompt path.
 */
import { GoogleGenAI } from '@google/genai'
import { getEnv } from '@/lib/env'

export type VisualizerModel = 'nano-banana-pro' | 'gpt-image-2'

export interface InlineImage {
  /** Raw base64 payload (no `data:` prefix). */
  data: string
  mimeType: string
}

const ALLOWED_MIMES = new Set(['image/jpeg', 'image/png', 'image/webp'])
const MAX_IMAGE_BYTES = 8 * 1024 * 1024
const MAX_INSTRUCTION_CHARS = 200

// "Nano Banana Pro" tier — markedly better at keeping the customer's room
// intact while swapping/adding products. ~3x the cost of gemini-2.5-flash-image;
// drop back to that constant if spend becomes an issue.
const MODEL = 'gemini-3-pro-image-preview'

/**
 * Month key for the visualizer_usage table — first day of the current UTC
 * month, matching the DB's `date_trunc('month', now())::date`.
 */
export function visualizerUsageMonth(now = new Date()): string {
  return `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}-01`
}

export function sanitizeInstruction(raw: string | undefined): string {
  if (!raw) return ''
  return raw.replace(/\s+/g, ' ').trim().slice(0, MAX_INSTRUCTION_CHARS)
}

export function parseImageDataUrl(dataUrl: string): InlineImage | null {
  const m = /^data:([a-z]+\/[a-z0-9.+-]+);base64,([A-Za-z0-9+/=]+)$/.exec(dataUrl)
  if (!m) return null
  const [, mimeType, data] = m
  if (!ALLOWED_MIMES.has(mimeType)) return null
  // base64 → bytes: 3/4 ratio is close enough for a size cap.
  if (data.length * 0.75 > MAX_IMAGE_BYTES) return null
  return { mimeType, data }
}

/** Aspect ratios the Gemini image models accept. */
const SUPPORTED_ASPECTS = ['1:1', '2:3', '3:2', '3:4', '4:3', '4:5', '5:4', '9:16', '16:9', '21:9'] as const

/** Closest supported aspect ratio for a room photo, so renders aren't letterboxed. */
export function closestAspectRatio(width: number, height: number): string {
  if (!(width > 0) || !(height > 0)) return '4:3'
  const target = width / height
  let best: string = '4:3'
  let bestDiff = Infinity
  for (const a of SUPPORTED_ASPECTS) {
    const [w, h] = a.split(':').map(Number)
    const diff = Math.abs(w / h - target)
    if (diff < bestDiff) {
      bestDiff = diff
      best = a
    }
  }
  return best
}

export function buildVisualizePrompt(titles: string[], instruction: string): string {
  const list = titles.map((t, i) => `${i + 2}. ${t}`).join('\n')
  return [
    'The first image is a photo of a room. Each following image is a furniture',
    'or home product, in this order:',
    list,
    'Edit the room photo so these exact products are placed naturally in the',
    'room. If the room already contains furniture of the same type as a product',
    '(for example it already has a sofa and a product is a sofa), REPLACE that',
    'existing furniture with the product in the same spot; otherwise add the',
    'product where it fits naturally. Preserve each product\'s shape, materials,',
    'colors and proportions exactly as shown in its image. Match the room\'s',
    'perspective, lighting and shadows. Keep everything else in the room',
    'unchanged — walls, floor, windows, decor and all other furniture.',
    instruction ? `Placement request from the customer: ${instruction}` : '',
    'Keep the exact framing and aspect ratio of the room photo — no borders,',
    'white bars or padding. Return only the edited room image.',
  ]
    .filter(Boolean)
    .join('\n')
}

interface RenderArgs {
  roomImage: InlineImage
  productImages: InlineImage[]
  titles: string[]
  instruction: string
  /** Supported Gemini aspect string (see closestAspectRatio); omit for model default. */
  aspectRatio?: string
  /** Engine — defaults to Nano Banana Pro (best at keeping the room intact). */
  model?: VisualizerModel
}

export async function renderRoomScene(args: RenderArgs): Promise<InlineImage> {
  return args.model === 'gpt-image-2' ? renderWithGptImage(args) : renderWithGemini(args)
}

async function renderWithGemini(args: RenderArgs): Promise<InlineImage> {
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) throw new Error('GEMINI_API_KEY is not configured')
  const ai = new GoogleGenAI({ apiKey })

  const parts = [
    { text: buildVisualizePrompt(args.titles, args.instruction) },
    { inlineData: { mimeType: args.roomImage.mimeType, data: args.roomImage.data } },
    ...args.productImages.map((img) => ({
      inlineData: { mimeType: img.mimeType, data: img.data },
    })),
  ]

  const response = await ai.models.generateContent({
    model: MODEL,
    contents: [{ role: 'user', parts }],
    config: {
      responseModalities: ['TEXT', 'IMAGE'],
      ...(args.aspectRatio ? { imageConfig: { aspectRatio: args.aspectRatio } } : {}),
    },
  })

  const out = response.candidates?.[0]?.content?.parts?.find((p) => p.inlineData?.data)
  if (!out?.inlineData?.data) throw new Error('Gemini returned no image')
  return { data: out.inlineData.data, mimeType: out.inlineData.mimeType ?? 'image/png' }
}

/** GPT Image accepts fixed sizes only — pick the closest to the room's aspect. */
export function gptImageSize(aspectRatio: string | undefined): string {
  if (!aspectRatio) return 'auto'
  const [w, h] = aspectRatio.split(':').map(Number)
  if (!(w > 0) || !(h > 0)) return 'auto'
  const r = w / h
  if (r > 1.15) return '1536x1024'
  if (r < 0.87) return '1024x1536'
  return '1024x1024'
}

/**
 * OpenAI GPT Image 2 via the images/edits endpoint (multipart, raw fetch —
 * house style, see lib/ai/transcribe.ts). Room photo first, then products, so
 * buildVisualizePrompt's numbering matches.
 */
async function renderWithGptImage(args: RenderArgs): Promise<InlineImage> {
  const form = new FormData()
  form.append('model', 'gpt-image-2')
  form.append('prompt', buildVisualizePrompt(args.titles, args.instruction))
  form.append('size', gptImageSize(args.aspectRatio))
  // 'high' quality — room preservation falls apart below it. (No input_fidelity
  // param here: gpt-image-2 rejects it — verified live 2026-07-23.)
  form.append('quality', 'high')

  const images = [args.roomImage, ...args.productImages]
  images.forEach((img, i) => {
    const ext = img.mimeType.split('/')[1] ?? 'png'
    form.append(
      'image[]',
      new Blob([Buffer.from(img.data, 'base64')], { type: img.mimeType }),
      i === 0 ? `room.${ext}` : `product-${i}.${ext}`,
    )
  })

  const res = await fetch('https://api.openai.com/v1/images/edits', {
    method: 'POST',
    headers: { Authorization: `Bearer ${getEnv().OPENAI_API_KEY}` },
    body: form,
  })
  if (!res.ok) {
    const body = await res.text().catch(() => '')
    throw new Error(`GPT Image HTTP ${res.status}: ${body.slice(0, 300)}`)
  }
  const data = (await res.json()) as { data?: { b64_json?: string }[] }
  const b64 = data.data?.[0]?.b64_json
  if (!b64) throw new Error('GPT Image returned no image')
  return { data: b64, mimeType: 'image/png' }
}
