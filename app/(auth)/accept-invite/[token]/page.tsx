import { createServiceClient } from '@/lib/supabase/service'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import type { Invite, Organization } from '@/lib/types'
import { AcceptInviteForm } from './AcceptInviteForm'

interface Props {
  params: Promise<{ token: string }>
}

export default async function AcceptInvitePage({ params }: Props) {
  const { token } = await params
  const service = createServiceClient()

  // ── Resolve the invite ────────────────────────────────────────────────────
  const { data: invite } = await service
    .from('invites')
    .select('*')
    .eq('token', token)
    .single<Invite>()

  if (!invite) {
    return <InviteError message="This invite link is invalid or does not exist." />
  }

  if (invite.status === 'accepted') {
    return (
      <InviteError message="This invite has already been accepted. Sign in to access your account." />
    )
  }

  if (invite.status === 'expired' || new Date(invite.expires_at) < new Date()) {
    return (
      <InviteError message="This invite link has expired. Please contact your administrator." />
    )
  }

  // ── Resolve org name ──────────────────────────────────────────────────────
  const { data: org } = await service
    .from('organizations')
    .select('name')
    .eq('id', invite.org_id)
    .single<Pick<Organization, 'name'>>()

  const orgName = org?.name ?? 'Your organization'

  return (
    <main className="flex min-h-svh items-center justify-center bg-background px-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold">Create your account</CardTitle>
          <CardDescription>
            You have been invited to join <strong>{orgName}</strong>. Set a password to get started.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <AcceptInviteForm token={token} email={invite.email} orgName={orgName} />
        </CardContent>
      </Card>
    </main>
  )
}

function InviteError({ message }: { message: string }) {
  return (
    <main className="flex min-h-svh items-center justify-center bg-background px-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold">Invalid invite</CardTitle>
          <CardDescription>{message}</CardDescription>
        </CardHeader>
        <CardContent>
          <a href="/login" className="text-sm underline-offset-4 hover:underline">
            Go to sign in
          </a>
        </CardContent>
      </Card>
    </main>
  )
}
