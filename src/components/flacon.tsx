import { tintFor } from "@/lib/vocab";

type Shape = {
  body: string;
  top: number;
  bottom: number;
  cap: React.ReactNode;
  label: { x: number; y: number; w: number; h: number };
};

const SHAPES: Shape[] = [
  {
    // Apothecary
    body: "M24 84 Q24 78 30 78 L90 78 Q96 78 96 84 L96 202 Q96 208 90 208 L30 208 Q24 208 24 202 Z",
    top: 78,
    bottom: 208,
    cap: (
      <>
        <rect x="50" y="62" width="20" height="18" fill="url(#neck)" />
        <rect x="40" y="18" width="40" height="46" rx="2" fill="#141210" stroke="rgba(242,237,228,0.18)" />
        <rect x="40" y="54" width="40" height="4" fill="url(#gold)" />
      </>
    ),
    label: { x: 36, y: 128, w: 48, h: 40 },
  },
  {
    // Rotonde
    body: "M60 86 C100 86 108 120 108 150 C108 186 88 208 60 208 C32 208 12 186 12 150 C12 120 20 86 60 86 Z",
    top: 86,
    bottom: 208,
    cap: (
      <>
        <rect x="50" y="72" width="20" height="16" fill="url(#neck)" />
        <rect x="42" y="30" width="36" height="44" rx="16" fill="url(#gold)" />
      </>
    ),
    label: { x: 38, y: 132, w: 44, h: 34 },
  },
  {
    // Facette
    body: "M32 80 L88 80 L104 98 L104 190 L88 208 L32 208 L16 190 L16 98 Z",
    top: 80,
    bottom: 208,
    cap: (
      <>
        <rect x="50" y="64" width="20" height="18" fill="url(#neck)" />
        <path d="M44 12 L76 12 L82 20 L82 66 L38 66 L38 20 Z" fill="#141210" stroke="rgba(242,237,228,0.18)" />
        <path d="M44 12 L76 12 L82 20 L38 20 Z" fill="url(#gold)" />
      </>
    ),
    label: { x: 34, y: 124, w: 52, h: 42 },
  },
  {
    // Colonne
    body: "M58 72 L62 72 Q88 72 88 98 L88 182 Q88 208 62 208 L58 208 Q32 208 32 182 L32 98 Q32 72 58 72 Z",
    top: 72,
    bottom: 208,
    cap: (
      <>
        <rect x="52" y="58" width="16" height="16" fill="url(#neck)" />
        <rect x="44" y="22" width="32" height="38" rx="3" fill="url(#gold)" />
        <rect x="44" y="50" width="32" height="2" fill="rgba(12,11,10,0.35)" />
      </>
    ),
    label: { x: 40, y: 126, w: 40, h: 40 },
  },
];

function hash(s: string) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h;
}

function monogram(name: string) {
  const words = name.replace(/[^\p{L}\p{N}\s]/gu, "").split(/\s+/).filter(Boolean);
  return (words.length > 1 ? words[0][0] + words[1][0] : (words[0] ?? "N").slice(0, 2)).toUpperCase();
}

export function Flacon({
  name,
  family,
  remaining,
  size = 120,
  className,
}: {
  name: string;
  family: string;
  remaining: number;
  size?: number;
  className?: string;
}) {
  const shape = SHAPES[hash(name) % SHAPES.length];
  const [hi, body, deep] = tintFor(family);
  const pct = Math.max(0, Math.min(100, remaining)) / 100;
  const inset = 8;
  const liquidTop = shape.bottom - inset - (shape.bottom - shape.top - inset * 2) * pct;
  const id = `fl${hash(`${name}|${family}|${remaining}`)}`;

  return (
    <svg
      viewBox="0 0 120 220"
      width={size}
      height={(size * 220) / 120}
      className={className}
      role="img"
      aria-label={`${name} bottle, ${remaining}% remaining`}
    >
      <defs>
        <linearGradient id={`${id}-liq`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor={hi} stopOpacity="0.95" />
          <stop offset="0.45" stopColor={body} stopOpacity="0.9" />
          <stop offset="1" stopColor={deep} stopOpacity="0.95" />
        </linearGradient>
        <linearGradient id={`${id}-glass`} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#fff" stopOpacity="0.16" />
          <stop offset="0.35" stopColor="#fff" stopOpacity="0.03" />
          <stop offset="0.8" stopColor="#fff" stopOpacity="0.02" />
          <stop offset="1" stopColor="#fff" stopOpacity="0.12" />
        </linearGradient>
        <radialGradient id={`${id}-halo`} cx="0.5" cy="0.62" r="0.5">
          <stop offset="0" stopColor={body} stopOpacity="0.35" />
          <stop offset="1" stopColor={body} stopOpacity="0" />
        </radialGradient>
        <clipPath id={`${id}-clip`}>
          <path d={shape.body} transform="translate(60 143) scale(0.9) translate(-60 -143)" />
        </clipPath>
        <linearGradient id="gold" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#e6c890" />
          <stop offset="0.5" stopColor="#a8834f" />
          <stop offset="1" stopColor="#d8b87f" />
        </linearGradient>
        <linearGradient id="neck" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#fff" stopOpacity="0.25" />
          <stop offset="1" stopColor="#fff" stopOpacity="0.06" />
        </linearGradient>
      </defs>

      <ellipse cx="60" cy="150" rx="70" ry="80" fill={`url(#${id}-halo)`} />
      <ellipse cx="60" cy="212" rx="44" ry="4" fill="#000" opacity="0.5" />
      {shape.cap}
      <path d={shape.body} fill="rgba(242,237,228,0.035)" />
      <g clipPath={`url(#${id}-clip)`}>
        <rect x="0" y={liquidTop} width="120" height={220 - liquidTop} fill={`url(#${id}-liq)`} />
        <rect x="0" y={liquidTop} width="120" height="1.2" fill="#fff" opacity="0.45" />
      </g>
      <path d={shape.body} fill={`url(#${id}-glass)`} stroke="rgba(242,237,228,0.28)" strokeWidth="1" />
      <rect
        x={shape.label.x}
        y={shape.label.y}
        width={shape.label.w}
        height={shape.label.h}
        fill="#f2ede4"
        opacity="0.92"
      />
      <rect
        x={shape.label.x + 2.5}
        y={shape.label.y + 2.5}
        width={shape.label.w - 5}
        height={shape.label.h - 5}
        fill="none"
        stroke="#8c7350"
        strokeWidth="0.6"
      />
      <text
        x="60"
        y={shape.label.y + shape.label.h / 2 + 5}
        textAnchor="middle"
        fontFamily="var(--font-cormorant), serif"
        fontSize="15"
        fontStyle="italic"
        fill="#1d1a17"
      >
        {monogram(name)}
      </text>
      <path d="M28 96 L28 190" stroke="#fff" strokeOpacity="0.14" strokeWidth="3" strokeLinecap="round" clipPath={`url(#${id}-clip)`} />
    </svg>
  );
}
