import { forwardRef, useEffect, useState } from 'react'
import { CARD, FONTS, borderPaths, cardLayout, cardText } from '../three/cardFace'

const useViewport = () => {
  const [vp, setVp] = useState(() => ({ w: innerWidth, h: innerHeight }))
  useEffect(() => {
    const on = () => setVp({ w: innerWidth, h: innerHeight })
    addEventListener('resize', on)
    return () => removeEventListener('resize', on)
  }, [])
  return vp
}

/**
 * The invitation card face. It IS the first real section of the site. During the intro it is
 * mapped onto the 3D card with a matrix3d (transform-origin 0 0); at the end of the pin the
 * matrix is the identity and the card simply scrolls on as a normal section.
 * Sizes come from the same layout as the 3D card's canvas copy (three/cardFace.js).
 */
export const CardFace = forwardRef(function CardFace({ size, className = '', style, inert }, ref) {
  const vp = useViewport()
  const W = size?.w ?? vp.w, H = size?.h ?? vp.h
  const L = cardLayout(W, H)
  const { a, b, r } = borderPaths(W, H, L)
  const font = (f) => {
    const [, weight, px, family] = f.match(/^(?:italic )?(\d+) ([\d.]+)px (.+)$/) ?? []
    return { fontWeight: weight, fontSize: `${px}px`, fontFamily: family, fontStyle: f.startsWith('italic') ? 'italic' : 'normal' }
  }
  return (
    <div
      ref={ref}
      className={`card-face ${className}`}
      style={{ width: W, height: H, ...style }}
      inert={inert ? true : undefined}
      aria-labelledby="card-title"
    >
      <svg className="card-border" width={W} height={H} aria-hidden="true">
        <rect x={a} y={a} width={W - 2 * a} height={H - 2 * a} fill="none" stroke={CARD.gold} strokeWidth="1.5" />
        <rect x={b} y={b} width={W - 2 * b} height={H - 2 * b} fill="none" stroke={CARD.gold} strokeWidth="0.75" />
        {[[b, b], [W - b, b], [W - b, H - b], [b, H - b]].map(([x, y]) => (
          <g key={`${x}-${y}`} stroke={CARD.gold} strokeWidth="1" fill="none">
            <circle cx={x} cy={y} r={r} />
            {Array.from({ length: 8 }, (_, k) => (
              <line key={k} x1={x} y1={y} x2={x + Math.cos((k * Math.PI) / 4) * r * 0.8} y2={y + Math.sin((k * Math.PI) / 4) * r * 0.8} />
            ))}
          </g>
        ))}
      </svg>
      <div className="card-shimmer" aria-hidden="true" />
      <div className="card-stack" style={{ width: L.width }}>
        <h1 id="card-title" className="sr-only">Nikah invitation: Haiyyanuddin Siddiqui  and Haneen </h1>
        <p className="cf-script" lang="ar" dir="rtl" style={{ ...font(FONTS.script(L.script.size)), lineHeight: L.script.lh, color: CARD.gold }}>
          {cardText.script}
        </p>
        <p className="cf-latin" style={{ ...font(FONTS.latin(L.latin.size)), lineHeight: L.latin.lh, letterSpacing: `${L.latin.ls}em`, marginRight: `-${L.latin.ls}em` }}>
          {cardText.latin}
        </p>
        <div className="cf-rule" style={{ margin: `${L.rule.gap}px auto`, width: L.rule.w }} aria-hidden="true" />
        <p className="cf-en" style={{ ...font(FONTS.en(L.en.size)), lineHeight: L.en.lh }}>{cardText.en}</p>
        {cardText.ur && (
          <p className="cf-ur" lang="ur" dir="rtl" style={{ ...font(FONTS.ur(L.ur.size)), lineHeight: L.ur.lh, marginTop: L.gap }}>
            {cardText.ur}
          </p>
        )}
        <p className="cf-date" style={{ ...font(FONTS.date(L.date.size)), lineHeight: L.date.lh, letterSpacing: `${L.date.ls}em`, marginTop: L.gap }}>
          {cardText.date}
        </p>
      </div>
    </div>
  )
})
