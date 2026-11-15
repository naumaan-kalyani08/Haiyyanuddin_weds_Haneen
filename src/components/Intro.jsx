import { lazy, Suspense, useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { ScrollTrigger, getLenis, homeY, intro, isMobile, playEntranceOnce, scrollToY, seg } from '../lib/motion'
import { wedding } from '../content/wedding'
import { CardFace } from './CardFace'
import { Octagram, Rule } from './Illustrations'

const Scene = lazy(() => import('../three/Scene.jsx'))
const IMG = '/images/invite/'

// Welcome greeting shown in the light as the guest passes through the doors (from wedding_simple).
const AHLAN = 'أهلاً وسهلاً'
const SALAM = 'اَلسَّلَامُ عَلَيْكُمْ وَرَحْمَةُ اللهِ وَبَرَكَاتُهُ'
// Revealed word by word: splitting Arabic into letters would break the cursive joining.
const words = (s) => s.split(' ')

function Poster({ open = false, className = '' }) {
  const name = open ? 'open' : 'poster'
  return (
    <picture className={className}>
      {!open && <source media="(orientation: portrait)" type="image/avif" srcSet={`${IMG}palace-courtyard-poster-portrait.avif`} />}
      <source media="(orientation: portrait)" type="image/webp" srcSet={`${IMG}palace-courtyard-${name}-portrait.webp`} />
      {!open && <source type="image/avif" srcSet={`${IMG}palace-courtyard-poster-1920.avif`} />}
      <img
        src={`${IMG}palace-courtyard-${name}-1920.webp`}
        srcSet={open ? undefined : `${IMG}palace-courtyard-poster-1280.webp 1280w, ${IMG}palace-courtyard-poster-1920.webp 1920w`}
        sizes="100vw"
        alt={open
          ? 'A marble palace courtyard with gold jaali walls and brass lanterns; the central arch doors stand open to warm light.'
          : 'A marble palace courtyard with gold jaali walls and brass lanterns; light glows through the closed lattice doors of the central arch.'}
        fetchPriority="high"
        decoding="async"
        width="1920"
        height="1081"
      />
    </picture>
  )
}

function Welcome({ refEl, staticMode = false }) {
  const parts = words(SALAM)
  return (
    <section ref={refEl} className={`welcome ${staticMode ? 'is-static' : ''}`} aria-label="Welcome">
      <p className="w-ar rest" lang="ar" dir="rtl">{AHLAN}</p>
      <h2 className="w-en" lang="ar" dir="rtl" aria-label={SALAM}>
        {parts.map((w, i) => (
          <span key={i} aria-hidden="true">
            <span className="ch">{w}</span>{i < parts.length - 1 ? ' ' : ''}
          </span>
        ))}
      </h2>
      <Rule className="w-div rest" />
      <p className="w-sub rest">The doors are open. Please, come in.</p>
    </section>
  )
}

/** Loader: nothing else is interactive until the scene is ready; "Open Invitation" unlocks the page. */
export function Loader({ ready, progress, onEnter, hidden }) {
  const btn = useRef(null)
  useEffect(() => {
    if (ready) btn.current?.focus()
  }, [ready])
  return (
    <div className={`loader ${hidden ? 'done' : ''}`} role="status" aria-live="polite" inert={hidden ? true : undefined}>
      <Octagram className="orn" />
      <p className="loader-initials">{wedding.couple.groom.en} &amp; {wedding.couple.bride.en}</p>
      <p className="loadmsg">{ready ? 'Bismillah' : `Preparing your invitation · ${Math.round(progress * 100)}%`}</p>
      <button ref={btn} type="button" className={`enter ${ready ? 'show' : ''}`} onClick={onEnter} disabled={!ready}>
        Open Invitation
      </button>
    </div>
  )
}

/** "Please scroll slowly" with a mouse cue. Hidden once the journey is under way. */
function Hint({ refEl, onOpen }) {
  return (
    <div ref={refEl} className="hint">
      <span className="hint-label">Please scroll slowly</span>
      <span className="mouse" aria-hidden="true" />
      {onOpen && <button type="button" className="hint-open" onClick={onOpen}>or open it for me</button>}
    </div>
  )
}

/** Static intro for prefers-reduced-motion and WebGL failure: courtyard (doors open), welcome, then the card. */
export function StaticIntro({ onReady }) {
  useEffect(() => {
    intro.p = 1
    playEntranceOnce()
    onReady?.()
  }, [onReady])
  return (
    <>
      <section className="intro-static" aria-label="Welcome">
        <Poster open className="poster" />
        <div className="veil is-on" />
        <Welcome staticMode />
      </section>
      <section id="home" className="card-section static-card">
        <CardFace />
      </section>
    </>
  )
}

/**
 * The 3D opening: one pinned, scrubbed timeline. The scene reads intro.p every frame.
 * The card face is mapped onto the 3D card and becomes the first section at the end of the pin.
 */
export function Intro({ onFail, onProgress, onReady, ready, progress }) {
  const sectionRef = useRef(null)
  const cardRef = useRef(null)
  const flashRef = useRef(null)
  const hintRef = useRef(null)
  const welcomeRef = useRef(null)
  const [loadScene, setLoadScene] = useState(false)
  const [active, setActive] = useState(true)
  const [handedOff, setHandedOff] = useState(false)

  // Lazy-load three.js after the poster has painted.
  useEffect(() => {
    const go = () => setLoadScene(true)
    const idle = window.requestIdleCallback ?? ((f) => setTimeout(f, 200))
    if (document.readyState === 'complete') idle(go)
    else addEventListener('load', () => idle(go), { once: true })
  }, [])

  // Fall back to the static opening only if loading stalls (no progress for 12 s).
  useEffect(() => {
    if (ready) return
    // Generous: a slow phone may take a while to fetch and compile the scene; the poster is on screen meanwhile.
    const t = setTimeout(() => onFail('stalled'), 25000)
    return () => clearTimeout(t)
  }, [ready, progress, onFail])

  // The pin.
  useLayoutEffect(() => {
    const section = sectionRef.current
    const chars = () => welcomeRef.current?.querySelectorAll('.ch') ?? []
    const rest = () => welcomeRef.current?.querySelectorAll('.rest') ?? []
    const st = ScrollTrigger.create({
      trigger: section,
      start: 'top top',
      end: () => `+=${innerHeight * (isMobile() ? 6.0 : 9.0)}`,
      pin: true,
      scrub: true,
      invalidateOnRefresh: true,
      onUpdate(self) {
        const p = self.progress
        intro.p = p
        if (hintRef.current) hintRef.current.classList.toggle('dismissed', p > 0.03)
        // Salam, letter by letter, inside the light bloom; it fades as the envelope appears.
        const out = 1 - seg(p, 0.3, 0.335)
        const cs = chars()
        cs.forEach((c, i) => {
          const a = seg(p, 0.205 + (i / cs.length) * 0.06, 0.23 + (i / cs.length) * 0.06) * out
          c.style.opacity = a
          c.style.filter = a > 0.99 || a === 0 ? '' : `blur(${(1 - a) * 8}px)`
        })
        const r = seg(p, 0.255, 0.285) * out
        rest().forEach((el) => {
          el.style.opacity = r
          el.style.transform = `translateY(${(1 - r) * 14}px)`
        })
        if (welcomeRef.current) welcomeRef.current.style.visibility = p > 0.2 && p < 0.34 ? 'visible' : 'hidden'

        const done = p >= 0.999
        if (done && cardRef.current) {
          // The hand-off: at the end of the pin the card is the page. Snap here (DOM side), because
          // the render loop pauses from this point on.
          cardRef.current.style.transform = 'none'
          cardRef.current.style.opacity = '1'
        }
        setHandedOff((h) => (h === done ? h : done))
        if (p > 0.97) playEntranceOnce()
      },
      onLeave: () => playEntranceOnce(),
      onToggle: (self) => setActive(self.isActive || self.progress < 1),
    })
    intro.trigger = st

    // Measure the card untransformed on refresh; restore the matrix afterwards.
    const strip = () => {
      const el = cardRef.current
      if (!el) return
      el.dataset.saved = el.style.transform
      el.style.transform = 'none'
    }
    const restore = () => {
      const el = cardRef.current
      if (el && el.dataset.saved !== undefined && intro.p < 0.999) el.style.transform = el.dataset.saved
    }
    ScrollTrigger.addEventListener('refreshInit', strip)
    ScrollTrigger.addEventListener('refresh', restore)

    // Arriving with #home: land at the end of the pin.
    if (location.hash === '#home') requestAnimationFrame(() => scrollToY(homeY(), { immediate: true }))

    return () => {
      ScrollTrigger.removeEventListener('refreshInit', strip)
      ScrollTrigger.removeEventListener('refresh', restore)
      st.kill()
      intro.trigger = null
    }
  }, [])

  // Pause rendering when the tab is hidden.
  useEffect(() => {
    const on = () => setActive(document.visibilityState === 'visible' && (intro.trigger?.isActive || intro.p < 1))
    document.addEventListener('visibilitychange', on)
    return () => document.removeEventListener('visibilitychange', on)
  }, [])

  const onSceneReady = useCallback((ok) => (ok ? onReady() : onFail('webgl')), [onReady, onFail])

  const skip = (e) => {
    e.preventDefault()
    scrollToY(homeY(), { immediate: true })
    playEntranceOnce()
    requestAnimationFrame(() => cardRef.current?.focus())
  }
  const autoplay = () => {
    if (!ready || intro.p > 0.6) return
    const lenis = getLenis()
    const end = homeY()
    if (lenis) lenis.scrollTo(end, { duration: 12 * (1 - intro.p), easing: (t) => 0.5 - Math.cos(Math.PI * t) / 2 })
    else scrollToY(end)
  }

  return (
    // The wrapper is what React owns; GSAP wraps the pinned <section> in a pin-spacer inside it.
    <div className="intro-wrap">
    <section ref={sectionRef} className="intro" aria-label="The invitation opening">
      <a className="skip-link" href="#home" onClick={skip}>Skip the opening</a>
      <div className="intro-stage" inert={handedOff ? undefined : true}>
        <Poster className={`poster ${ready ? 'is-hidden' : ''}`} />
        {loadScene && (
          <Suspense fallback={null}>
            <div className="scene-wrap" onClick={autoplay}>
              <Scene onProgress={onProgress} onReady={onSceneReady} cardEl={cardRef} flashEl={flashRef} active={active && !handedOff} />
            </div>
          </Suspense>
        )}
        <div ref={flashRef} className="flash" aria-hidden="true" />
        <Welcome refEl={welcomeRef} />
      </div>
      <CardFace ref={cardRef} className={`card-mapped ${handedOff ? 'is-live' : ''}`} inert={!handedOff} />
      <Hint refEl={hintRef} onOpen={ready ? autoplay : null} />
    </section>
    </div>
  )
}
