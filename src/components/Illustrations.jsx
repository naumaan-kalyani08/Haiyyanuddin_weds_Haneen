// Hand-drawn SVG illustrations for the Nikah, Walima, Mehndi and Baraat. No human figures:
// only objects, architecture, florals and calligraphy. White roses + greenery follow nikah-stage.jpg.

export const GOLD = '#b8893a', GOLD_HI = '#d6a64a', LEAF = '#6f8a5a', LEAF_D = '#4f6a44'

/** Shared <defs>: a white rose, a leaf and the gold gradient. Render once near the top of the page. */
export function SvgDefs() {
  return (
    <svg width="0" height="0" style={{ position: 'absolute' }} aria-hidden="true">
      <defs>
        <linearGradient id="g-gold" x1="0" x2="1" y1="0" y2="1">
          <stop offset="0" stopColor="#8c5e1e" />
          <stop offset=".35" stopColor="#e9c46f" />
          <stop offset=".6" stopColor="#b77a20" />
          <stop offset="1" stopColor="#f2d789" />
        </linearGradient>
        <radialGradient id="g-glow" cx=".5" cy=".5" r=".5">
          <stop offset="0" stopColor="#fff3d0" />
          <stop offset=".6" stopColor="#ffd98f" stopOpacity=".5" />
          <stop offset="1" stopColor="#ffd98f" stopOpacity="0" />
        </radialGradient>
        <radialGradient id="g-petal" cx=".5" cy=".3" r=".75">
          <stop offset="0" stopColor="#ffffff" />
          <stop offset=".65" stopColor="#f7f0e4" />
          <stop offset="1" stopColor="#e2d4bf" />
        </radialGradient>
        {/* White garden rose: two rings of five petals, an inner cup and a curled bud. */}
        <symbol id="rose" viewBox="-20 -20 40 40">
          {[0, 72, 144, 216, 288].map((r) => (
            <path key={r} d="M0 0 C-10 -3 -11 -17 0 -19 C11 -17 10 -3 0 0Z" fill="url(#g-petal)" stroke="#ddd0bb" strokeWidth=".6" transform={`rotate(${r})`} />
          ))}
          {[36, 108, 180, 252, 324].map((r) => (
            <path key={r} d="M0 0 C-7 -2 -8 -12 0 -13 C8 -12 7 -2 0 0Z" fill="url(#g-petal)" stroke="#d8cab3" strokeWidth=".6" transform={`rotate(${r})`} />
          ))}
          <path d="M-6.5 1 C-6.5 -6.5 6.5 -6.5 6.5 1 C4.5 5.5 -4.5 5.5 -6.5 1Z" fill="#fcf8f0" stroke="#d6c7ae" strokeWidth=".6" />
          <path d="M-3.2 0.5 C-2.5 -4 3.4 -4 3.2 -0.6 C3 2.4 -1.2 2.4 -1 0" fill="none" stroke="#c9b596" strokeWidth=".8" strokeLinecap="round" />
        </symbol>
        <symbol id="leaf" viewBox="-12 -5 24 10">
          <path d="M-12 0 C-6 -6 6 -6 12 0 C6 6 -6 6 -12 0 Z" fill={LEAF} />
          <path d="M-11 0 H11" stroke={LEAF_D} strokeWidth=".8" />
        </symbol>
        <pattern id="p-jaali" width="24" height="24" patternUnits="userSpaceOnUse">
          <rect x="7" y="7" width="10" height="10" fill="none" stroke={GOLD} strokeWidth=".7" />
          <rect x="7" y="7" width="10" height="10" fill="none" stroke={GOLD} strokeWidth=".7" transform="rotate(45 12 12)" />
          <path d="M0 12H5M19 12H24M12 0V5M12 19V24" stroke={GOLD} strokeWidth=".7" />
        </pattern>
      </defs>
    </svg>
  )
}

export const Rose = ({ x, y, s = 1 }) => <use href="#rose" x={x - 20 * s} y={y - 20 * s} width={40 * s} height={40 * s} />
export const Leaf = ({ x, y, r = 0, s = 1 }) => (
  <use href="#leaf" x={-12 * s} y={-5 * s} width={24 * s} height={10 * s} transform={`translate(${x} ${y}) rotate(${r})`} />
)

/** Octagram used by the loader and dividers. */
export function Octagram({ size = 74, className = '' }) {
  return (
    <svg className={className} width={size} height={size} viewBox="0 0 74 74" aria-hidden="true">
      <g fill="none" stroke={GOLD} strokeWidth="1.6">
        <rect x="17" y="17" width="40" height="40" />
        <rect x="17" y="17" width="40" height="40" transform="rotate(45 37 37)" />
        <circle cx="37" cy="37" r="5" fill={GOLD_HI} stroke="none" />
      </g>
    </svg>
  )
}

