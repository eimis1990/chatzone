import { redirect } from 'next/navigation'
import { requireRole, getUserOrgIds } from '@/lib/auth/guards'
import { OnboardingWizard } from '@/components/client/onboarding/OnboardingWizard'

/**
 * Guided client onboarding: business facts → teach from the website → optional
 * store → look & feel → install. Creates the bot at step 1 → 2 and leaves the
 * user on their new bot's Knowledge tab.
 */
export default async function OnboardingPage() {
  await requireRole('client')

  const orgIds = await getUserOrgIds()
  const orgId = orgIds[0] ?? null
  if (!orgId) redirect('/app')

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? ''

  return <OnboardingWizard orgId={orgId} appUrl={appUrl} />
}
