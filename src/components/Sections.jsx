import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { bismillah, isFill, wedding } from '../content/wedding'
import { formatGregorian, formatHijri, formatTime12, zonedToDate } from '../lib/dates'
import { downloadIcs, eventIcs } from '../lib/ics'
import { ScrollTrigger, getLenis, gsap, homeY, isMobile, prefersReducedMotion, scrollToY } from '../lib/motion'
import { goldBurst, petalShower } from '../lib/petals'
import { maghribIsha } from '../lib/prayer'
import { Rule } from './Illustrations'
import { Fill, Lantern, V } from './Ornaments'

const { bride, groom } = wedding.couple
const couple = `${groom.en} & ${bride.en}`
const nikah = wedding.events.find((e) => e.id === 'nikah')
const walima = wedding.events.find((e) => e.id === 'walima')
const parent = (side, role) => wedding.families[side].parents.find((p) => p.role === role)
const clamp01 = (t) => Math.min(1, Math.max(0, t))
/** Urdu text that is still [fill] is simply not shown (it is listed by pendingFills()). */
const has = (v) => Boolean(v) && !isFill(v)

/** Fades/rises children marked .rv when they scroll in. */
function useReveal(ref) {
  useLayoutEffect(() => {
    if (prefersReducedMotion()) return
    const ctx = gsap.context(() => {
      gsap.utils.toArray('.rv', ref.current).forEach((el) => {
        gsap.from(el, { opacity: 0, y: 40, duration: 1.15, ease: 'power3.out', scrollTrigger: { trigger: el, start: 'top 88%', once: true } })
      })
    }, ref)
    return () => ctx.revert()
  }, [ref])
}

function Sec({ id, tone = '', className = '', label, children }) {
  const ref = useRef(null)
  useReveal(ref)
  return (
    <section ref={ref} id={id} className={`sec ${tone} ${className}`} aria-label={label}>
      {children}
    </section>
  )
}

/** Shared SVG defs for the story art (lantern, glow, girih). Render once. */
export function StoryDefs() {
  return (
    <svg width="0" height="0" style={{ position: 'absolute' }} aria-hidden="true">
      <defs>
        <pattern id="girihSmall" width="26" height="26" patternUnits="userSpaceOnUse">
          <g fill="none" stroke="#d8b56d" strokeOpacity=".55" strokeWidth=".8">
            <rect x="7" y="7" width="12" height="12" />
            <rect x="7" y="7" width="12" height="12" transform="rotate(45 13 13)" />
            <path d="M0 0L7 7M26 0L19 7M0 26L7 19M26 26L19 19" />
          </g>
        </pattern>
        <radialGradient id="warmGlow">
          <stop offset="0" stopColor="#fff2cf" stopOpacity=".95" />
          <stop offset=".35" stopColor="#f3b867" stopOpacity=".6" />
          <stop offset="1" stopColor="#e09a45" stopOpacity="0" />
        </radialGradient>
        <radialGradient id="lampBody" cx=".5" cy=".55" r=".6">
          <stop offset="0" stopColor="#fff3d0" />
          <stop offset=".45" stopColor="#f4b562" />
          <stop offset="1" stopColor="#9c5a1f" />
        </radialGradient>
        <symbol id="fanoos" viewBox="0 0 60 140">
          <ellipse cx="30" cy="66" rx="40" ry="46" fill="url(#warmGlow)" opacity=".75" />
          <circle cx="30" cy="6" r="4.5" fill="none" stroke="currentColor" strokeWidth="2" />
          <path d="M30 10V18" stroke="currentColor" strokeWidth="2" />
          <path d="M17 32Q30 6 43 32Z" fill="currentColor" />
          <rect x="13" y="31" width="34" height="5" rx="1" fill="currentColor" />
          <path d="M14 36H46L53 62L46 96H14L7 62Z" fill="url(#lampBody)" stroke="currentColor" strokeWidth="2" />
          <path d="M30 36V96M7 62H53M14 36L22 62L14 96M46 36L38 62L46 96" fill="none" stroke="currentColor" strokeWidth="1.1" opacity=".85" />
          <path d="M26 56Q26 46 30 42Q34 46 34 56V70H26Z" fill="#fff6dc" opacity=".8" />
          <path d="M13 96H47L39 109H21Z" fill="currentColor" />
          <circle cx="30" cy="114" r="3.2" fill="currentColor" />
          <path d="M30 117V134" stroke="currentColor" strokeWidth="1.6" />
          <path d="M26 127L30 138L34 127" fill="none" stroke="currentColor" strokeWidth="1.2" />
        </symbol>
        <symbol id="star8" viewBox="-50 -50 100 100">
          <g fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="-30" y="-30" width="60" height="60" />
            <rect x="-30" y="-30" width="60" height="60" transform="rotate(45)" />
            <circle r="13" />
          </g>
        </symbol>
      </defs>
    </svg>
  )
}

/* ---------- Bismillah: a deep-green band; the calligraphy is unveiled right to left ---------- */
export function BismillahBand() {
  const ref = useRef(null)
  useLayoutEffect(() => {
    if (prefersReducedMotion()) return
    const sec = ref.current
    const ctx = gsap.context(() => {
      gsap.set('.bism-ar', { clipPath: 'inset(0% 0% 0% 100%)' })
      gsap.set('.bism-en', { opacity: 0, y: 20 })
      gsap.timeline({ scrollTrigger: { trigger: sec, start: 'top top', end: '+=140%', scrub: 1, pin: true } })
        .from('.bism-star', { scale: 0, rotation: -180, opacity: 0, duration: 0.6 })
        .to('.bism-ar', { clipPath: 'inset(0% 0% 0% 0%)', duration: 2, ease: 'none' })
        .from('.bism-rule', { scaleX: 0, opacity: 0, duration: 0.6 }, '-=.3')
        .to('.bism-en', { opacity: 1, y: 0, duration: 0.7 })
        .to({}, { duration: 0.6 })
    }, sec)
    return () => ctx.revert()
  }, [])
  return (
    <section ref={ref} id="bismillah" className="band bism" aria-label="Bismillah">
      <div className="bism-inner">
        <svg className="bism-star" aria-hidden="true"><use href="#star8" /></svg>
        <p className="bism-ar gold-text" lang="ar" dir="rtl">{bismillah}</p>
        <Rule className="rule light bism-rule" />
        <p className="bism-en">In the name of Allah, the Most Gracious, the Most Merciful</p>
      </div>
    </section>
  )
}