export function Rule({ className = 'rule' }) {
  return (
    <svg className={className} viewBox="0 0 220 24" aria-hidden="true">
      <line x1="0" y1="12" x2="86" y2="12" stroke={GOLD_HI} strokeWidth="1.2" />
      <line x1="134" y1="12" x2="220" y2="12" stroke={GOLD_HI} strokeWidth="1.2" />
      <rect x="99" y="1" width="22" height="22" fill="none" stroke={GOLD} strokeWidth="1.4" />
      <rect x="99" y="1" width="22" height="22" fill="none" stroke={GOLD} strokeWidth="1.4" transform="rotate(45 110 12)" />
    </svg>
  )
}

/** Corner spray of white roses and greenery. Mirror with CSS for the other corners. */
export function RoseCorner({ className = '' }) {
  return (
    <svg className={`rose-corner ${className}`} viewBox="0 0 220 220" aria-hidden="true">
      <path d="M0 40 C60 40 120 70 150 150" fill="none" stroke={LEAF_D} strokeWidth="2" />
      <path d="M40 0 C40 60 70 120 150 150" fill="none" stroke={LEAF_D} strokeWidth="2" />
      {[[30, 44, 20], [62, 52, 35], [96, 74, 50], [124, 106, 60], [46, 30, -60], [52, 64, -30], [76, 96, -50], [108, 124, -40]].map(([x, y, r], i) => (
        <Leaf key={i} x={x} y={y} r={r} s={1.6} />
      ))}
      <Rose x={34} y={34} s={1.4} />
      <Rose x={78} y={58} s={1.05} />
      <Rose x={58} y={80} s={1.0} />
      <Rose x={112} y={98} s={0.8} />
      <Rose x={98} y={118} s={0.7} />
      <circle cx="140" cy="132" r="3" fill="#fffdf8" stroke="#d6ccbb" />
      <circle cx="150" cy="146" r="2.4" fill="#fffdf8" stroke="#d6ccbb" />
    </svg>
  )
}

/* -------------------------------------------- event emblems -------------------------------------------- */

function EmblemFrame({ children, label }) {
  return (
    <svg className="emblem" viewBox="0 0 120 120" role="img" aria-label={label}>
      <circle cx="60" cy="60" r="56" fill="url(#g-glow)" opacity=".55" />
      <circle cx="60" cy="60" r="52" fill="none" stroke={GOLD} strokeWidth="1" />
      <circle cx="60" cy="60" r="48" fill="none" stroke={GOLD} strokeWidth=".5" strokeDasharray="2 3" />
      {children}
    </svg>
  )
}

/** Mehndi: a henna cone, a paisley and marigolds. */
export function MehndiEmblem() {
  return (
    <EmblemFrame label="Mehndi: henna cone, paisley and marigolds">
      <path d="M52 30 L74 82 Q70 88 64 86 Z" fill="#7a4a24" />
      <path d="M52 30 L74 82" stroke="#5a3418" strokeWidth="1" />
      <path d="M50 26 l6 -6 6 6 -4 6z" fill="url(#g-gold)" />
      <path d="M70 84 q-2 6 -8 8" fill="none" stroke="#7a4a24" strokeWidth="2" strokeLinecap="round" />
      <path d="M38 56 c-8 -14 10 -24 16 -12 c4 8 -4 16 -10 12 c-6 -4 0 -10 4 -6" fill="none" stroke="#9b5a2a" strokeWidth="1.6" />
      {[[34, 82], [46, 90], [84, 44]].map(([x, y], i) => (
        <g key={i} transform={`translate(${x} ${y})`}>
          {Array.from({ length: 10 }, (_, k) => (
            <ellipse key={k} rx="3" ry="6.5" fill={k % 2 ? '#f0a020' : '#f7b733'} transform={`rotate(${k * 36}) translate(0 -5)`} />
          ))}
          <circle r="3" fill="#e07b10" />
        </g>
      ))}
      <Leaf x={86} y={58} r={60} s={0.8} />
    </EmblemFrame>
  )
}

