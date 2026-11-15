import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import Lenis from 'lenis'

gsap.registerPlugin(ScrollTrigger)

export { gsap, ScrollTrigger }

/** Ceremonial easing: slow in, slow out, never bouncy. */
export const ease = 'sine.inOut'
export const smooth = (t) => t * t * (3 - 2 * t)
export const clamp01 = (t) => Math.min(1, Math.max(0, t))
/** 0→1 as p goes a→b, eased. */
export const seg = (p, a, b) => smooth(clamp01((p - a) / (b - a)))
/** 0 → 1 → 0 bump peaking at m. */
export const bump = (p, a, m, b) => (p < m ? seg(p, a, m) : 1 - seg(p, m, b))

export const prefersReducedMotion = () =>
  typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
export const isMobile = () =>
  typeof window !== 'undefined' && window.matchMedia('(max-width: 768px), (pointer: coarse)').matches

export function hasWebGL() {
  try {
    const c = document.createElement('canvas')
    return Boolean(c.getContext('webgl2') || c.getContext('webgl'))
  } catch {
    return false
  }
}

/** Shared state for the intro, read every frame by the 3D scene and the DOM overlays. */
export const intro = {
  p: 0,
  active: true,
  trigger: null,
  ready: false,
  entrancePlayed: false,
  onEntrance: new Set(),
}

let lenis = null
export function initSmoothScroll() {
  if (lenis || prefersReducedMotion()) return lenis
  // A little weight: slower glide and shorter wheel steps, so the ceremony never rushes.
  lenis = new Lenis({ lerp: 0.06, wheelMultiplier: 0.7, touchMultiplier: 0.85, smoothWheel: true })
  lenis.on('scroll', ScrollTrigger.update)
  gsap.ticker.add((t) => lenis.raf(t * 1000))
  gsap.ticker.lagSmoothing(0)
  return lenis
}
export const getLenis = () => lenis

export function scrollToY(y, { duration = 1.6, immediate = false } = {}) {
  if (lenis) lenis.scrollTo(y, { duration, immediate, easing: (t) => 0.5 - Math.cos(Math.PI * t) / 2, force: true })
  else window.scrollTo({ top: y, behavior: immediate || prefersReducedMotion() ? 'auto' : 'smooth' })
}

/** Where "#home", the logo and back-to-top land: the end of the intro pin (the card at rest). */
export function homeY() {
  return intro.trigger ? intro.trigger.end : 0
}

export function playEntranceOnce() {
  if (intro.entrancePlayed) return
  intro.entrancePlayed = true
  intro.onEntrance.forEach((fn) => fn())
}

// Dev-only handles for the headless screenshot script (scripts/shots.mjs).
if (import.meta.env.DEV && typeof window !== 'undefined') {
  window.__intro = intro
  window.__getLenis = getLenis
}
