import { useEffect, useRef } from 'react'
import { homeY, isMobile, prefersReducedMotion } from '../lib/motion'

/**
 * Rose petals, green leaves and gold dust drifting down the page, as in the reference artifact.
 * A single 2D canvas (no second WebGL context), only after the opening, paused when the tab is hidden.
 */
export function AmbientPetals() {
  const ref = useRef(null)
  useEffect(() => {
    if (prefersReducedMotion()) return
    const cv = ref.current
    const g = cv.getContext('2d')
    const mobile = isMobile()
    const dpr = Math.min(devicePixelRatio || 1, mobile ? 1.5 : 1.75)
    let W = 0, H = 0
    const size = () => {
      W = innerWidth
      H = innerHeight
      cv.width = W * dpr
      cv.height = H * dpr
    }
    size()
    addEventListener('resize', size)

    const N = mobile ? 22 : 42
    const parts = Array.from({ length: N }, (_, i) => spawn(i, true))
    function spawn(i, anywhere) {
      const kind = i % 7 === 0 ? 'leaf' : i % 3 === 0 ? 'dust' : 'petal'
      return {
        kind,
        x: Math.random() * W,
        y: anywhere ? Math.random() * H : -30,
        s: kind === 'dust' ? 1 + Math.random() * 1.8 : (mobile ? 7 : 9) + Math.random() * 7,
        vy: kind === 'dust' ? 8 + Math.random() * 10 : 18 + Math.random() * 26,
        sway: 0.4 + Math.random() * 0.8,
        ph: Math.random() * 6.28,
        rot: Math.random() * 6.28,
        vr: (Math.random() - 0.5) * 1.6,
        tone: Math.random(),
      }
    }

    const petal = (p) => {
      const grad = g.createLinearGradient(0, -p.s, 0, p.s)
      grad.addColorStop(0, '#f7dcd6')
      grad.addColorStop(0.55, p.tone > 0.5 ? '#e2a19c' : '#ecb8b1')
      grad.addColorStop(1, '#a65f5f')
      g.fillStyle = grad
      g.beginPath()
      g.moveTo(0, -p.s)
      g.bezierCurveTo(p.s * 0.85, -p.s * 0.8, p.s * 0.85, p.s * 0.5, 0, p.s)
      g.bezierCurveTo(-p.s * 0.85, p.s * 0.5, -p.s * 0.85, -p.s * 0.8, 0, -p.s)
      g.fill()
    }
    const leaf = (p) => {
      g.fillStyle = p.tone > 0.5 ? '#3d6b52' : '#5f8a66'
      g.beginPath()
      g.moveTo(0, -p.s)
      g.quadraticCurveTo(p.s * 0.7, 0, 0, p.s)
      g.quadraticCurveTo(-p.s * 0.7, 0, 0, -p.s)
      g.fill()
      g.strokeStyle = 'rgba(236,217,162,.7)'
      g.lineWidth = 0.8
      g.beginPath()
      g.moveTo(0, -p.s * 0.85)
      g.lineTo(0, p.s * 0.85)
      g.stroke()
    }

    let raf = 0, last = performance.now(), t = 0, visible = 0
    const frame = (now) => {
      raf = requestAnimationFrame(frame)
      if (document.hidden) return
      const dt = Math.min(0.05, (now - last) / 1000)
      last = now
      t += dt
      // Fade in only once the guest is past the opening.
      const target = scrollY > homeY() - innerHeight * 0.3 ? 1 : 0
      visible += (target - visible) * Math.min(1, dt * 2)
      g.setTransform(dpr, 0, 0, dpr, 0, 0)
      g.clearRect(0, 0, W, H)
      if (visible < 0.01) return
      g.globalAlpha = visible
      for (let i = 0; i < parts.length; i++) {
        const p = parts[i]
        p.y += p.vy * dt
        p.rot += p.vr * dt
        const x = p.x + Math.sin(t * p.sway + p.ph) * 26
        if (p.y > H + 30) parts[i] = spawn(i, false)
        g.save()
        g.translate(x, p.y)
        if (p.kind === 'dust') {
          g.fillStyle = `rgba(201,162,79,${0.45 + Math.sin(t * 1.3 + p.ph) * 0.25})`
          g.beginPath()
          g.arc(0, 0, p.s, 0, Math.PI * 2)
          g.fill()
        } else {
          g.rotate(p.rot)
          g.scale(1, 0.55 + 0.45 * Math.abs(Math.sin(t * p.sway * 1.6 + p.ph)))
          if (p.kind === 'petal') petal(p)
          else leaf(p)
        }
        g.restore()
      }
      g.globalAlpha = 1
    }
    raf = requestAnimationFrame(frame)
    return () => {
      cancelAnimationFrame(raf)
      removeEventListener('resize', size)
    }
  }, [])
  return <canvas ref={ref} className="ambient" aria-hidden="true" />
}