/** Nikah: the nikah-nama scroll with a qalam, two rings and a crescent. */
export function NikahEmblem() {
  return (
    <EmblemFrame label="Nikah: the nikah-nama scroll, a qalam, two rings and a crescent">
      <path d="M36 40 h44 v44 h-44 z" fill="#fbf6ea" stroke={GOLD} strokeWidth="1.2" />
      <rect x="32" y="36" width="8" height="52" rx="4" fill="url(#g-gold)" />
      <rect x="76" y="36" width="8" height="52" rx="4" fill="url(#g-gold)" />
      {[50, 57, 64, 71].map((y) => <path key={y} d={`M44 ${y} h${y === 71 ? 18 : 28}`} stroke="#9aa6b1" strokeWidth="1.4" strokeLinecap="round" />)}
      <path d="M64 78 L90 46" stroke="#3b2a1a" strokeWidth="2.4" strokeLinecap="round" />
      <path d="M90 46 l3 -6 -1 8z" fill="#3b2a1a" />
      <circle cx="48" cy="94" r="7" fill="none" stroke="url(#g-gold)" strokeWidth="2.6" />
      <circle cx="58" cy="94" r="7" fill="none" stroke="url(#g-gold)" strokeWidth="2.6" />
      <circle cx="58" cy="87" r="2" fill="#f4f7fb" stroke="#c6d3df" />
      <path d="M58 22 a9 9 0 1 0 8 13 a7 7 0 1 1 -8 -13z" fill="url(#g-gold)" />
      <path d="M70 22 l1.2 2.6 2.8 .3 -2.1 1.9 .6 2.8 -2.5 -1.4 -2.5 1.4 .6 -2.8 -2.1 -1.9 2.8 -.3z" fill={GOLD_HI} />
    </EmblemFrame>
  )
}

/** Walima: a domed cloche on a platter, with steam and a bowl of dates. */
export function WalimaEmblem() {
  return (
    <EmblemFrame label="Walima: a domed dish on a platter with a bowl of dates">
      <path d="M50 30 q-4 -6 0 -10 M60 28 q-4 -6 0 -10 M70 30 q-4 -6 0 -10" fill="none" stroke="#b9a68a" strokeWidth="1.4" strokeLinecap="round" />
      <path d="M30 74 a30 30 0 0 1 60 0 z" fill="url(#g-gold)" />
      <path d="M36 70 a24 24 0 0 1 20 -22" fill="none" stroke="#fff3d0" strokeWidth="2" opacity=".6" />
      <circle cx="60" cy="42" r="4" fill="url(#g-gold)" />
      <ellipse cx="60" cy="78" rx="38" ry="6" fill="#f3ead8" stroke={GOLD} strokeWidth="1.2" />
      <path d="M78 92 h20 a10 7 0 0 1 -20 0z" fill="#f3ead8" stroke={GOLD} strokeWidth="1" />
      {[82, 88, 94].map((x) => <ellipse key={x} cx={x} cy="90" rx="3" ry="2" fill="#6b3416" />)}
      <path d="M24 92 h40" stroke={GOLD} strokeWidth="1" />
      <path d="M24 96 h40" stroke={GOLD} strokeWidth=".6" strokeDasharray="3 2" />
    </EmblemFrame>
  )
}

/** Baraat / Rukhsati: a doli (palanquin) with a domed canopy, carrying poles, drapes and garlands. */
export function BaraatEmblem({ label = 'Baraat: a decorated doli with garlands' }) {
  return (
    <EmblemFrame label={label}>
      <path d="M14 76 H106" stroke="#7a5520" strokeWidth="3" strokeLinecap="round" />
      <path d="M36 44 Q60 18 84 44 Z" fill="url(#g-gold)" />
      <circle cx="60" cy="24" r="3" fill="url(#g-gold)" />
      <rect x="36" y="44" width="48" height="36" fill="#8e2b33" />
      <path d="M36 44 q12 14 24 0 q12 14 24 0" fill="#b3474f" />
      <rect x="54" y="52" width="12" height="20" rx="6" fill="#f6e3c0" stroke={GOLD} />
      <path d="M36 80 h48 v4 h-48z" fill="url(#g-gold)" />
      {[38, 82].map((x) => <path key={x} d={`M${x} 46 v34`} stroke={GOLD_HI} strokeWidth="2" />)}
      {[40, 46, 52, 58, 64, 70, 76, 82].map((x, i) => <circle key={x} cx={x} cy={46 + (i % 2) * 3} r="2" fill={i % 2 ? '#f7b733' : '#fffdf8'} />)}
      <path d="M38 50 q-6 14 0 28 M82 50 q6 14 0 28" fill="none" stroke="#fffdf8" strokeWidth="1.4" strokeDasharray="1 3" strokeLinecap="round" />
    </EmblemFrame>
  )
}

/** In loving memory: a lantern-lit white rose inside an arch (instead of portrait silhouettes). */
export function MemoryEmblem() {
  return (
    <svg className="memory-emblem" viewBox="0 0 100 120" aria-hidden="true">
      <path d="M10 118 V48 a40 40 0 0 1 80 0 V118" fill="#2a3e3e" stroke={GOLD_HI} strokeWidth="1.5" />
      <path d="M18 118 V50 a32 32 0 0 1 64 0 V118" fill="url(#p-jaali)" opacity=".5" />
      <circle cx="50" cy="66" r="28" fill="url(#g-glow)" opacity=".5" />
      <path d="M50 70 V106" stroke={LEAF_D} strokeWidth="2" />
      <Leaf x={42} y={88} r={-30} s={1} />
      <Leaf x={58} y={96} r={30} s={1} />
      <Rose x={50} y={64} s={0.9} />
    </svg>
  )
}