/* ---------- The announcement: the invitation wording, lit word by word as you read ---------- */
export function AnnouncementSection() {
  const ref = useRef(null)
  useLayoutEffect(() => {
    if (prefersReducedMotion()) return
    const ctx = gsap.context(() => {
      gsap.fromTo('.ann-text .w', { opacity: 0.16 }, {
        opacity: 1, stagger: 0.06, ease: 'none',
        scrollTrigger: { trigger: '.ann-text', start: 'top 78%', end: 'bottom 50%', scrub: true },
      })
    }, ref)
    return () => ctx.revert()
  }, [])
  const words = wedding.invitationWording.en.split(/\s+/)
  return (
    <div ref={ref}>
      <Sec id="announce" className="wide" label="The invitation">
        <div className="announce-grid">
          <div className="announce-head">
            <p className="eyebrow rv">Alhamdulillah</p>
            <h2 className="h2 rv">Our son is <em>getting married</em></h2>
            <Rule className="rule rv" />
          </div>
          <div>
            <p className="ann-text">
              {words.map((w, i) => <span key={i} className="w">{w} </span>)}
            </p>
            {has(wedding.invitationWording.ur) && <p className="ann-ur rv" lang="ur" dir="rtl">{wedding.invitationWording.ur}</p>}
          </div>
        </div>
      </Sec>
    </div>
  )
}

/* ---------- Family reveal: the whole stage → groom → together → bride → whole, then petals ---------- */
// nikah-stage-1376.webp is 1376×688 (watermark trimmed). Focus points are fractions of the image.
const STAGE = { w: 1376, h: 688, focus: { bride: { x: 0.574, y: 0.7 }, groom: { x: 0.432, y: 0.7 } } }

export function FamilyReveal() {
  const secRef = useRef(null)
  const camRef = useRef(null)
  useLayoutEffect(() => {
    if (prefersReducedMotion()) return
    const sec = secRef.current, cam = camRef.current
    const q = (s) => sec.querySelector(s)
    const geom = () => {
      const W = sec.offsetWidth, H = sec.offsetHeight
      const k = Math.min(W / STAGE.w, (H - 40) / STAGE.h)
      const bw = STAGE.w * k, bh = STAGE.h * k
      cam.style.width = `${bw}px`
      cam.style.height = `${bh}px`
      return { W, H, bw, bh }
    }
    const whole = () => {
      const g = geom()
      return { x: (g.W - g.bw) / 2, y: (g.H - g.bh) / 2 + 20, scale: 1 }
    }
    const zoom = (who) => {
      const g = geom(), f = STAGE.focus[who]
      const cardH = Math.max(q('#c-bride').offsetHeight, q('#c-groom').offsetHeight)
      const free = g.H - cardH
      const s = Math.min(g.W < 700 ? 4.2 : 2.8, Math.max(1.2, free / ((g.W < 700 ? 0.5 : 0.36) * g.bh)))
      const w = g.bw * s, h = g.bh * s
      let x = g.W / 2 - f.x * w, y = cardH + free / 2 - f.y * h
      if (w >= g.W) x = Math.min(0, Math.max(g.W - w, x))
      if (h >= g.H) y = Math.min(0, Math.max(g.H - h, y))
      return { x, y, scale: s }
    }
    const camTo = (fn) => ({ x: () => fn().x, y: () => fn().y, scale: () => fn().scale, ease: 'power2.inOut', duration: 1.9 })
    let fired = false
    const ctx = gsap.context(() => {
      gsap.set(cam, { transformOrigin: '0 0', ...whole() })
      gsap.set('.fcard', { opacity: 0, y: -14 })
      gsap.set('#c-intro', { opacity: 1, y: 0 })
      const cardIn = { opacity: 1, y: 0, duration: 0.7, ease: 'power2.out' }
      const cardOut = { opacity: 0, y: -10, duration: 0.5 }
      gsap.timeline({
        defaults: { ease: 'none' },
        scrollTrigger: {
          trigger: sec, start: 'top top', end: '+=600%', pin: true, scrub: 0.7, anticipatePin: 1, invalidateOnRefresh: true,
          onRefreshInit: () => gsap.set(cam, whole()),
          onUpdate: (st) => {
            if (st.progress > 0.95 && !fired) { fired = true; petalShower(2800) }
            else if (st.progress < 0.8) fired = false
          },
        },
      })
        .to({}, { duration: 1.4 }, 0)
        .to('#c-intro', cardOut, 1.2)
        .to(cam, camTo(() => zoom('groom')), 2.2)
        .to('#c-groom', cardIn, 3.6)
        .to('#c-groom', cardOut, 5.4)
        .to(cam, camTo(whole), 5.6)
        .to('#c-hum', cardIn, 6.9)
        .to('#c-hum', cardOut, 8.2)
        .to(cam, camTo(() => zoom('bride')), 8.4)
        .to('#c-bride', cardIn, 9.8)
        .to('#c-bride', cardOut, 11.6)
        .to(cam, camTo(whole), 11.6)
        .to({}, { duration: 1.4 }, 13.5)
    }, sec)
    return () => ctx.revert()
  }, [])
  const bm = parent('bride', 'Mother'), bf = parent('bride', 'Father'), gm = parent('groom', 'Mother'), gf = parent('groom', 'Father')
  return (
    <section ref={secRef} className="fam" id="fam" aria-label="The bride and groom">
      <div className="fam-bg" aria-hidden="true" />
      <div ref={camRef} className="cam">
        <img
          src="/images/invite/nikah-stage-1376.webp"
          srcSet="/images/invite/nikah-stage-820.webp 820w, /images/invite/nikah-stage-1376.webp 1376w"
          sizes="(max-width: 700px) 1376px, 100vw"
          width="1376"
          height="688"
          alt={`${groom.en} and ${bride.en} seated on the Nikah stage beneath white-rose arches, surrounded by family and friends`}
          decoding="async"
          loading="lazy"
        />
      </div>
      <div className="fcards">
        <div className="fcard plain" id="c-intro">
          <p className="lbl"><span className="intro-title">Two families, one beautiful beginning</span></p>
          <p className="of">Scroll to meet them</p>
        </div>
        <div className="fcard" id="c-bride">
          <p className="lbl">The Bride</p>
          <p className="of">Daughter of</p>
          <p className="par">{bf.en} &amp; {bm.en}</p>
          <p className="nm">{bride.full}</p>
          {has(bride.script) && <p className="nm-ur" lang="ur" dir="rtl">{bride.script}</p>}
        </div>
        <div className="fcard plain" id="c-hum">
          <p className="hum" lang="ur" dir="rtl">ہمراہ</p>
          <p className="hum-t">Humraah, together for life</p>
        </div>
        <div className="fcard" id="c-groom">
          <p className="lbl">The Groom</p>
          <p className="of">Son of</p>
          <p className="par">{gf.en} &amp; {gm.en}</p>
          <p className="nm">{groom.full}</p>
          {has(groom.script) && <p className="nm-ur" lang="ur" dir="rtl">{groom.script}</p>}
        </div>
      </div>
    </section>
  )
}

