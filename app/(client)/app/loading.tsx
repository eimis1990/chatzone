import { GridLoader } from '@/components/ui/GridLoader'

// Instant fallback shown the moment a client screen is navigated to, while its
// server data streams in. The sidebar (in the layout) stays put; this fills the
// main content card with the same grid loader as the chat widget.
export default function Loading() {
  return <GridLoader className="p-6" />
}
