import { useEffect, useRef, useState } from 'react'
import { homeY, isMobile, prefersReducedMotion, scrollToY } from '../lib/motion'
import { wedding } from '../content/wedding'

/** Logo + back-to-top. Both land at the END of the intro pin (the card at rest), never at frame 0. */
export function Header() {
  const [show, setShow] = useState(false)
  useEffect(() => {
    const on = () => setShow(scrollY > homeY() + innerHeight * 0.5)
    addEventListener('scroll', on, { passive: true })
    return () => removeEventListener('scroll', on)
  }, [])
  const home = (e) => {
    e.preventDefault()
    scrollToY(homeY(), { duration: 1.8 })
  }
  return (
    <>
      <header className={`site-header ${show ? 'is-shown' : ''}`} inert={show ? undefined : true}>
        <a href="#home" className="logo" onClick={home} aria-label="Back to the invitation card">{wedding.couple.monogram.latin}</a>
        <nav aria-label="Sections">
          <a href="#nikah">Nikah</a>
          <a href="#walima">Walima</a>
        </nav>
      </header>
      <a href="#home" className={`to-top ${show ? 'is-shown' : ''}`} onClick={home} aria-label="Back to top" tabIndex={show ? 0 : -1}>↑</a>
    </>
  )
}

/** A faint gold particle trail following the cursor (desktop with a fine pointer only). */
export function CursorTrail() {
  const ref = useRef(null)
  useEffect(() => {
    if (isMobile() || prefersReducedMotion() || !matchMedia('(pointer: fine)').matches) return
    const cv = ref.current
    const g = cv.getContext('2d')
    const dpr = Math.min(devicePixelRatio, 1.5)
    const size = () => { cv.width = innerWidth * dpr; cv.height = innerHeight * dpr }
    size()
    addEventListener('resize', size)
    const parts = []
    let raf = 0, last = 0
    const move = (e) => {
      for (let i = 0; i < 2; i++)
        parts.push({ x: e.clientX, y: e.clientY, vx: (Math.random() - 0.5) * 0.4, vy: Math.random() * 0.5 + 0.1, life: 1, r: Math.random() * 1.6 + 0.6 })
      if (parts.length > 80) parts.splice(0, parts.length - 80)
      if (!raf) raf = requestAnimationFrame(tick)
    }
    const tick = (t) => {
      const dt = Math.min(48, t - (last || t)) / 16.7
      last = t
      g.setTransform(dpr, 0, 0, dpr, 0, 0)
      g.clearRect(0, 0, innerWidth, innerHeight)
      for (const p of parts) {
        p.x += p.vx * dt; p.y += p.vy * dt; p.life -= 0.025 * dt
        if (p.life <= 0) continue
        g.fillStyle = `rgba(232, 196, 120, ${p.life * 0.55})`
        g.beginPath()
        g.arc(p.x, p.y, p.r, 0, Math.PI * 2)
        g.fill()
      }
      for (let i = parts.length - 1; i >= 0; i--) if (parts[i].life <= 0) parts.splice(i, 1)
      raf = parts.length ? requestAnimationFrame(tick) : 0
      if (!raf) last = 0
    }
    addEventListener('pointermove', move, { passive: true })
    return () => {
      removeEventListener('pointermove', move)
      removeEventListener('resize', size)
      cancelAnimationFrame(raf)
    }
  }, [])
  return <canvas ref={ref} className="cursor-trail" aria-hidden="true" />
}

