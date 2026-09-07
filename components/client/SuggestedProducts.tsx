import type { CommerceProduct } from '@/lib/commerce/types'

/**
 * The product cards a bot reply surfaced, replayed inside a transcript bubble
 * (Conversations + Inbox) so the team can judge how good the suggestion was.
 */
export function SuggestedProducts({ products }: { products: CommerceProduct[] | null | undefined }) {
  if (!products || products.length === 0) return null
  return (
    <div className="mt-2 space-y-1.5 border-t border-current/15 pt-2">
      <p className="text-xs font-medium opacity-70">
        Suggested product{products.length !== 1 ? 's' : ''}
      </p>
      {products.map((p) => (
        <a
          key={p.id}
          href={p.url}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 rounded-md bg-background/70 p-1.5 text-foreground transition-colors hover:bg-background"
        >
          {p.imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={p.imageUrl} alt="" className="size-9 shrink-0 rounded object-cover" />
          ) : (
            <div className="size-9 shrink-0 rounded bg-muted" />
          )}
          <span className="min-w-0 flex-1">
            <span className="block truncate text-xs font-medium">{p.title}</span>
            <span className="block text-[11px] text-muted-foreground">{p.price}</span>
          </span>
        </a>
      ))}
    </div>
  )
}
