'use client'

import Link from 'next/link'
import type { ComponentFolder } from '@/lib/widget-components/folders'

/**
 * Provider folder grid for /owner/components. The folder visual is adapted
 * from Uiverse.io (by Cobp, MIT) — a paper-stack folder that fans open on
 * hover — recolored to the brand orange.
 */
export function ProviderFolders({
  folders,
}: {
  folders: (ComponentFolder & { count: number })[]
}) {
  return (
    <div className="grid gap-8 sm:grid-cols-2 xl:grid-cols-3">
      {folders.map((f) => (
        <Link
          key={f.id}
          href={`/owner/components/${f.id}`}
          className="group flex flex-col items-center rounded-2xl p-6 pt-10 transition-colors hover:bg-muted/50"
          aria-label={`${f.label} — ${f.count} variant${f.count === 1 ? '' : 's'}`}
        >
          <FolderVisual />
          <p className="mt-4 font-medium text-foreground">{f.label}</p>
          <p className="text-xs text-muted-foreground">
            {f.count} variant{f.count === 1 ? '' : 's'}
          </p>
        </Link>
      ))}
    </div>
  )
}

function FolderVisual() {
  return (
    <div className="file relative h-24 w-36 origin-bottom cursor-pointer [perspective:1500px]">
      {/* Back panel with the folder tab */}
      <div className="relative h-full w-full origin-top rounded-xl rounded-tl-none bg-zinc-400 transition-all duration-300 ease-out group-hover:shadow-[0_20px_40px_rgba(0,0,0,.2)] after:absolute after:bottom-[99%] after:left-0 after:h-3.5 after:w-12 after:rounded-t-xl after:bg-zinc-400 after:content-[''] before:absolute before:-top-[13px] before:left-[43.5px] before:size-3.5 before:bg-zinc-400 before:[clip-path:polygon(0_35%,0%_100%,50%_100%)] before:content-['']" />
      {/* Paper stack */}
      <div className="absolute inset-1 origin-bottom select-none rounded-xl bg-zinc-100 transition-all duration-300 ease-out group-hover:[transform:rotateX(-20deg)]" />
      <div className="absolute inset-1 origin-bottom rounded-xl bg-zinc-50 transition-all duration-300 ease-out group-hover:[transform:rotateX(-30deg)]" />
      <div className="absolute inset-1 origin-bottom rounded-xl bg-white transition-all duration-300 ease-out group-hover:[transform:rotateX(-38deg)]" />
      {/* Front cover */}
      <div className="absolute bottom-0 flex h-[92px] w-full origin-bottom items-end rounded-xl rounded-tr-none bg-gradient-to-t from-zinc-400 to-zinc-300 transition-all duration-300 ease-out after:absolute after:bottom-[99%] after:right-0 after:h-[13px] after:w-[86px] after:rounded-t-xl after:bg-zinc-300 after:content-[''] before:absolute before:-top-[9px] before:right-[83px] before:size-2.5 before:bg-zinc-300 before:[clip-path:polygon(100%_14%,50%_100%,100%_100%)] before:content-[''] group-hover:shadow-[inset_0_20px_40px_#e4e4e7,_inset_0_-20px_40px_#a1a1aa] group-hover:[transform:rotateX(-46deg)_translateY(1px)]" />
    </div>
  )
}