/* ---------- The couple: arch name cards that slide in from both sides (Groom · ہمراہ · Bride) ---------- */
function PersonArch({ side }) {
  const p = wedding.couple[side]
  const f = parent(side, 'Father'), m = parent(side, 'Mother')
  return (
    <article className={`arch-card ${side}`}>
      <svg className="arch-tip" viewBox="0 0 34 34" aria-hidden="true">
        <path d="M17 1L22 12L33 17L22 22L17 33L12 22L1 17L12 12Z" fill="var(--cream)" stroke="currentColor" strokeWidth="1.2" />
        <circle cx="17" cy="17" r="3" fill="currentColor" />
      </svg>
      <p className="role-lbl">{side === 'bride' ? 'The Bride' : 'The Groom'}</p>
      <h3 className="arch-name">{p.full}</h3>
      {has(p.script) && <p className="arch-name-ur" lang="ur" dir="rtl">{p.script}</p>}
      <p className="of-lbl">{side === 'bride' ? 'Daughter of' : 'Son of'}</p>
      <p className="arch-parents"><span>{f.en}</span>&amp; {m.en}</p>
      {has(f.script) && has(m.script) && <p className="arch-parents-ur" lang="ur" dir="rtl">{f.script} و {m.script}</p>}
    </article>
  )
}
export function CoupleSection() {
  const ref = useRef(null)
  useLayoutEffect(() => {
    if (prefersReducedMotion()) return
    const wide = innerWidth > 860
    const ctx = gsap.context(() => {
      gsap.timeline({ scrollTrigger: { trigger: '.couple-grid', start: 'top 78%', once: true } })
        .from('.arch-card.groom', { x: wide ? -90 : 0, y: wide ? 0 : 50, opacity: 0, duration: 1.3, ease: 'power3.out' })
        .from('.arch-card.bride', { x: wide ? 90 : 0, y: wide ? 0 : 50, opacity: 0, duration: 1.3, ease: 'power3.out' }, wide ? '<' : '-=.6')
        .from('.humraah svg', { scale: 0, rotation: -120, opacity: 0, duration: 1, ease: 'back.out(1.6)' }, '-=.8')
        .from('.humraah p', { opacity: 0, y: 16, stagger: 0.12, duration: 0.7 }, '-=.4')
        .add(() => petalShower(2400), '-=.6')
    }, ref)
    return () => ctx.revert()
  }, [])
  return (
    <div ref={ref}>
      <Sec id="couple" className="wide" label="The couple">
        <p className="eyebrow rv">The Nikah of</p>
        <Rule className="rule rv" />
        <div className="couple-grid">
          <PersonArch side="groom" />
          <div className="humraah">
            <svg viewBox="0 0 96 72" aria-hidden="true">
              <g fill="none" stroke="currentColor" strokeWidth="2.4"><circle cx="36" cy="44" r="20" /><circle cx="60" cy="44" r="20" /></g>
              <path d="M30 22L36 14L42 22L36 27Z" fill="currentColor" />
            </svg>
            <p className="hum-ur" lang="ur" dir="rtl">ہمراہ</p>
            <p className="hum-en">Humraah</p>
          </div>
          <PersonArch side="bride" />
        </div>
      </Sec>
    </div>
  )
}

/* ---------- Families with grandparents ---------- */
function deceasedMark(person) {
  const style = wedding.deceasedStyle
  if (!person.deceased) return null
  if (isFill(style)) return <Fill value={style} />
  if (style === 'marhoom') return <span className="deceased">{person.gender === 'f' ? 'Marhooma' : 'Marhoom'}</span>
  return <span className="deceased" lang="ar" dir="rtl">{person.gender === 'f' ? 'رحمها الله' : 'رحمه الله'}</span>
}
function PersonRow({ p }) {
  return (
    <li className="person">
      <span className="role">{p.role}</span>
      <span className="pname">{p.en} {deceasedMark(p)}</span>
      {has(p.script) && <span className="pname-ur" lang="ur" dir="rtl">{p.script}</span>}
    </li>
  )
}
export function FamiliesSection() {
  return (
    <Sec id="families" tone="blush" className="wide" label="Our families">
      <p className="eyebrow rv">With the blessings of</p>
      <h2 className="h2 rv">Our <em>families</em></h2>
      <div className="families">
        {['groom', 'bride'].map((side) => {
          const f = wedding.families[side]
          return (
            <article key={side} className="family rv">
              <h3>{f.label}</h3>
              <ul>{f.parents.map((p) => <PersonRow key={p.en} p={p} />)}</ul>
              {f.grandparents.length > 0 && (
                <>
                  <h4>Grandparents</h4>
                  <ul>{f.grandparents.map((p) => <PersonRow key={p.en} p={p} />)}</ul>
                </>
              )}
            </article>
          )
        })}
      </div>
    </Sec>
  )
}

/* ---------- The verse: lanterns lower on their chains while a gold mihrab is drawn around the words ---------- */
export function VerseSection() {
  const ref = useRef(null)
  useLayoutEffect(() => {
    if (prefersReducedMotion()) return
    const sec = ref.current
    const ctx = gsap.context(() => {
      const outline = sec.querySelector('.mihrab-line')
      const len = outline.getTotalLength()
      gsap.set(outline, { strokeDasharray: len, strokeDashoffset: len })
      gsap.timeline({ defaults: { ease: 'none' }, scrollTrigger: {
        trigger: sec,
        // If the verse is taller than the screen, pin it once its bottom is in view, so nothing is cut off.
        start: () => (sec.offsetHeight > innerHeight ? 'bottom bottom' : 'top top'),
        end: '+=200%', pin: true, scrub: 1, invalidateOnRefresh: true,
      } })
        .fromTo('.v-lantern', { yPercent: -120 }, { yPercent: 0, ease: 'power2.out', stagger: 0.25, duration: 2 }, 0)
        .to(outline, { strokeDashoffset: 0, duration: 2.4 }, 0.4)
        .fromTo('.mihrab-fill', { opacity: 0 }, { opacity: 1, duration: 1 }, 2.2)
        .fromTo('.verse-body > *', { opacity: 0, y: 22 }, { opacity: 1, y: 0, stagger: 0.25, duration: 1 }, 2.4)
        .to({}, { duration: 1 })
    }, sec)
    return () => ctx.revert()
  }, [])
  return (
    <section ref={ref} id="quote" className="band verse" aria-label="A verse on marriage">
      <div className="v-stars" aria-hidden="true" />
      <div className="v-lanterns" aria-hidden="true">
        {[0, 1, 2, 3, 4].map((i) => (
          <svg key={i} className={`v-lantern l${i}`} viewBox="0 0 60 400"><path d="M30 0V260" stroke="var(--gold)" strokeWidth="1.2" /><use href="#fanoos" y="258" width="60" height="140" style={{ color: 'var(--gold)' }} /></svg>
        ))}
      </div>
      <div className="mihrab">
        <svg className="mihrab-svg" viewBox="0 0 600 760" preserveAspectRatio="none" aria-hidden="true">
          <path className="mihrab-fill" d="M40 740V300C40 160 180 70 300 20C420 70 560 160 560 300V740Z" />
          <path className="mihrab-line" d="M40 740V300C40 160 180 70 300 20C420 70 560 160 560 300V740Z" />
        </svg>
        <div className="verse-body">
          <p className="eyebrow">{wedding.sacred.verse.ref}</p>
          <p className="ar verse-ar" lang="ar" dir="rtl">{wedding.sacred.verse.arabic}</p>
          <Rule className="rule light" />
          <p className="body verse-en">“{wedding.sacred.verse.en}”</p>
          <p className="body urdu-block verse-ur" lang="ur" dir="rtl">{wedding.sacred.verse.ur}</p>
        </div>
      </div>
    </section>
  )
}

