import { useId } from 'react';

// Sprout the seedling, in a soft clay-3D style: radial lighting, a glossy highlight, rim shading
// and a contact shadow. Pure inline SVG, no external assets. Animation is CSS only (kid.css)
// and is switched off by prefers-reduced-motion.

export type Mood = 'idle' | 'happy' | 'thinking' | 'calm' | 'party';

export function Mascot({ size = 56, mood = 'idle', animated = true }: {
  size?: number;
  mood?: Mood;
  animated?: boolean;
}) {
  const id = useId().replace(/:/g, '');
  const body = `mb-${id}`;
  const rim = `mr-${id}`;
  const leaf = `ml-${id}`;
  const gloss = `mg-${id}`;
  return (
    <svg
      className={`k-mascot mood-${mood}${animated ? ' is-animated' : ''}`}
      viewBox="0 0 100 100"
      width={size}
      height={size}
      aria-hidden="true"
      focusable="false"
    >
      <defs>
        <radialGradient id={body} cx="38%" cy="34%" r="72%">
          <stop offset="0%" stopColor="#d9f7cf" />
          <stop offset="45%" stopColor="#a6e394" />
          <stop offset="100%" stopColor="#5fb46f" />
        </radialGradient>
        <radialGradient id={rim} cx="50%" cy="50%" r="50%">
          <stop offset="70%" stopColor="#1d5a33" stopOpacity="0" />
          <stop offset="100%" stopColor="#1d5a33" stopOpacity="0.28" />
        </radialGradient>
        <linearGradient id={leaf} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#7fd88f" />
          <stop offset="100%" stopColor="#2f8a58" />
        </linearGradient>
        <radialGradient id={gloss} cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#fff" stopOpacity="0.95" />
          <stop offset="100%" stopColor="#fff" stopOpacity="0" />
        </radialGradient>
      </defs>
      <ellipse className="k-m-shadow" cx="50" cy="94" rx="24" ry="4.2" />
      <g className="k-m-hop">
        <g className="k-m-sway">
          <path d="M50 40 C50 32 50 28 50 22" stroke="#2f8a58" strokeWidth="4" strokeLinecap="round" fill="none" />
          <path d="M50 24 C38 27 24 21 19 8 C34 5 48 11 50 24 Z" fill={`url(#${leaf})`} />
          <path d="M50 24 C62 27 76 21 81 8 C66 5 52 11 50 24 Z" fill={`url(#${leaf})`} />
          <path className="k-m-vein" d="M48 22 C40 18 33 14 27 11" />
          <path className="k-m-vein" d="M52 22 C60 18 67 14 73 11" />
          <ellipse cx="30" cy="12" rx="5" ry="2" fill="#fff" opacity="0.45" transform="rotate(20 30 12)" />
        </g>
        <path d="M50 36 C74 36 81 56 79 69 C77 85 65 91 50 91 C35 91 23 85 21 69 C19 56 26 36 50 36 Z" fill={`url(#${body})`} />
        <path d="M50 36 C74 36 81 56 79 69 C77 85 65 91 50 91 C35 91 23 85 21 69 C19 56 26 36 50 36 Z" fill={`url(#${rim})`} />
        <ellipse cx="37" cy="49" rx="9" ry="5" fill={`url(#${gloss})`} transform="rotate(-28 37 49)" />
        <ellipse className="k-m-blush" cx="33" cy="69" rx="5.5" ry="3.6" />
        <ellipse className="k-m-blush" cx="67" cy="69" rx="5.5" ry="3.6" />
        <g className="k-m-eyes">
          <circle className="k-m-eye" cx="41" cy="61" r="4.2" />
          <circle className="k-m-eye" cx="59" cy="61" r="4.2" />
          <circle className="k-m-glint" cx="42.5" cy="59.5" r="1.4" />
          <circle className="k-m-glint" cx="60.5" cy="59.5" r="1.4" />
        </g>
        <path className="k-m-mouth k-m-smile" d="M44 70 Q50 77 56 70" />
        <path className="k-m-mouth k-m-flat" d="M45 72 Q50 74.5 55 72" />
        <ellipse className="k-m-open" cx="50" cy="72" rx="3.4" ry="3.8" />
      </g>
    </svg>
  );
}
