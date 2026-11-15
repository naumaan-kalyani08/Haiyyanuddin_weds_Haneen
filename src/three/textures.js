import * as THREE from 'three'

const canvas = (w, h = w) => {
  const c = document.createElement('canvas')
  c.width = w
  c.height = h
  return c
}

// Deterministic PRNG so the procedural textures look the same on every load.
export function rng(seed = 1) {
  let s = seed >>> 0
  return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296)
}

/** Paper fibre normal map: random short fibres → height field → Sobel normals. */
export function makeFibreNormal(size = 256) {
  const c = canvas(size)
  const g = c.getContext('2d')
  g.fillStyle = '#808080'
  g.fillRect(0, 0, size, size)
  const r = rng(7)
  for (let i = 0; i < 1400; i++) {
    const x = r() * size, y = r() * size, a = r() * Math.PI, l = 3 + r() * 12
    g.strokeStyle = `rgba(${r() > 0.5 ? 255 : 0},${r() > 0.5 ? 255 : 0},${r() > 0.5 ? 255 : 0},0.05)`
    g.strokeStyle = r() > 0.5 ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)'
    g.lineWidth = 0.6 + r()
    g.beginPath()
    g.moveTo(x, y)
    g.lineTo(x + Math.cos(a) * l, y + Math.sin(a) * l)
    g.stroke()
  }
  const src = g.getImageData(0, 0, size, size).data
  const out = g.createImageData(size, size)
  const h = (x, y) => src[(((y + size) % size) * size + ((x + size) % size)) * 4] / 255
  for (let y = 0; y < size; y++)
    for (let x = 0; x < size; x++) {
      const dx = (h(x + 1, y) - h(x - 1, y)) * 2.2
      const dy = (h(x, y + 1) - h(x, y - 1)) * 2.2
      const n = new THREE.Vector3(-dx, -dy, 1).normalize()
      const i = (y * size + x) * 4
      out.data[i] = (n.x * 0.5 + 0.5) * 255
      out.data[i + 1] = (n.y * 0.5 + 0.5) * 255
      out.data[i + 2] = (n.z * 0.5 + 0.5) * 255
      out.data[i + 3] = 255
    }
  g.putImageData(out, 0, 0)
  const t = new THREE.CanvasTexture(c)
  t.wrapS = t.wrapT = THREE.RepeatWrapping
  t.colorSpace = THREE.NoColorSpace
  return t
}

/** 8-fold Islamic geometric pattern (octagram lattice), drawn as gold lines. */
function drawGeometric(g, w, h, cell, stroke, lineWidth) {
  g.strokeStyle = stroke
  g.lineWidth = lineWidth
  g.lineJoin = 'round'
  for (let cy = -cell; cy < h + cell; cy += cell)
    for (let cx = -cell; cx < w + cell; cx += cell) {
      const x = cx + cell / 2, y = cy + cell / 2, R = cell * 0.36
      // Two overlapping squares form the octagram.
      for (const rot of [0, Math.PI / 4]) {
        g.beginPath()
        for (let k = 0; k < 4; k++) {
          const a = rot + (k * Math.PI) / 2 + Math.PI / 4
          const px = x + Math.cos(a) * R * Math.SQRT2 * 0.72, py = y + Math.sin(a) * R * Math.SQRT2 * 0.72
          k ? g.lineTo(px, py) : g.moveTo(px, py)
        }
        g.closePath()
        g.stroke()
      }
      // Bridges to neighbours make the continuous lattice.
      g.beginPath()
      g.moveTo(x + R * 0.72, y); g.lineTo(cx + cell, y)
      g.moveTo(x, y + R * 0.72); g.lineTo(x, cy + cell)
      g.stroke()
      g.beginPath()
      g.arc(x, y, R * 0.22, 0, Math.PI * 2)
      g.stroke()
    }
}

