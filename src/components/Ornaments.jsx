import { isFill } from '../content/wedding'

/** Visible placeholder for anything the family has not supplied yet. */
export function Fill({ value, children }) {
  const hint = value?.hint ?? children
  return <span className="fill" title="Waiting for the family">[fill: {hint}]</span>
}

/** Renders a value, or its placeholder if it is still FILL. */
export function V({ v }) {
  return isFill(v) ? <Fill value={v} /> : v
}

/** Brass lantern modelled on the hanging lanterns in palace-courtyard.webp: chain, dome with finial,
 *  hexagonal body with lattice windows, tapered base. `lit` 0..1 drives the glow. */
export function Lantern({ lit = 1, size = 64, className = '' }) {
  const id = `lg${Math.round(lit * 100)}`
  return (
    <svg className={`lantern ${className}`} width={size} height={size * 2} viewBox="0 0 60 120" aria-hidden="true" style={{ '--lit': lit }}>
      <defs>
        <radialGradient id={id} cx="50%" cy="58%" r="55%">
          <stop offset="0" stopColor="#fff3d0" stopOpacity={0.95 * lit} />
          <stop offset="0.5" stopColor="#f7c66a" stopOpacity={0.7 * lit} />
          <stop offset="1" stopColor="#c98d3c" stopOpacity={0.05 * lit} />
        </radialGradient>
        <linearGradient id="brass" x1="0" x2="1">
          <stop offset="0" stopColor="#8a6424" />
          <stop offset="0.45" stopColor="#e2bb6a" />
          <stop offset="1" stopColor="#7a5520" />
        </linearGradient>
      </defs>
      <circle className="lantern-halo" cx="30" cy="66" r="30" fill={`url(#${id})`} />
      <line x1="30" y1="0" x2="30" y2="14" stroke="#b08a45" strokeWidth="1.2" />
      <circle cx="30" cy="16" r="2.4" fill="url(#brass)" />
      <path d="M30 18 L33 24 L27 24 Z" fill="url(#brass)" />
      <path d="M16 38 Q16 26 30 24 Q44 26 44 38 Z" fill="url(#brass)" />
      <rect x="14" y="38" width="32" height="4" rx="1" fill="url(#brass)" />
      <path d="M16 42 L44 42 L42 88 L18 88 Z" fill={lit > 0.05 ? '#f6cf7c' : '#3b3428'} fillOpacity={0.25 + 0.6 * lit} stroke="url(#brass)" strokeWidth="2" />
      {/* lattice windows */}
      <g stroke="url(#brass)" strokeWidth="1.1" fill="none">
        <line x1="30" y1="42" x2="30" y2="88" />
        <path d="M18 54 Q30 46 42 54 M18 66 Q30 58 42 66 M18 78 Q30 70 42 78" />
        <path d="M24 42 Q24 65 22 88 M36 42 Q36 65 38 88" />
        <circle cx="30" cy="62" r="5" />
      </g>
      <rect x="16" y="88" width="28" height="4" rx="1" fill="url(#brass)" />
      <path d="M20 92 L40 92 L34 104 L26 104 Z" fill="url(#brass)" />
      <path d="M28 104 L32 104 L30 112 Z" fill="url(#brass)" />
    </svg>
  )
}

/** Section divider: the supplied jaali door pair as a small arch, flanked by gold rules. */
export function JaaliDivider() {
  return (
    <div className="jaali-divider" aria-hidden="true">
      <span className="rule" />
      <span className="mini-arch">
        <img src="/images/invite/jaali-door-left-2x.webp" alt="" width="18" height="50" loading="lazy" />
        <img src="/images/invite/jaali-door-right-2x.webp" alt="" width="18" height="50" loading="lazy" />
      </span>
      <span className="rule" />
    </div>
  )
}