/* ---------- Scratch card (save the date) ---------- */
function Scratch({ onReveal, revealed }) {
  const cv = useRef(null)
  useEffect(() => {
    if (revealed) return
    const c = cv.current, g = c.getContext('2d', { willReadFrequently: true })
    let drawing = false, moves = 0
    const paint = () => {
      const r = c.getBoundingClientRect(), d = Math.min(devicePixelRatio || 1, 2)
      if (!r.width) return
      c.width = Math.round(r.width * d)
      c.height = Math.round(r.height * d)
      g.globalCompositeOperation = 'source-over'
      const grad = g.createLinearGradient(0, 0, c.width, c.height)
      grad.addColorStop(0, '#c9a24f'); grad.addColorStop(0.35, '#f1dfa6'); grad.addColorStop(0.6, '#b98f3e'); grad.addColorStop(1, '#e3c47c')
      g.fillStyle = grad
      g.fillRect(0, 0, c.width, c.height)
      g.strokeStyle = 'rgba(255,255,255,.26)'
      g.lineWidth = d
      for (let i = -c.height; i < c.width; i += 14 * d) { g.beginPath(); g.moveTo(i, 0); g.lineTo(i + c.height, c.height); g.stroke() }
      g.fillStyle = '#4a3712'
      g.textAlign = 'center'
      g.textBaseline = 'middle'
      g.font = `500 ${14 * d}px Cinzel, Georgia, serif`
      g.fillText('SCRATCH HERE', c.width / 2, c.height / 2 - 6 * d)
      g.font = `${13 * d}px Georgia, serif`
      g.fillStyle = 'rgba(74,55,18,.8)'
      g.fillText('✦   ✦   ✦', c.width / 2, c.height / 2 + 20 * d)
    }
    const pos = (e) => { const r = c.getBoundingClientRect(), d = c.width / r.width; return [(e.clientX - r.left) * d, (e.clientY - r.top) * d] }
    const at = (e) => {
      const [x, y] = pos(e)
      g.globalCompositeOperation = 'destination-out'
      g.lineCap = g.lineJoin = 'round'
      g.lineWidth = 44 * (c.width / c.getBoundingClientRect().width)
      g.lineTo(x, y); g.stroke(); g.beginPath(); g.moveTo(x, y)
    }
    const cleared = () => {
      const data = g.getImageData(0, 0, c.width, c.height).data
      let n = 0, t = 0
      for (let i = 3; i < data.length; i += 64) { t++; if (data[i] < 40) n++ }
      return n / t
    }
    const down = (e) => { drawing = true; c.setPointerCapture(e.pointerId); g.beginPath(); const [x, y] = pos(e); g.moveTo(x, y); at(e) }
    const move = (e) => { if (!drawing) return; at(e); if (++moves % 12 === 0 && cleared() > 0.35) onReveal() }
    const up = () => { drawing = false; if (cleared() > 0.35) onReveal() }
    paint()
    document.fonts?.ready.then(paint)
    c.addEventListener('pointerdown', down)
    c.addEventListener('pointermove', move)
    c.addEventListener('pointerup', up)
    c.addEventListener('pointercancel', up)
    addEventListener('resize', paint)
    return () => {
      c.removeEventListener('pointerdown', down)
      c.removeEventListener('pointermove', move)
      c.removeEventListener('pointerup', up)
      c.removeEventListener('pointercancel', up)
      removeEventListener('resize', paint)
    }
  }, [revealed, onReveal])
  return <canvas ref={cv} className={revealed ? 'gone' : ''} aria-label="Gold scratch card hiding the Nikah date" />
}

function useCountdown(target, on) {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    if (!on) return
    const t = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(t)
  }, [on])
  const left = Math.max(0, target - now)
  return { left, d: Math.floor(left / 864e5), h: Math.floor(left / 36e5) % 24, m: Math.floor(left / 6e4) % 60, s: Math.floor(left / 1e3) % 60 }
}

function googleCal(e) {
  const f = (d) => d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '')
  const a = zonedToDate(e.date, e.start, wedding.timezone), b = zonedToDate(e.date, e.end, wedding.timezone)
  const q = new URLSearchParams({ action: 'TEMPLATE', text: `${e.name.en} of ${couple}`, dates: `${f(a)}/${f(b)}`, location: `${e.venue.name}, ${e.venue.address}`, details: `${e.dressCode}\n${e.note}` })
  return `https://calendar.google.com/calendar/render?${q}`
}

function EventButtons({ e }) {
  return (
    <div className="btns rv">
      <a className="btn" href={e.venue.mapUrl} target="_blank" rel="noopener noreferrer">
        <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4" aria-hidden="true"><path d="M8 15s5-4.6 5-8.5A5 5 0 0 0 3 6.5C3 10.4 8 15 8 15Z" /><circle cx="8" cy="6.5" r="1.8" /></svg>
        Open location
      </a>
      <a className="btn" href={googleCal(e)} target="_blank" rel="noopener noreferrer">
        <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4" aria-hidden="true"><rect x="2" y="3" width="12" height="11" rx="1" /><path d="M2 7H14M5 1.5V4M11 1.5V4" /></svg>
        Google Calendar
      </a>
      <button type="button" className="btn" onClick={() => downloadIcs(`${e.id}.ics`, eventIcs(e, couple, wedding.timezone))}>Apple / Outlook (.ics)</button>
    </div>
  )
}

function EventFacts({ e, extra }) {
  const prayer = useMemo(() => maghribIsha(e.date, e.venue.lat, e.venue.lng, wedding.timezone), [e])
  return (
    <dl className="facts rv">
      {extra}
      <dt>Time</dt>
      <dd>{e.timeLabel || formatTime12(e.start)}{e.id === 'walima' ? ' onwards' : ''}{e.note && !e.timeLabel && <small>{e.note}</small>}</dd>
      <dt>Venue</dt>
      <dd>{e.venue.name}<small>{e.venue.address}</small></dd>
      {e.hostedBy && (<><dt>Hosted by</dt><dd><V v={e.hostedBy} /></dd></>)}
      {e.dressCode && (<><dt>Dress code</dt><dd>{e.dressCode}</dd></>)}
      <dt>Prayer</dt>
      <dd>Maghrib {prayer.maghrib} · Isha {prayer.isha}<small>Approximate, please check your local masjid.</small></dd>
    </dl>
  )
}

