// One layout, two renderers: the DOM card face (CardFace.jsx) and the 3D card's canvas texture.
// Sharing these numbers keeps the two identical at the hand-off crossfade.
import { formatGregorian } from '../lib/dates'
import { isFill, wedding } from '../content/wedding'

export const CARD = {
  paper: '#f4ecdc',
  paperEdge: '#e4d5b8',
  gold: '#b8913f',
  ink: '#2c3a4a',
  inkSoft: '#5a6878',
}

const nikah = wedding.events.find((e) => e.id === 'nikah')
export const cardText = {
  script: wedding.couple.monogram.script,
  latin: wedding.couple.monogram.latin,
  en: wedding.invitationWording.en,
  // The Urdu paragraph is left out until the family supplies it.
  ur: isFill(wedding.invitationWording.ur) ? '' : wedding.invitationWording.ur,
  date: `Insha’Allah · ${formatGregorian(nikah.date)} · ${nikah.city}`,
}

export const FONTS = {
  script: (px) => `700 ${px}px Amiri, serif`,
  latin: (px) => `500 ${px}px "Cormorant Garamond", serif`,
  en: (px) => `italic 400 ${px}px "Cormorant Garamond", serif`,
  ur: (px) => `400 ${px}px "Noto Nastaliq Urdu", serif`,
  date: (px) => `500 ${px}px "Cormorant Garamond", serif`,
}

export function cardLayout(W, H) {
  const u = Math.min(W, H) / 100
  const portrait = H > W
  return {
    u,
    inset: Math.max(3.2 * u, 12),
    inner: Math.max(0.9 * u, 4),
    width: portrait ? W * 0.8 : Math.min(W * 0.72, 112 * u),
    // The Amiri ح has a deep bowl: give the monogram room so it never touches "H & H" beneath it.
    script: { size: Math.max(11 * u, 54), lh: 1.75 },
    latin: { size: Math.max(2.9 * u, 15), lh: 1.5, ls: 0.42 },
    rule: { gap: Math.max(2.4 * u, 14), w: Math.max(14 * u, 70) },
    en: { size: Math.max(2.75 * u, 16), lh: 1.5 },
    ur: { size: Math.max(2.5 * u, 15), lh: 2.3 },
    gap: Math.max(2.2 * u, 12),
    date: { size: Math.max(1.6 * u, 11), lh: 1.4, ls: 0.24 },
  }
}

/** Fonts the card needs before the canvas copy can be drawn. */
export async function loadCardFonts(L) {
  if (!document.fonts) return
  await Promise.all([
    document.fonts.load(FONTS.script(L.script.size), cardText.script),
    document.fonts.load(FONTS.latin(L.latin.size), 'H'),
    document.fonts.load(FONTS.en(L.en.size), 'M'),
    cardText.ur && document.fonts.load(FONTS.ur(L.ur.size), cardText.ur),
  ]).catch(() => {})
}

function wrap(g, text, maxW) {
  const words = text.split(' ')
  const lines = []
  let line = ''
  for (const w of words) {
    const test = line ? `${line} ${w}` : w
    if (g.measureText(test).width > maxW && line) {
      lines.push(line)
      line = w
    } else line = test
  }
  if (line) lines.push(line)
  return lines
}

function spaced(g, text, x, y, ls) {
  // Canvas letterSpacing (Chrome 99+), with a manual fallback.
  if ('letterSpacing' in g) {
    g.letterSpacing = `${ls}px`
    g.fillText(text, x + ls / 2, y)
    g.letterSpacing = '0px'
    return
  }
  const total = [...text].reduce((s, ch) => s + g.measureText(ch).width + ls, -ls)
  let cx = x - total / 2
  g.textAlign = 'left'
  for (const ch of text) {
    g.fillText(ch, cx, y)
    cx += g.measureText(ch).width + ls
  }
  g.textAlign = 'center'
}