/** Crushed velvet: the base colour with soft lighter and darker drifts where the pile lies differently. */
function paintVelvet(g, size, color, seed = 31) {
  g.fillStyle = color
  g.fillRect(0, 0, size, size)
  const r = rng(seed)
  for (let i = 0; i < 220; i++) {
    const x = r() * size, y = r() * size, rad = size * (0.03 + r() * 0.09)
    const light = r() > 0.5
    const grad = g.createRadialGradient(x, y, 0, x, y, rad)
    grad.addColorStop(0, light ? 'rgba(255,190,205,0.05)' : 'rgba(20,0,6,0.11)')
    grad.addColorStop(1, 'rgba(0,0,0,0)')
    g.fillStyle = grad
    g.fillRect(x - rad, y - rad, rad * 2, rad * 2)
  }
}

/** Velvet colour map for the envelope body. */
export function makeVelvet(color = '#5a1022', size = 512) {
  const c = canvas(size)
  paintVelvet(c.getContext('2d'), size, color)
  const t = new THREE.CanvasTexture(c)
  t.colorSpace = THREE.SRGBColorSpace
  t.wrapS = t.wrapT = THREE.RepeatWrapping
  t.repeat.set(2, 2)
  t.anisotropy = 4
  return t
}

/**
 * Flap face: velvet with a tone-on-tone embossed lattice (darker pile, no colour change)
 * and small gold studs where the lines cross. Returns colour, metalness and bump maps.
 */
export function makeFlapPattern(base = '#5a1022', size = 1024) {
  const map = canvas(size), metal = canvas(size), bump = canvas(size)
  const gm = map.getContext('2d'), gx = metal.getContext('2d'), gb = bump.getContext('2d')
  paintVelvet(gm, size, base, 47)
  gx.fillStyle = '#000'
  gx.fillRect(0, 0, size, size)
  gb.fillStyle = '#000'
  gb.fillRect(0, 0, size, size)
  const cell = size / 11
  drawGeometric(gm, size, size, cell, 'rgba(25,0,8,0.45)', 2.4)
  drawGeometric(gb, size, size, cell, '#fff', 4)
  for (let y = 0; y <= size + cell; y += cell)
    for (let x = 0; x <= size + cell; x += cell) {
      for (const [ctx, ink] of [[gm, '#d8b06a'], [gx, '#fff'], [gb, '#fff']]) {
        ctx.fillStyle = ink
        ctx.beginPath()
        ctx.arc(x, y, cell * 0.04, 0, Math.PI * 2)
        ctx.fill()
      }
    }
  const tex = (c, srgb) => {
    const t = new THREE.CanvasTexture(c)
    t.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace
    t.anisotropy = 4
    return t
  }
  return { map: tex(map, true), metalnessMap: tex(metal), bumpMap: tex(bump) }
}

/** Inner lining: ivory paper with a gold girih lattice and small blush roses (no door art). */
export function makeLining(size = 1024) {
  const c = canvas(size)
  const g = c.getContext('2d')
  const grad = g.createLinearGradient(0, 0, 0, size)
  grad.addColorStop(0, '#f8f0de')
  grad.addColorStop(1, '#efe2c6')
  g.fillStyle = grad
  g.fillRect(0, 0, size, size)
  const cell = size / 6
  drawGeometric(g, size, size, cell, 'rgba(176,138,62,0.75)', 2)
  const r = rng(5)
  for (let y = 0; y < size + cell; y += cell)
    for (let x = 0; x < size + cell; x += cell) {
      // a tiny rose at every lattice crossing
      const cx = x, cy = y
      for (let k = 0; k < 5; k++) {
        g.save()
        g.translate(cx, cy)
        g.rotate((k / 5) * Math.PI * 2 + r() * 0.3)
        g.fillStyle = k % 2 ? '#e2a7a0' : '#d6958e'
        g.beginPath()
        g.ellipse(0, -cell * 0.06, cell * 0.045, cell * 0.075, 0, 0, Math.PI * 2)
        g.fill()
        g.restore()
      }
      g.fillStyle = '#a8625f'
      g.beginPath()
      g.arc(cx, cy, cell * 0.03, 0, Math.PI * 2)
      g.fill()
    }
  const t = new THREE.CanvasTexture(c)
  t.colorSpace = THREE.SRGBColorSpace
  t.anisotropy = 4
  return t
}

