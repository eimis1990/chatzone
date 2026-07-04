// Instant fallback shown the moment a client screen is navigated to, while its
// server data streams in. The sidebar (in the layout) stays put; this only
// fills the main content card. ponytail: generic skeleton, not per-page shapes.
export default function Loading() {
  return (
    <div className="space-y-6 p-6" aria-hidden="true">
      <div className="h-6 w-48 animate-pulse rounded-md bg-muted" />
      <div className="h-4 w-72 animate-pulse rounded bg-muted/70" />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 pt-2">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-28 animate-pulse rounded-xl bg-muted/60" />
        ))}
      </div>
    </div>
  )
}