/* ---------- The Nikah: art, scratch-to-reveal date, details, countdown and the order of the evening ---------- */
export function NikahSection() {
  const [revealed, setRevealed] = useState(() => prefersReducedMotion())
  const reveal = useMemo(() => () => setRevealed((r) => { if (!r) goldBurst(); return true }), [])
  const cd = useCountdown(zonedToDate(nikah.date, nikah.start, wedding.timezone), revealed)
  const hijri = formatHijri(nikah.date)
  return (
    <Sec id="nikah" className="wide event" label="The Nikah">
      <div className="event-grid">
        <div className="event-art rv">
          <svg viewBox="0 0 300 390" aria-hidden="true">
            <path className="art-bg" d="M20 380V170C20 92 95 40 150 8C205 40 280 92 280 170V380Z" />
            <circle className="art-glow" cx="150" cy="210" r="130" />
            <path className="art-stroke" d="M20 380V170C20 92 95 40 150 8C205 40 280 92 280 170V380Z" />
            <path className="art-stroke-d" d="M34 380V174C34 104 100 58 150 26C200 58 266 104 266 174V380" />
            <path className="art-fill-g" d="M150 62a16 16 0 1 0 12 26a13 13 0 1 1 -12 -26Z" />
            <g className="nk-rings">
              <circle className="art-stroke" cx="136" cy="136" r="17" style={{ strokeWidth: 3 }} />
              <circle className="art-stroke" cx="162" cy="136" r="17" style={{ strokeWidth: 3 }} />
              <path className="art-fill-g" d="M131 114L136 107L141 114L136 118Z" />
            </g>
            <g>
              <path className="art-fill-gd" d="M88 238Q120 226 150 246Q180 226 212 238L212 246Q180 236 150 254Q120 236 88 246Z" />
              <path className="art-fill-iv" d="M150 246Q122 226 92 232L96 194Q124 188 150 208Z" />
              <path className="art-fill-iv" d="M150 246Q178 226 208 232L204 194Q176 188 150 208Z" opacity=".92" />
              <g className="art-stroke-d" style={{ strokeWidth: 1 }}>
                <path d="M104 204Q124 200 142 212M104 212Q124 208 142 220M103 220Q124 216 142 228M102 228Q122 224 142 236" />
                <path d="M158 212Q176 200 196 204M158 220Q176 208 196 212M158 228Q176 216 197 220M158 236Q178 224 198 228" />
              </g>
            </g>
            <g stroke="var(--gold-deep)" strokeWidth="11" strokeLinecap="round"><path d="M104 352L196 244" /><path d="M196 352L104 244" /></g>
            <g stroke="var(--gold)" strokeWidth="1.2" fill="none" opacity=".7"><path d="M104 352L196 244M196 352L104 244" /></g>
            <circle className="art-fill-g" cx="150" cy="298" r="5" />
            <path className="art-stroke-d" d="M60 380H240" />
          </svg>
        </div>
        <div className="event-info">
          <p className="eyebrow rv">The blessed union · <span lang="ur" dir="rtl" className="ur-inline">{nikah.name.script}</span></p>
          <h2 className="event-title rv">The <em>Nikah</em></h2>
          <div className="scratch-wrap rv">
            <p className="cd-label">Save the date · scratch the gold card</p>
            <div className="scratch">
              <div className="under" aria-live="polite">
                {revealed && (
                  <>
                    <b>{formatGregorian(nikah.date)}</b>
                    {hijri && <span>{hijri} (approx., subject to moon sighting)</span>}
                  </>
                )}
              </div>
              {!prefersReducedMotion() && <Scratch onReveal={reveal} revealed={revealed} />}
            </div>
            {!revealed && <button className="skip" type="button" onClick={reveal}>Or tap to reveal</button>}
          </div>
          <EventFacts e={nikah} />
          <div className={`stack after ${revealed ? '' : 'wait'}`}>
            <p className="cd-label">Counting down, Insha’Allah</p>
            <div className="countdown" role="timer" aria-live="off">
              {[['Days', cd.d], ['Hours', cd.h], ['Minutes', cd.m], ['Seconds', cd.s]].map(([k, v]) => (
                <div key={k}><b>{String(v).padStart(2, '0')}</b><span>{k}</span></div>
              ))}
            </div>
          </div>
          <EventButtons e={nikah} />
        </div>
      </div>
      {wedding.nikahDay.length > 0 && <NikahTimeline />}
    </Sec>
  )
}

function NikahTimeline() {
  const ref = useRef(null)
  const [lit, setLit] = useState(() => (prefersReducedMotion() ? 1 : 0))
  useLayoutEffect(() => {
    if (prefersReducedMotion()) return
    const st = ScrollTrigger.create({ trigger: ref.current, start: 'top 70%', end: 'bottom 55%', onUpdate: (s) => setLit(s.progress) })
    return () => st.kill()
  }, [])
  const n = wedding.nikahDay.length
  return (
    <div className="timeline">
      <p className="eyebrow rv">Order of the evening</p>
      <ol ref={ref} className="path" style={{ '--progress': lit }}>
        {wedding.nikahDay.map((s, i) => {
          const on = clamp01(lit * n - i)
          return (
            <li key={s.label} className={`step ${on > 0.5 ? 'is-lit' : ''}`}>
              <Lantern lit={on} size={40} />
              <div>
                <p className="step-time">{formatTime12(s.time)}</p>
                <p className="step-label">{s.label}</p>
              </div>
            </li>
          )
        })}
      </ol>
    </div>
  )
}

