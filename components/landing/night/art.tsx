/**
 * Product art for the demo conversations, drawn in code so it stays sharp at
 * any size and needs no image request.
 */
export function ChairArt({ wood, back, seat }: { wood: string; back: string; seat: string }) {
  return (
    <svg viewBox="0 0 120 84" className="h-full w-full" aria-hidden="true">
      <ellipse cx="60" cy="78.5" rx="36" ry="3" fill="#171a2c" opacity=".1" />
      <path
        d="M46 60l-1.5 14M74 60l1.5 14"
        stroke={wood}
        strokeWidth="2.6"
        strokeLinecap="round"
        opacity=".65"
      />
      <path d="M36 58l-5 20M84 58l5 20" stroke={wood} strokeWidth="3.4" strokeLinecap="round" />
      <rect x="35" y="9" width="50" height="44" rx="16" fill={back} />
      <rect x="25" y="31" width="13" height="31" rx="6.5" fill={seat} />
      <rect x="82" y="31" width="13" height="31" rx="6.5" fill={seat} />
      <rect x="31" y="42" width="58" height="21" rx="9.5" fill={seat} />
      <path d="M41 46.5h38" stroke="#fff" strokeWidth="1.6" strokeLinecap="round" opacity=".35" />
    </svg>
  )
}