/** Wax seal face with the monogram "ح ح". */
export function makeSealFace(monogram, colour = 'gold', size = 512) {
  const palette = colour === 'maroon'
    ? ['#8e2b33', '#5e1820', '#b3474f']
    : ['#d4a24c', '#9a6b23', '#f0cf86']
  const map = canvas(size), bump = canvas(size)
  const g = map.getContext('2d'), b = bump.getContext('2d')
  const c = size / 2
  const rad = g.createRadialGradient(c * 0.8, c * 0.7, 10, c, c, c)
  rad.addColorStop(0, palette[2])
  rad.addColorStop(0.55, palette[0])
  rad.addColorStop(1, palette[1])
  g.fillStyle = rad
  g.fillRect(0, 0, size, size)
  b.fillStyle = '#777'
  b.fillRect(0, 0, size, size)
  for (const [ctx, ink] of [[g, 'rgba(90,55,15,0.55)'], [b, '#fff']]) {
    ctx.strokeStyle = ink
    ctx.lineWidth = size * 0.014
    ctx.beginPath()
    ctx.arc(c, c, size * 0.4, 0, Math.PI * 2)
    ctx.stroke()
    ctx.lineWidth = size * 0.006
    ctx.beginPath()
    ctx.arc(c, c, size * 0.36, 0, Math.PI * 2)
    ctx.stroke()
    for (let k = 0; k < 24; k++) {
      const a = (k / 24) * Math.PI * 2
      ctx.beginPath()
      ctx.arc(c + Math.cos(a) * size * 0.44, c + Math.sin(a) * size * 0.44, size * 0.012, 0, Math.PI * 2)
      ctx.fillStyle = ink
      ctx.fill()
    }
    ctx.fillStyle = ink
    ctx.font = `700 ${size * 0.3}px Amiri, serif`
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.direction = 'rtl'
    ctx.fillText(monogram, c, c * 0.86)
  }
  // Light rim on the raised letters.
  g.globalCompositeOperation = 'lighter'
  g.fillStyle = 'rgba(255,230,170,0.25)'
  g.font = `700 ${size * 0.3}px Amiri, serif`
  g.textAlign = 'center'
  g.textBaseline = 'middle'
  g.direction = 'rtl'
  g.fillText(monogram, c - 2, c * 0.86 - 2)
  const mk = (cv, srgb) => {
    const t = new THREE.CanvasTexture(cv)
    t.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace
    return t
  }
  return { map: mk(map, true), bumpMap: mk(bump) }
}

/** Soft radial sprite (for glows, dust and particles). */
export function makeGlow(size = 128, inner = 'rgba(255,240,210,1)', outer = 'rgba(255,190,110,0)') {
  const c = canvas(size)
  const g = c.getContext('2d')
  const r = g.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2)
  r.addColorStop(0, inner)
  r.addColorStop(1, outer)
  g.fillStyle = r
  g.fillRect(0, 0, size, size)
  const t = new THREE.CanvasTexture(c)
  t.colorSpace = THREE.SRGBColorSpace
  return t
}

/** Table: a deep maroon gradient, lit in the middle, with a faint gold damask lattice and fine grain. */
export function makeTable(size = 1024) {
  const c = canvas(size)
  const g = c.getContext('2d')
  const r = g.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size * 0.72)
  r.addColorStop(0, '#6e1426')
  r.addColorStop(0.35, '#54101f')
  r.addColorStop(0.7, '#360814')
  r.addColorStop(1, '#1c0309')
  g.fillStyle = r
  g.fillRect(0, 0, size, size)
  drawGeometric(g, size, size, size / 9, 'rgba(214,170,96,0.07)', 1.2)
  // fine grain so the surface reads as cloth, not flat colour
  const img = g.getImageData(0, 0, size, size)
  const rv = rng(23)
  for (let i = 0; i < img.data.length; i += 4) {
    const n = (rv() - 0.5) * 10
    img.data[i] += n
    img.data[i + 1] += n * 0.6
    img.data[i + 2] += n * 0.6
  }
  g.putImageData(img, 0, 0)
  const t = new THREE.CanvasTexture(c)
  t.colorSpace = THREE.SRGBColorSpace
  t.anisotropy = 4
  return t
}