/* ---------- Duas: a horizontal walk through words to hold close (texts supplied by the family) ---------- */
export function DuasBand() {
  const ref = useRef(null)
  const trackRef = useRef(null)
  useLayoutEffect(() => {
    if (prefersReducedMotion()) return
    const track = trackRef.current
    const dist = () => Math.max(0, track.scrollWidth - innerWidth)
    const tw = gsap.to(track, { x: () => -dist(), ease: 'none', scrollTrigger: { trigger: ref.current, start: 'top top', end: () => `+=${dist()}`, scrub: 1, pin: true, invalidateOnRefresh: true } })
    return () => { tw.scrollTrigger?.kill(); tw.kill() }
  }, [])
  return (
    <section ref={ref} id="duas" className="band duas" aria-label="Duas for the couple">
      <div className="dua-view">
        <div ref={trackRef} className="dua-track">
          <div className="dua-intro">
            <p className="eyebrow">Words to hold close</p>
            <h2 className="h2">Blessings and <em>duas</em> for {groom.en} &amp; {bride.en}</h2>
            <Rule className="rule light" />
          </div>
          {wedding.sacred.blessings.map((b) => (
            <article key={b.kind} className="dua">
              <p className="kind">{b.kind}</p>
              <p className="ar" lang="ar" dir="rtl">{b.arabic}</p>
              {b.translit && <p className="translit">{b.translit}</p>}
              <p className="en">{b.en}</p>
              {b.ur && <p className="dua-ur" lang="ur" dir="rtl">{b.ur}</p>}
              <p className="src">{b.source}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  )
}

/* ---------- The Walima hero: the night garden photo, a slow walk in to the couple ---------- */
// walima-night-1376.webp is 1376×768. The couple stand at about x 0.51, y 0.62 of the picture.
const WALIMA = { w: 1376, h: 768, couple: { x: 0.51, y: 0.6 } }
// Fairy-light twinkles placed over the string lights and chandeliers in the photo (fractions of the image).
const TWINKLES = [
  [0.02, 0.28], [0.05, 0.36], [0.09, 0.22], [0.12, 0.4], [0.16, 0.3], [0.19, 0.18], [0.23, 0.36], [0.07, 0.48],
  [0.8, 0.22], [0.83, 0.34], [0.86, 0.2], [0.89, 0.42], [0.92, 0.3], [0.95, 0.18], [0.97, 0.4], [0.88, 0.5],
  [0.16, 0.37], [0.84, 0.38], [0.31, 0.04], [0.5, 0.02], [0.68, 0.04], [0.27, 0.28], [0.72, 0.27],
]

function WalimaHero() {
  const secRef = useRef(null)
  const camRef = useRef(null)
  useLayoutEffect(() => {
    if (prefersReducedMotion()) return
    const sec = secRef.current, cam = camRef.current
    const geom = () => {
      const W = sec.offsetWidth, H = sec.offsetHeight
      const k = Math.min(W / WALIMA.w, H / WALIMA.h)
      cam.style.width = `${WALIMA.w * k}px`
      cam.style.height = `${WALIMA.h * k}px`
      return { W, H, bw: WALIMA.w * k, bh: WALIMA.h * k }
    }
    const whole = () => {
      const g = geom()
      return { x: (g.W - g.bw) / 2, y: (g.H - g.bh) / 2, scale: 1 }
    }
    const couple = () => {
      const g = geom()
      // Frame the couple head to toe in the lower two-thirds, under the caption.
      const s = Math.min(g.W < 700 ? 3.4 : 1.9, Math.max(1.3, (g.H * 0.78) / (0.62 * g.bh)))
      const w = g.bw * s, h = g.bh * s
      let x = g.W / 2 - WALIMA.couple.x * w, y = g.H * 0.58 - WALIMA.couple.y * h
      if (w >= g.W) x = Math.min(0, Math.max(g.W - w, x))
      if (h >= g.H) y = Math.min(0, Math.max(g.H - h, y))
      return { x, y, scale: s }
    }
    const camTo = (fn, d = 2.4) => ({ x: () => fn().x, y: () => fn().y, scale: () => fn().scale, ease: 'power1.inOut', duration: d })
    const ctx = gsap.context(() => {
      gsap.set(cam, { transformOrigin: '0 0', ...whole() })
      gsap.set(['.wh-couple', '.wh-evening'], { opacity: 0, y: 16 })
      gsap.timeline({
        defaults: { ease: 'none' },
        scrollTrigger: {
          trigger: sec, start: 'top top', end: '+=360%', pin: true, scrub: 0.9, anticipatePin: 1, invalidateOnRefresh: true,
          onRefreshInit: () => gsap.set(cam, whole()),
        },
      })
        .fromTo('.wh-title > *', { opacity: 0, y: 22 }, { opacity: 1, y: 0, stagger: 0.18, duration: 0.9 }, 0)
        .to({}, { duration: 0.6 })
        .to('.wh-title', { opacity: 0, y: -20, duration: 0.7 }, 1.6)
        .to(cam, camTo(couple), 1.7)
        .to('.wh-couple', { opacity: 1, y: 0, duration: 0.8, ease: 'power2.out' }, 3.4)
        .to('.wh-couple', { opacity: 0, y: -12, duration: 0.6 }, 5.2)
        .to(cam, camTo(whole, 2), 5.2)
        .to('.wh-shade', { opacity: 1, duration: 1.4 }, 6)
        .to('.wh-evening', { opacity: 1, y: 0, duration: 0.9, ease: 'power2.out' }, 6.5)
        .to({}, { duration: 1 })
    }, sec)
    return () => ctx.revert()
  }, [])
  const day = new Intl.DateTimeFormat('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' }).format(new Date(`${walima.date}T12:00:00Z`))
  return (
    <section ref={secRef} id="walima" className="walima-hero" aria-label="The Walima">
      <div className="wh-bg" aria-hidden="true" />
      <div ref={camRef} className="wh-cam">
        <img
          src="/images/invite/walima-night-1376.webp"
          srcSet="/images/invite/walima-night-820.webp 820w, /images/invite/walima-night-1376.webp 1376w"
          sizes="(max-width: 700px) 1376px, 100vw"
          width="1376"
          height="768"
          alt={`${groom.en} and ${bride.en} on a white aisle in a night garden, under a gold jaali arch with the H|H monogram, chandeliers and lanterns, with family on either side`}
          loading="lazy"
          decoding="async"
        />
        <div className="wh-twinkles" aria-hidden="true">
          {TWINKLES.map(([x, y], i) => (
            <i key={i} style={{ left: `${x * 100}%`, top: `${y * 100}%`, animationDelay: `${(i * 0.37) % 2.6}s`, animationDuration: `${1.8 + (i % 5) * 0.45}s` }} />
          ))}
        </div>
      </div>
      <div className="wh-shade" aria-hidden="true" />
      <div className="wh-title">
        <p className="eyebrow">Dawat-e-Walima · <span lang="ur" dir="rtl" className="ur-inline">{walima.name.script}</span></p>
        <h2 className="wh-h">The <em>Walima</em></h2>
        <p className="wh-sub">Hosted by the groom’s family</p>
      </div>
      <div className="wh-couple">
        <p className="wh-names">{groom.en} <span>&amp;</span> {bride.en}</p>
        <p className="wh-date">{day} · {formatTime12(walima.start)} onwards</p>
      </div>
      <div className="wh-evening">
        <p className="eyebrow">An evening under the stars</p>
        <p className="wh-venue">{walima.venue.name}</p>
        <p className="wh-note">{walima.note}</p>
      </div>
    </section>
  )
}

/* ---------- The Walima details: night sky, lantern art and everything a guest needs ---------- */
function Swags() {
  const pts = []
  const swag = (x1, x2, y, dip, cls) => {
    for (let i = 0; i <= 22; i++) {
      const t = i / 22
      pts.push(<circle key={`${x1}-${y}-${i}`} className={i % 3 ? cls : 'art-fill-g'} cx={x1 + (x2 - x1) * t} cy={y + Math.sin(Math.PI * t) * dip} r={i % 3 ? 3.4 : 2.4} />)
    }
  }
  swag(48, 150, 150, 40, 'art-fill-r'); swag(150, 252, 150, 40, 'art-fill-r')
  swag(62, 150, 118, 26, 'art-fill-iv'); swag(150, 238, 118, 26, 'art-fill-iv')
  return <g>{pts}</g>
}
export function WalimaSection() {
  const hijri = formatHijri(walima.date)
  return (
    <>
      <WalimaHero />
      <Sec id="walima-details" tone="night" className="wide event" label="Walima details">
        <div className="night-sky" aria-hidden="true">
          <svg className="moon" viewBox="0 0 100 100"><path d="M62 12a40 40 0 1 0 26 66a32 32 0 1 1 -26 -66Z" fill="#f3e2b0" /></svg>
        </div>
        <div className="event-grid flip">
          <div className="event-art rv">
            <svg viewBox="0 0 300 390" aria-hidden="true">
              <defs><clipPath id="wArch"><path d="M34 380V174C34 104 100 58 150 26C200 58 266 104 266 174V380Z" /></clipPath></defs>
              <path className="art-bg night" d="M20 380V170C20 92 95 40 150 8C205 40 280 92 280 170V380Z" />
              <rect className="art-jaali" x="20" y="0" width="260" height="390" clipPath="url(#wArch)" opacity=".7" />
              <circle className="art-glow" cx="150" cy="200" r="120" />
              <path className="art-stroke" d="M20 380V170C20 92 95 40 150 8C205 40 280 92 280 170V380Z" />
              <path className="art-stroke-d" d="M34 380V174C34 104 100 58 150 26C200 58 266 104 266 174V380" />
              <Swags />
              <line x1="150" y1="26" x2="150" y2="128" stroke="var(--gold)" strokeWidth="1.2" />
              <use href="#fanoos" x="118" y="124" width="64" height="150" className="walima-lamp" style={{ color: 'var(--gold)' }} />
              <path className="art-fill-gd" d="M70 330H230L222 340H78Z" />
              <path className="art-stroke-d" d="M84 340V372M216 340V372" />
              <ellipse className="art-fill-g" cx="112" cy="324" rx="22" ry="5" />
              <path className="art-fill-iv" d="M96 324Q112 304 128 324Z" />
              <ellipse className="art-fill-g" cx="188" cy="324" rx="22" ry="5" />
              <path className="art-fill-r" d="M174 324Q188 308 202 324Z" />
              <path className="art-fill-g" d="M146 330V308Q150 300 154 308V330Z" />
              <path className="art-stroke-d" d="M60 380H240" />
            </svg>
          </div>
          <div className="event-info">
            <p className="eyebrow rv">Dawat-e-Walima · hosted by the groom’s family</p>
            <h2 className="event-title rv">Join us for <em>dinner</em></h2>
            <EventFacts
              e={walima}
              extra={<><dt>Date</dt><dd>{formatGregorian(walima.date)}{hijri && <small>{hijri} (approx., subject to moon sighting)</small>}</dd></>}
            />
            <EventButtons e={walima} />
          </div>
        </div>
      </Sec>
    </>
  )
}

/* ---------- Gratitude, under swaying strands of flowers (phoolon ki ladi) ---------- */
function Strands() {
  const ref = useRef(null)
  const strands = useMemo(() => {
    const cls = ['bead-r', 'bead-i', 'bead-g', 'bead-i', 'bead-d']
    const out = []
    for (let x = 20; x < 1440; x += 36) {
      const len = 110 + (((Math.sin(x * 12.9898) * 43758.5453) % 1) + 1) % 1 * 150
      const beads = []
      for (let y = 8; y < len; y += 9) beads.push({ y, c: cls[Math.floor((y / 9 + x) % cls.length)], r: y % 27 < 9 ? 3.6 : 3 })
      out.push({ x, len, beads })
    }
    return out
  }, [])
  useLayoutEffect(() => {
    if (prefersReducedMotion()) return
    const ctx = gsap.context(() => {
      gsap.utils.toArray('.strand', ref.current).forEach((s, i) => {
        gsap.to(s, { rotation: (i % 2 ? 1 : -1) * (1.4 + (i % 5) * 0.35), duration: 2.6 + (i % 4) * 0.4, ease: 'sine.inOut', yoyo: true, repeat: -1, svgOrigin: `${s.dataset.x} 0` })
      })
      gsap.from(ref.current, { yPercent: -60, ease: 'none', scrollTrigger: { trigger: ref.current.parentElement, start: 'top bottom', end: 'top 20%', scrub: true } })
    }, ref)
    return () => ctx.revert()
  }, [])
  return (
    <svg ref={ref} className="strands" viewBox="0 0 1440 280" preserveAspectRatio="xMidYMin slice" aria-hidden="true">
      {strands.map((s) => (
        <g key={s.x} className="strand" data-x={s.x}>
          <line x1={s.x} y1="0" x2={s.x} y2={s.len} />
          {s.beads.map((b) => <circle key={b.y} className={b.c} cx={s.x} cy={b.y} r={b.r} />)}
          <circle className="bead-d" cx={s.x} cy={s.len + 6} r="7" />
          <circle className="bead-r" cx={s.x} cy={s.len + 4} r="4.5" />
          <circle className="bead-g" cx={s.x} cy={s.len + 16} r="2.4" />
        </g>
      ))}
    </svg>
  )
}
export function GratitudeSection() {
  return (
    <Sec id="gratitude" className="grat-sec" label="With gratitude">
      <Strands />
      <p className="eyebrow rv">With heartfelt gratitude</p>
      <p className="grat-big rv">Your presence is our joy. Your <em>duas</em> are their greatest gift.</p>
      <p className="body rv">
        Please join us on these blessed days and remember {groom.en} and {bride.en} in your duas as they begin their life together.
      </p>
    </Sec>
  )
}

/* ---------- In loving memory: a lamp that keeps burning ---------- */
export function MemorySection() {
  const departed = ['groom', 'bride']
    .map((side) => ({ side, people: wedding.families[side].grandparents.filter((p) => p.deceased) }))
    .filter((d) => d.people.length > 0)
  return (
    <Sec id="memory" label="In loving memory">
      <div className="arch-card memory-card rv">
        <svg className="arch-tip" viewBox="0 0 34 34" aria-hidden="true">
          <path d="M17 1L22 12L33 17L22 22L17 33L12 22L1 17L12 12Z" fill="var(--cream)" stroke="currentColor" strokeWidth="1.2" />
          <circle cx="17" cy="17" r="3" fill="currentColor" />
        </svg>
        <svg className="mem-lamp" viewBox="0 0 60 140" aria-hidden="true">
          <g className="flame"><ellipse cx="30" cy="66" rx="40" ry="46" fill="url(#warmGlow)" /></g>
          <use href="#fanoos" width="60" height="140" />
        </svg>
        <p className="eyebrow">In loving memory of</p>
        <div className="mem-names">
          {departed.map(({ side, people }) => (
            <div key={side}>
              {people.map((p) => (
                <span key={p.en} className="mem-name">
                  {p.en} {deceasedMark(p)} {has(p.script) && <span className="mem-ur" lang="ur" dir="rtl">{p.script}</span>}
                </span>
              ))}
              <small>Grandparents of the {side}</small>
            </div>
          ))}
        </div>
        <Rule className="rule" />
        <p className="body">Their love is woven into these days. May Allah grant them the highest place in Jannat-ul-Firdaus. Ameen.</p>
      </div>
    </Sec>
  )
}

/* ---------- Regards, with a hand-drawn signature line ---------- */
export function RegardsSection() {
  const ref = useRef(null)
  useLayoutEffect(() => {
    if (prefersReducedMotion()) return
    const ctx = gsap.context(() => {
      gsap.set('.sig', { strokeDasharray: 1, strokeDashoffset: 1 })
      gsap.to('.sig', { strokeDashoffset: 0, duration: 2, ease: 'power2.inOut', scrollTrigger: { trigger: '.sig-line', start: 'top 85%', once: true } })
    }, ref)
    return () => ctx.revert()
  }, [])
  const gf = parent('groom', 'Father')
  return (
    <div ref={ref}>
      <Sec id="regards" label="With love and duas">
        <p className="eyebrow rv">With love and duas</p>
        <p className="regards-fam gold-text rv">The Siddiqui  Family</p>
        <svg className="sig-line" viewBox="0 0 420 40" aria-hidden="true"><path className="sig" pathLength="1" d="M6 26C60 8 110 34 168 20S262 6 300 22S380 30 414 12" /></svg>
        <p className="body rv">{gf.en.replace(' Siddiqui ', '')} &amp; {parent('groom', 'Mother').en}</p>
        <p className="body rv soft">together with all our relatives and well-wishers</p>
      </Sec>
    </div>
  )
}

/* ---------- See you there: the words rise letter by letter, petals fall ---------- */
export function SeeYouSection() {
  const ref = useRef(null)
  useLayoutEffect(() => {
    if (prefersReducedMotion()) return
    const ctx = gsap.context(() => {
      gsap.from('.see-big .ch', {
        yPercent: 110, rotateX: -80, opacity: 0, duration: 1.1, ease: 'power4.out', stagger: 0.045,
        scrollTrigger: { trigger: '.see-big', start: 'top 85%', once: true, onEnter: () => petalShower(2200) },
      })
    }, ref)
    return () => ctx.revert()
  }, [])
  // Letters animate individually, but each word stays unbreakable.
  const split = (t) => t.split(' ').filter(Boolean).map((w, wi, arr) => (
    <span key={wi} className="word">{[...w].map((c, i) => <span key={i} className="ch" aria-hidden="true">{c}</span>)}{wi < arr.length - 1 ? ' ' : ''}</span>
  ))
  const short = (d) => new Intl.DateTimeFormat('en-GB', { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'UTC' }).format(new Date(`${d}T12:00:00Z`))
  return (
    <div ref={ref}>
      <Sec id="soon" label="See you there">
        <p className="eyebrow rv">Insha’Allah</p>
        <h2 className="see-big" aria-label="See you there">{split('See you')} <em>{split('there')}</em></h2>
        <div className="chips rv">
          {wedding.events.map((e) => (
            <a key={e.id} className="chip" href={`#${e.id}`}>
              <b>{e.name.en}</b>
              <span>{short(e.date)} · {e.timeLabel || formatTime12(e.start)}</span>
            </a>
          ))}
        </div>
      </Sec>
    </div>
  )
}

/* ---------- Farewell: back out through the courtyard; the doors close; Khuda Hafiz ---------- */
function backToEnvelope() {
  const lenis = getLenis()
  const ease = (t) => 0.5 - Math.cos(Math.PI * t) / 2
  if (!lenis) return scrollToY(0)
  lenis.scrollTo(homeY(), { duration: 2.4, easing: ease, force: true, onComplete: () => lenis.scrollTo(0, { duration: 9, easing: ease, force: true }) })
}
async function shareInvite() {
  const url = location.origin + location.pathname
  const text = `You are invited to the Nikah of ${couple}, ${formatGregorian(nikah.date)}.`
  try {
    if (navigator.share) return await navigator.share({ title: `Nikah of ${couple}`, text, url })
  } catch {
    return
  }
  window.open(`https://wa.me/?text=${encodeURIComponent(`${text}\n${url}`)}`, '_blank', 'noopener')
}
export function Farewell() {
  const ref = useRef(null)
  useLayoutEffect(() => {
    const sec = ref.current
    if (prefersReducedMotion()) {
      sec.classList.add('is-static')
      return
    }
    const ctx = gsap.context(() => {
      gsap.timeline({ defaults: { ease: 'none' }, scrollTrigger: { trigger: sec, start: 'top top', end: '+=300%', pin: true, scrub: 0.8 } })
        .fromTo('.fw-stage', { scale: isMobile() ? 2.2 : 1.9 }, { scale: 1, ease: 'power2.out', duration: 4 }, 0)
        .fromTo('.fw-closed', { opacity: 0 }, { opacity: 1, duration: 2.2 }, 2)
        .fromTo('.fw-dim', { opacity: 0 }, { opacity: 1, duration: 1.4 }, 3.6)
        .fromTo('.fw-text > *', { opacity: 0, y: 18 }, { opacity: 1, y: 0, stagger: 0.25, duration: 1 }, 4)
        .to({}, { duration: 1 })
    }, sec)
    return () => ctx.revert()
  }, [])
  const IMG = '/images/invite/'
  const pic = (name, cls) => (
    <picture className={cls}>
      <source media="(orientation: portrait)" srcSet={`${IMG}palace-courtyard-${name}-portrait.webp`} />
      <img src={`${IMG}palace-courtyard-${name}-1920.webp`} alt="" loading="lazy" decoding="async" />
    </picture>
  )
  return (
    <section ref={ref} id="bye" className="farewell" aria-label="Khuda Hafiz">
      <div className="fw-stage" aria-hidden="true">
        {pic('open', 'fw-open')}
        {pic('poster', 'fw-closed')}
      </div>
      <div className="fw-dim" aria-hidden="true" />
      <div className="fw-text">
        <Rule className="rule light" />
        <p className="fw-ur gold-text" lang="ur" dir="rtl">خدا حافظ</p>
        <p className="fw-en">Khuda Hafiz</p>
        <p className="fw-body">May Allah keep you in His care until we meet. Fi Amanillah.</p>
        <div className="fw-actions">
          <button type="button" className="btn light" onClick={shareInvite}>Share the invitation</button>
          <button type="button" className="btn light" onClick={backToEnvelope}>Back to the envelope</button>
        </div>
      </div>
      <p className="fw-foot">{groom.en} &amp; {bride.en} · January 2027</p>
    </section>
  )
}
