/**
 * Decorative button highlight. CSS keeps the server and first client tree
 * identical; the reduced-motion media query disables the sweep without a
 * hydration-time render branch.
 */
export function Shimmer() {
  return (
    <span
      className="pointer-events-none absolute inset-0 overflow-hidden rounded-[inherit]"
      aria-hidden="true"
    >
      <span className="landing-button-shimmer absolute inset-y-0 left-0 w-1/3 bg-gradient-to-r from-transparent via-white/50 to-transparent" />
    </span>
  )
}
