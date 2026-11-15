import confetti from 'canvas-confetti'
import { prefersReducedMotion } from './motion'

// White-rose and blush petals with a little gold, as in wedding_simple.
const COLORS = ['#ffffff', '#fdfcee', '#f6d7dc', '#f2b8c6', '#d6a64a', '#e9c68a']
let petal = null
const shape = () => (petal ??= confetti.shapeFromPath ? confetti.shapeFromPath({ path: 'M0 0C8-12 24-12 32 0C24 12 8 12 0 0Z' }) : 'circle')

/** A gentle petal shower from both sides (about 3 s). */
export function petalShower(duration = 2400) {
  if (prefersReducedMotion()) return
  const end = Date.now() + duration
  const shapes = [shape(), 'circle']
  ;(function frame() {
    confetti({ particleCount: 2, angle: 60, spread: 70, origin: { x: 0, y: 0.7 }, shapes, colors: COLORS, scalar: 1.5, ticks: 260, gravity: 0.7, drift: 0.5, disableForReducedMotion: true })
    confetti({ particleCount: 2, angle: 120, spread: 70, origin: { x: 1, y: 0.7 }, shapes, colors: COLORS, scalar: 1.5, ticks: 260, gravity: 0.7, drift: -0.5, disableForReducedMotion: true })
    confetti({ particleCount: 1, spread: 160, startVelocity: 8, origin: { x: Math.random(), y: -0.05 }, shapes: [shape()], colors: COLORS, scalar: 1.6, ticks: 360, gravity: 0.5, disableForReducedMotion: true })
    if (Date.now() < end) requestAnimationFrame(frame)
  })()
}

/** A small gold burst from the middle of the screen. */
export function goldBurst() {
  if (prefersReducedMotion()) return
  confetti({ particleCount: 60, spread: 80, origin: { y: 0.6 }, colors: ['#d6a64a', '#fdfcee', '#e9c68a'], scalar: 0.9, disableForReducedMotion: true })
}
