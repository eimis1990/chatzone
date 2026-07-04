import { GridLoader } from '@/components/ui/GridLoader'

// Instant fallback shown the moment an owner screen is navigated to, while its
// server data streams in — same grid loader as the chat widget.
export default function Loading() {
  return <GridLoader className="p-6" />
}
