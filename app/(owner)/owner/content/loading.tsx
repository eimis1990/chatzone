export default function ContentStudioLoading() {
  return (
    <div className="grid gap-4 p-6" aria-label="Loading Content Studio">
      <div className="h-24 animate-pulse rounded-xl bg-muted" />
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="h-72 animate-pulse rounded-xl bg-muted" />
        <div className="h-72 animate-pulse rounded-xl bg-muted" />
        <div className="h-72 animate-pulse rounded-xl bg-muted" />
      </div>
    </div>
  )
}
