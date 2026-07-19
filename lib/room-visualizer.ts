/**
 * Room visualizer — Gemini image editing that places selected store products
 * into a visitor's room photo. Server-only (Node): never import from edge
 * routes or the prompt path.
 */
import { GoogleGenAI } from '@google/genai'

export interface InlineImage {
  /** Raw base64 payload (no `data:` prefix). */
  data: string
  mimeType: string
}

const ALLOWED_MIMES = new Set(['image/jpeg', 'image/png', 'image/webp'])
const MAX_IMAGE_BYTES = 8 * 1024 * 1024
const MAX_INSTRUCTION_CHARS = 200

// ponytail: GA "nano banana" tier — cheap and best-in-class at multi-image
// compositing. Bump to a newer image model here if quality disappoints.
const MODEL = 'gemini-2.5-flash-image'

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

export function buildVisualizePrompt(titles: string[], instruction: string): string {
  const list = titles.map((t, i) => `${i + 2}. ${t}`).join('\n')
  return [
    'The first image is a photo of a room. Each following image is a furniture',
    'or home product, in this order:',
    list,
    'Edit the room photo so these exact products are placed naturally in the',
    'room. Preserve each product\'s shape, materials, colors and proportions',
    'exactly as shown in its image. Match the room\'s perspective, lighting and',
    'shadows. Do not change the room itself beyond adding the products.',
    instruction ? `Placement request from the customer: ${instruction}` : '',
    'Return only the edited room image.',
  ]
    .filter(Boolean)
    .join('\n')
}

export async function renderRoomScene(args: {
  roomImage: InlineImage
  productImages: InlineImage[]
  titles: string[]
  instruction: string
}): Promise<InlineImage> {
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
    config: { responseModalities: ['TEXT', 'IMAGE'] },
  })

  const out = response.candidates?.[0]?.content?.parts?.find((p) => p.inlineData?.data)
  if (!out?.inlineData?.data) throw new Error('Gemini returned no image')
  return { data: out.inlineData.data, mimeType: out.inlineData.mimeType ?? 'image/png' }
}
