import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ChevronLeftIcon } from 'lucide-react'
import { requireRole } from '@/lib/auth/guards'
import { createServerClient } from '@/lib/supabase/server'
import { folderById } from '@/lib/widget-components/folders'
import { FolderComponentsView } from '@/components/owner/FolderComponentsView'

export default async function ComponentFolderPage({
  params,
}: {
  params: Promise<{ provider: string }>
}) {
  await requireRole('owner')
  const { provider } = await params
  const folder = folderById(provider)
  if (!folder) notFound()

  const supabase = await createServerClient()
  const { data } = await supabase
    .from('provider_components')
    .select('component_key')
    .eq('provider', folder.id)

  return (
    <div className="space-y-6 p-6">
      <div>
        <Link
          href="/owner/components"
          className="mb-1 inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
        >
          <ChevronLeftIcon className="size-3.5" /> All folders
        </Link>
        <h1 className="text-lg font-semibold">{folder.label} components</h1>
        <p className="text-sm text-muted-foreground">{folder.description}</p>
      </div>
      <FolderComponentsView
        folderId={folder.id}
        assignedKeys={(data ?? []).map((r) => r.component_key as string)}
      />
    </div>
  )
}
