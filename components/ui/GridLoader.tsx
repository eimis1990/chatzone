// The same 3×3 grid-cube loader used in the chat widget (styles in globals.css,
// .cbz-grid-loader / .cbz-cube). Accent color via --cbz-loader-color, default
// brand orange. Used as the authed-app navigation fallback.
export function GridLoader({
  className,
  size = 'default',
}: {
  className?: string
  /** 'sm' = compact cubes with a softer glow, for dialogs/overlays. */
  size?: 'sm' | 'default'
}) {
  return (
    <div className={`flex h-full items-center justify-center ${className ?? ''}`}>
      <div
        className={`cbz-grid-loader ${size === 'sm' ? 'cbz-grid-loader--sm' : ''}`}
        role="status"
        aria-label="Loading"
      >
        {Array.from({ length: 9 }).map((_, i) => (
          <span key={i} className="cbz-cube" />
        ))}
      </div>
    </div>
  )
}