/** Paints the card face into a canvas of size (W*s)×(H*s). Mirrors CardFace.jsx. */
export function drawCardFace(cv, W, H, s) {
  const L = cardLayout(W, H)
  const g = cv.getContext('2d')
  cv.width = Math.round(W * s)
  cv.height = Math.round(H * s)
  g.setTransform(s, 0, 0, s, 0, 0)

  // Paper (same gradient as .card-face background).
  const grad = g.createRadialGradient(W / 2, H * 0.45, 0, W / 2, H * 0.45, Math.hypot(W, H) * 0.6)
  grad.addColorStop(0, '#f9f3e7')
  grad.addColorStop(0.7, CARD.paper)
  grad.addColorStop(1, CARD.paperEdge)
  g.fillStyle = grad
  g.fillRect(0, 0, W, H)

  drawBorder(g, W, H, L)

  // Measure the stack to centre it vertically, exactly like the flex column.
  g.textAlign = 'center'
  g.textBaseline = 'middle'
  g.font = FONTS.en(L.en.size)
  const enLines = wrap(g, cardText.en, L.width)
  g.font = FONTS.ur(L.ur.size)
  g.direction = 'rtl'
  const urLines = cardText.ur ? wrap(g, cardText.ur, L.width) : []
  g.direction = 'ltr'
  const blocks = [
    L.script.size * L.script.lh,
    L.latin.size * L.latin.lh,
    L.rule.gap * 2 + 1,
    enLines.length * L.en.size * L.en.lh,
    urLines.length ? L.gap : 0,
    urLines.length * L.ur.size * L.ur.lh,
    L.gap,
    L.date.size * L.date.lh,
  ]
  let y = (H - blocks.reduce((a, b) => a + b, 0)) / 2
  const cx = W / 2

  g.fillStyle = CARD.gold
  g.font = FONTS.script(L.script.size)
  g.direction = 'rtl'
  g.fillText(cardText.script, cx, y + blocks[0] / 2)
  g.direction = 'ltr'
  y += blocks[0]

  g.fillStyle = CARD.ink
  g.font = FONTS.latin(L.latin.size)
  spaced(g, cardText.latin, cx, y + blocks[1] / 2, L.latin.size * L.latin.ls)
  y += blocks[1]

  g.fillStyle = CARD.gold
  g.fillRect(cx - L.rule.w / 2, y + L.rule.gap, L.rule.w, 1)
  g.beginPath()
  g.moveTo(cx, y + L.rule.gap - 4)
  g.lineTo(cx + 4, y + L.rule.gap + 0.5)
  g.lineTo(cx, y + L.rule.gap + 5)
  g.lineTo(cx - 4, y + L.rule.gap + 0.5)
  g.fill()
  y += blocks[2]

  g.fillStyle = CARD.ink
  g.font = FONTS.en(L.en.size)
  for (const line of enLines) {
    g.fillText(line, cx, y + (L.en.size * L.en.lh) / 2)
    y += L.en.size * L.en.lh
  }
  if (urLines.length) y += L.gap

  g.font = FONTS.ur(L.ur.size)
  g.direction = 'rtl'
  for (const line of urLines) {
    g.fillText(line, cx, y + (L.ur.size * L.ur.lh) / 2)
    y += L.ur.size * L.ur.lh
  }
  g.direction = 'ltr'
  y += L.gap

  g.fillStyle = CARD.inkSoft
  g.font = FONTS.date(L.date.size)
  spaced(g, cardText.date.toUpperCase(), cx, y + (L.date.size * L.date.lh) / 2, L.date.size * L.date.ls)
}

/** Double gold rule with lattice corner rosettes. Same geometry as the SVG in CardFace.jsx. */
export function borderPaths(W, H, L) {
  const a = L.inset, b = L.inset + L.inner
  const r = Math.max(4 * L.u, 18)
  return { a, b, r }
}

function drawBorder(g, W, H, L) {
  const { a, b, r } = borderPaths(W, H, L)
  g.strokeStyle = CARD.gold
  g.lineWidth = 1.5
  g.strokeRect(a, a, W - 2 * a, H - 2 * a)
  g.lineWidth = 0.75
  g.strokeRect(b, b, W - 2 * b, H - 2 * b)
  for (const [x, y] of [[b, b], [W - b, b], [W - b, H - b], [b, H - b]]) {
    g.lineWidth = 1
    g.beginPath()
    g.arc(x, y, r, 0, Math.PI * 2)
    g.stroke()
    g.beginPath()
    for (let k = 0; k < 8; k++) {
      const an = (k * Math.PI) / 4
      g.moveTo(x, y)
      g.lineTo(x + Math.cos(an) * r * 0.8, y + Math.sin(an) * r * 0.8)
    }
    g.stroke()
  }
}
