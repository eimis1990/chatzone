import { NextResponse } from 'next/server'
import { getSessionUser } from '@/lib/auth/guards'
import { createServiceClient } from '@/lib/supabase/service'
import { ownerVoiceSchema } from '@/lib/validation/schemas'

async function requireOwner() {
  const session = await getSessionUser()
  if (!session || session.profile.role !== 'owner') return null
  return session
}

export async function POST(req: Request) {
  const session = await requireOwner()
  if (!session) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await req.json().catch(() => null)
  const parsed = ownerVoiceSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: 'Invalid request' }, { status: 400 })

  const svc = createServiceClient()
  const { data, error } = await svc
    .from('platform_voices')
    .insert({
      voice_id: parsed.data.voiceId,
      name: parsed.data.name,
      gender: parsed.data.gender,
      preview_url: parsed.data.previewUrl ?? null,
    })
    .select('id')
    .single()

  if (error) {
    const conflict = error.message.toLowerCase().includes('duplicate')
    return NextResponse.json(
      { error: conflict ? 'That voice is already added' : 'Failed to add voice' },
      { status: conflict ? 409 : 500 },
    )
  }
  return NextResponse.json({ id: data.id }, { status: 201 })
}

export async function DELETE(req: Request) {
  const session = await requireOwner()
  if (!session) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const id = new URL(req.url).searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })

  const svc = createServiceClient()
  const { error } = await svc.from('platform_voices').delete().eq('id', id)
  if (error) return NextResponse.json({ error: 'Failed to delete voice' }, { status: 500 })
  return NextResponse.json({ ok: true })
}
