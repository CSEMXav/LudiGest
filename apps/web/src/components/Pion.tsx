type PionKind = "meeple" | "hex" | "die" | "card" | "chip" | "star";

interface PionProps {
  tint: string;
  kind?: PionKind;
  w?: number;
  h?: number;
}

export function Pion({ tint, kind = "meeple", w = 56, h = 56 }: PionProps) {
  const shapes: Record<PionKind, React.ReactNode> = {
    meeple: (
      <path
        d="M28 8c3 0 5 2 5 5s-2 5-5 5c-1 0-2 0-3 1l-7-3c-1 0-3 1-3 3s1 3 3 4l5 1-3 14c0 2 1 3 3 3s3-1 3-3l1-7h2l1 7c0 2 1 3 3 3s3-1 3-3l-3-14 5-1c2-1 3-2 3-4s-2-3-3-3l-7 3c-1-1-2-1-3-1-3 0-5-2-5-5s2-5 5-5z"
        fill="#fff"
      />
    ),
    hex: (
      <polygon
        points="28,8 44,17 44,39 28,48 12,39 12,17"
        fill="none"
        stroke="#fff"
        strokeWidth="3"
      />
    ),
    die: (
      <g>
        <rect x="12" y="12" width="32" height="32" rx="5" fill="#fff" />
        <circle cx="20" cy="20" r="3" fill={tint} />
        <circle cx="36" cy="20" r="3" fill={tint} />
        <circle cx="20" cy="36" r="3" fill={tint} />
        <circle cx="36" cy="36" r="3" fill={tint} />
        <circle cx="28" cy="28" r="3" fill={tint} />
      </g>
    ),
    card: (
      <g>
        <rect x="14" y="10" width="22" height="32" rx="3" fill="#fff" transform="rotate(-8 25 26)" />
        <rect x="20" y="14" width="22" height="32" rx="3" fill="#fff" opacity=".55" transform="rotate(8 31 30)" />
      </g>
    ),
    chip: (
      <g>
        <circle cx="28" cy="28" r="16" fill="#fff" />
        <circle cx="28" cy="28" r="10" fill="none" stroke={tint} strokeWidth="2" strokeDasharray="3 3" />
      </g>
    ),
    star: (
      <polygon
        points="28,10 33,22 46,22 35,30 39,43 28,35 17,43 21,30 10,22 23,22"
        fill="#fff"
      />
    ),
  };

  return (
    <svg
      width={w}
      height={h}
      viewBox="0 0 56 56"
      style={{ display: "block", flexShrink: 0 }}
    >
      <rect width="56" height="56" fill={tint} rx="10" />
      {shapes[kind] ?? shapes.meeple}
    </svg>
  );
}

export const CAT_PION: Record<string, PionKind> = {
  escape:   "die",
  famille:  "meeple",
  ambiance: "card",
  enfant:   "chip",
  "initié": "hex",
  expert:   "hex",
};
