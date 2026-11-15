import { useCallback, useEffect, useRef, useState } from 'react'
import { AmbientPetals } from './components/Ambient'
import { CursorTrail, Header } from './components/Chrome'
import { SvgDefs } from './components/Illustrations'
import { Intro, Loader, StaticIntro } from './components/Intro'
import {
  AnnouncementSection, BismillahBand, CoupleSection, DuasBand, FamiliesSection, FamilyReveal, Farewell,
  GratitudeSection, MemorySection, NikahSection, RegardsSection, SeeYouSection, StoryDefs, VerseSection, WalimaSection,
} from './components/Sections'
import { pendingFills, wedding } from './content/wedding'
import { ScrollTrigger, hasWebGL, homeY, initSmoothScroll, prefersReducedMotion, scrollToY } from './lib/motion'
import { useCardEntrance } from './lib/useCardEntrance'

const startMode = () => (prefersReducedMotion() || !hasWebGL() ? 'static' : '3d')
const NASHEED_VOLUME = 0.45

export default function App() {
  const [mode, setMode] = useState(startMode)
  const [ready, setReady] = useState(false)
  const [progress, setProgress] = useState(0)
  const [entered, setEntered] = useState(false)
  const [soundOn, setSoundOn] = useState(false)
  const [audioOk, setAudioOk] = useState(false)
  const audio = useRef(null)
  const bar = useRef(null)

  // Thin gold reading-progress bar across the whole page.
  useEffect(() => {
    const st = ScrollTrigger.create({ start: 0, end: 'max', onUpdate: (self) => { if (bar.current) bar.current.style.transform = `scaleX(${self.progress})` } })
    return () => st.kill()
  }, [])

  const fail = useCallback((why) => {
    console.warn('[intro] falling back to the static opening:', why)
    setMode('static')
  }, [])
  const onProgress = useCallback((v) => setProgress((p) => Math.max(p, v)), [])
  const onReady = useCallback(() => setReady(true), [])
  useCardEntrance()

  // Scroll stays locked behind the loader until the guest taps "Open Invitation".
  useEffect(() => {
    const lenis = initSmoothScroll()
    const html = document.documentElement
    if (entered) {
      lenis?.start()
      html.classList.remove('is-loading')
      ScrollTrigger.refresh()
    } else {
      lenis?.stop()
      html.classList.add('is-loading')
    }
  }, [entered])

  /* ---------- nasheed: never autoplays; starts softly on the "Open Invitation" tap ---------- */
  const fadeTo = (a, to, ms = 2200) => {
    const from = a.volume, t0 = performance.now()
    const step = (now) => {
      const k = Math.min(1, (now - t0) / ms)
      a.volume = from + (to - from) * k
      if (k < 1) requestAnimationFrame(step)
      else if (to === 0) a.pause()
    }
    requestAnimationFrame(step)
  }
  const play = () => {
    const a = audio.current
    if (!a || !audioOk) return
    a.volume = 0
    a.play().then(() => { setSoundOn(true); fadeTo(a, NASHEED_VOLUME) }, () => {})
  }
  const enter = () => {
    play()
    setEntered(true)
  }
  const toggleSound = () => {
    const a = audio.current
    if (!a) return
    if (a.paused) play()
    else {
      setSoundOn(false)
      fadeTo(a, 0, 700)
    }
  }
  // Pause with the tab; resume when the guest returns (only if it was playing).
  useEffect(() => {
    const on = () => {
      const a = audio.current
      if (!a || !soundOn) return
      if (document.hidden) a.pause()
      else a.play().catch(() => {})
    }
    document.addEventListener('visibilitychange', on)
    return () => document.removeEventListener('visibilitychange', on)
  }, [soundOn])

  useEffect(() => {
    if (import.meta.env.DEV) console.info('[content] still [fill]:\n' + pendingFills().join('\n'))
    // Every "#home" link (logo, back-to-top, anchors) lands at the end of the pin.
    const onClick = (e) => {
      const a = e.target.closest?.('a[href="#home"]')
      if (!a || e.defaultPrevented) return
      e.preventDefault()
      scrollToY(homeY())
    }
    document.addEventListener('click', onClick)
    return () => document.removeEventListener('click', onClick)
  }, [])

  useEffect(() => {
    // Sections below the intro change height as fonts load; re-measure the pins once they have.
    document.fonts?.ready.then(() => ScrollTrigger.refresh())
  }, [mode])

  return (
    <>
      <SvgDefs />
      <StoryDefs />
      <Loader ready={ready} progress={progress} onEnter={enter} hidden={entered} />
      <AmbientPetals />
      <CursorTrail />
      <div className="progress" aria-hidden="true"><i ref={bar} /></div>
      <Header />
      {wedding.audio && (
        <audio
          ref={audio}
          src={wedding.audio}
          loop
          preload="auto"
          onCanPlay={() => setAudioOk(true)}
          onError={() => setAudioOk(false)}
        />
      )}
      {audioOk && entered && (
        <button type="button" className={`snd ${soundOn ? '' : 'off'}`} onClick={toggleSound} aria-label={soundOn ? 'Pause the nasheed' : 'Play the nasheed'} aria-pressed={soundOn}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M4 9v6h4l5 4V5L8 9z" />
            <g className="wave"><path d="M16.5 8.5a5 5 0 0 1 0 7" /><path d="M19 6a8.5 8.5 0 0 1 0 12" /></g>
          </svg>
        </button>
      )}
      <main>
        {/* A stable host: pinned siblings get wrapped by GSAP, so the intro swap must happen inside its own node. */}
        <div className="intro-host">
          {mode === '3d'
            ? <Intro onFail={fail} onProgress={onProgress} onReady={onReady} ready={ready} progress={progress} />
            : <StaticIntro onReady={onReady} />}
        </div>
        <BismillahBand />
        <AnnouncementSection />
        <FamilyReveal />
        <CoupleSection />
        <FamiliesSection />
        <VerseSection />
        <NikahSection />
        <DuasBand />
        <WalimaSection />
        <GratitudeSection />
        <MemorySection />
        <RegardsSection />
        <SeeYouSection />
        <Farewell />
      </main>
    </>
  )
}
