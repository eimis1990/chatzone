/** Bouncing-dots "agent is thinking" indicator (CSS in globals: .cz-think). */
export function ThinkingDots() {
  return (
    <div className="cz-think" role="status" aria-label="Agent is thinking">
      <span className="cz-dot" />
      <span className="cz-dot" />
      <span className="cz-dot" />
    </div>
  )
}
