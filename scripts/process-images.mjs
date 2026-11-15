// Processes the supplied invite images. Originals in public/images/invite are never modified;
// processed versions are written next to them with descriptive suffixes.
//
//   node scripts/process-images.mjs
//
// Outputs
//   palace-courtyard-cut-{2048,1024}.webp   RGBA, the white arch opening cut to alpha (3D background plane)
//   palace-courtyard-poster-{1920,1280}.webp/.avif  doors closed + light, the LCP poster (landscape)
//   palace-courtyard-poster-portrait.webp/.avif     centre crop around the arch for portrait phones
//   palace-courtyard-open-{1920,portrait}.webp      doors open, used for prefers-reduced-motion
//   palace-courtyard-env.webp                       small copy used to build the env map
//   jaali-door-{left,right}-2x.webp                 RGBA, lattice gaps keyed to alpha, 2x upscale
//   arch.json                                       arch opening bounds (normalised) for the 3D scene
import fs from 'node:fs/promises'
import path from 'node:path'
import sharp from 'sharp'

const dir = path.resolve('public/images/invite')
const src = (f) => path.join(dir, f)
const out = (f) => path.join(dir, f)

// ---------- 1. Arch opening → alpha ----------
const court = sharp(src('palace-courtyard.webp'))
const { data, info } = await court.ensureAlpha().raw().toBuffer({ resolveWithObject: true })
const { width: W, height: H } = info
const isWhite = (i) => data[i + 3] < 128 || Math.min(data[i], data[i + 1], data[i + 2]) >= 236

// Flood fill from the centre of the opening (found by eye at ~1200,850 in the 2400×1351 original).
const mask = new Uint8Array(W * H)
const stack = [[1200, 850]]
let minX = W, minY = H, maxX = 0, maxY = 0
while (stack.length) {
  const [x, y] = stack.pop()
  if (x < 0 || y < 0 || x >= W || y >= H) continue
  const k = y * W + x
  if (mask[k] || !isWhite(k * 4)) continue
  mask[k] = 1
  if (x < minX) minX = x
  if (x > maxX) maxX = x
  if (y < minY) minY = y
  if (y > maxY) maxY = y
  stack.push([x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1])
}
console.log('arch bbox', { minX, minY, maxX, maxY, w: maxX - minX, h: maxY - minY })

// Grow the hole by 1px and feather by 1px so no white fringe survives against the jaali trim.
const alpha = Buffer.alloc(W * H, 255)
for (let y = 1; y < H - 1; y++)
  for (let x = 1; x < W - 1; x++) {
    const k = y * W + x
    if (mask[k]) alpha[k] = 0
    else if (mask[k - 1] || mask[k + 1] || mask[k - W] || mask[k + W]) alpha[k] = 40
    else if (mask[k - 2] || mask[k + 2] || mask[k - 2 * W] || mask[k + 2 * W]) alpha[k] = 170
  }
const rgba = Buffer.from(data)
for (let k = 0; k < W * H; k++) rgba[k * 4 + 3] = alpha[k]
const cut = sharp(rgba, { raw: { width: W, height: H, channels: 4 } })
await cut.clone().resize(2048).webp({ quality: 80, alphaQuality: 90 }).toFile(out('palace-courtyard-cut-2048.webp'))
await cut.clone().resize(1024).webp({ quality: 78, alphaQuality: 90 }).toFile(out('palace-courtyard-cut-1024.webp'))

// Mask PNG for the arch hole (white = opening), used to clip the doors when compositing posters.
const holeMask = Buffer.alloc(W * H)
for (let k = 0; k < W * H; k++) holeMask[k] = 255 - alpha[k]

const arch = {
  image: { width: W, height: H },
  // normalised, origin top-left
  bbox: { x0: minX / W, y0: minY / H, x1: (maxX + 1) / W, y1: (maxY + 1) / H },
  centre: { x: (minX + maxX + 1) / 2 / W, y: (minY + maxY + 1) / 2 / H },
  lanterns: [
    { kind: 'hanging', x: 612 / W, y: 430 / H, r: 0.045 },
    { kind: 'hanging', x: 1774 / W, y: 440 / H, r: 0.045 },
    { kind: 'sconce', x: 146 / W, y: 478 / H, r: 0.03 },
    { kind: 'sconce', x: 2262 / W, y: 478 / H, r: 0.03 },
  ],
}
await fs.writeFile(out('arch.json'), JSON.stringify(arch, null, 2))
await fs.writeFile(path.resolve('src/content/arch.json'), JSON.stringify(arch, null, 2))

// ---------- 2. Doors: lattice gaps → alpha, 2× upscale ----------
async function keyDoor(name) {
  // The supplied files are named opposite to where they sit: jaali-door-right.webp is the LEFT leaf
  // (byte-identical to wedding_simple/assets/leaf-l.webp) and vice versa. Map them by position.
  const source = name === 'left' ? 'jaali-door-right.webp' : 'jaali-door-left.webp'
  const img = sharp(src(source)).resize({ width: 320, kernel: 'lanczos3' }).sharpen({ sigma: 0.8 })
  const { data: d, info: di } = await img.ensureAlpha().raw().toBuffer({ resolveWithObject: true })
  for (let i = 0; i < d.length; i += 4) {
    const r = d[i] / 255, g = d[i + 1] / 255, b = d[i + 2] / 255
    const mx = Math.max(r, g, b), mn = Math.min(r, g, b)
    const sat = mx === 0 ? 0 : (mx - mn) / mx
    const lum = 0.2126 * r + 0.7152 * g + 0.0722 * b
    // Bright, low-saturation pixels are light through the gaps (or the white corner): transparent.
    // Gold is saturated; the dark carved frame is low-luminance. Both stay opaque.
    let a = 1
    if (lum > 0.62) {
      const t = (sat - 0.2) / 0.16
      a = Math.min(1, Math.max(0, t))
    }
    d[i + 3] = Math.round(a * 255 * (d[i + 3] / 255))
  }
  await sharp(d, { raw: { width: di.width, height: di.height, channels: 4 } })
    .webp({ quality: 55, alphaQuality: 60, effort: 6, smartSubsample: true })
    .toFile(out(`jaali-door-${name}-2x.webp`))
  return { width: di.width, height: di.height }
}
const doorSize = await keyDoor('left')
await keyDoor('right')

// ---------- 3. Posters ----------
const bw = maxX - minX + 1, bh = maxY - minY + 1
// Warm light behind the doors (glow through the lattice).
const glowSvg = (open) => Buffer.from(`
<svg xmlns="http://www.w3.org/2000/svg" width="${bw}" height="${bh}">
  <defs><radialGradient id="g" cx="50%" cy="${open ? 55 : 45}%" r="75%">
    <stop offset="0" stop-color="${open ? '#fff8e8' : '#ffeec8'}"/>
    <stop offset="0.55" stop-color="${open ? '#ffe2a6' : '#f7c977'}"/>
    <stop offset="1" stop-color="${open ? '#f3c27a' : '#c98d3c'}"/></radialGradient></defs>
  <rect width="100%" height="100%" fill="url(#g)"/></svg>`)
const halfW = Math.round(bw / 2)
const doorL = await sharp(out('jaali-door-left-2x.webp')).resize(halfW, bh, { fit: 'fill' }).toBuffer()
const doorR = await sharp(out('jaali-door-right-2x.webp')).resize(bw - halfW, bh, { fit: 'fill' }).toBuffer()

async function fillArch(open) {
  const layers = open ? [] : [
    { input: doorL, left: 0, top: 0 },
    { input: doorR, left: halfW, top: 0 },
  ]
  const fill = await sharp(glowSvg(open)).composite(layers).removeAlpha().raw().toBuffer()
  // Blend the filled arch under the courtyard, using the courtyard's own alpha as the clip,
  // so nothing spills over the gold trim.
  const outBuf = Buffer.alloc(W * H * 3)
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++) {
      const k = y * W + x
      const a = rgba[k * 4 + 3] / 255
      const inBox = x >= minX && x <= maxX && y >= minY && y <= maxY
      const fi = inBox ? ((y - minY) * bw + (x - minX)) * 3 : -1
      for (let c = 0; c < 3; c++) {
        const under = fi >= 0 ? fill[fi + c] : 0xf3
        outBuf[k * 3 + c] = Math.round(rgba[k * 4 + c] * a + under * (1 - a))
      }
    }
  return sharp(outBuf, { raw: { width: W, height: H, channels: 3 } }).png().toBuffer()
}

const closed = await fillArch(false)
const open = await fillArch(true)
await fs.writeFile(path.join('scripts', '.poster-closed.png'), closed)

// Portrait crop centred on the arch: 9:19.5 is the narrowest phone; keep a little margin.
const pw = Math.round(H * 0.6)
const pLeft = Math.round(arch.centre.x * W - pw / 2)

for (const [buf, name] of [[closed, 'poster'], [open, 'open']]) {
  await sharp(buf).resize(1920).webp({ quality: 48, effort: 6, smartSubsample: true }).toFile(out(`palace-courtyard-${name}-1920.webp`))
  await sharp(buf).extract({ left: pLeft, top: 0, width: pw, height: H }).resize({ width: 540 }).webp({ quality: 60, effort: 6 }).toFile(out(`palace-courtyard-${name}-portrait.webp`))
}
await sharp(closed).resize(1280).webp({ quality: 70, effort: 6 }).toFile(out('palace-courtyard-poster-1280.webp'))
await sharp(closed).resize(1920).avif({ quality: 50, effort: 6 }).toFile(out('palace-courtyard-poster-1920.avif'))
await sharp(closed).extract({ left: pLeft, top: 0, width: pw, height: H }).resize({ width: 540 }).avif({ quality: 48, effort: 6 }).toFile(out('palace-courtyard-poster-portrait.avif'))
await sharp(src('palace-courtyard.webp')).resize(512, 256, { fit: 'fill' }).webp({ quality: 70 }).toFile(out('palace-courtyard-env.webp'))

await fs.unlink(path.join('scripts', '.poster-closed.png'))
const files = (await fs.readdir(dir)).filter((f) => f !== 'arch.json')
for (const f of files) {
  const s = await fs.stat(out(f))
  console.log(f.padEnd(42), (s.size / 1024).toFixed(1).padStart(7), 'KB')
}
console.log('door', doorSize, 'arch px', { bw, bh, portraitCropWidth: pw })

// ---------- 4. Nikah stage (couple + guests), approved for the family reveal ----------
// The bottom 80 px hold the sparkle watermark (x≈1296–1344, y≈696–736); trimming them removes it
// while keeping the couple and every guest in frame.
{
  const stage = () => sharp(src('nikah-stage.jpg')).extract({ left: 0, top: 0, width: 1376, height: 688 })
  await stage().webp({ quality: 74, effort: 6 }).toFile(out('nikah-stage-1376.webp'))
  await stage().resize(820).webp({ quality: 72, effort: 6 }).toFile(out('nikah-stage-820.webp'))
  await stage().resize(48).blur(2).webp({ quality: 60 }).toFile(out('nikah-stage-blur.webp'))
}

// ---------- 5. Walima night photo ----------
// walima-night.png (1376×768) has a sparkle watermark on the black fabric at about (1256, 648).
// Cover it with a soft blot of the surrounding fabric colour, then export web sizes.
{
  const base = sharp(src('walima-night.png')).removeAlpha()
  const { data } = await base.clone().extract({ left: 1290, top: 630, width: 40, height: 50 }).raw().toBuffer({ resolveWithObject: true })
  const sum = [0, 0, 0]
  for (let i = 0; i < data.length; i += 3) for (let k = 0; k < 3; k++) sum[k] += data[i + k]
  const rgb = sum.map((v) => Math.round(v / (data.length / 3))).join(',')
  const blot = Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="1376" height="768"><defs><filter id="f" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="5"/></filter></defs><ellipse cx="1256" cy="648" rx="27" ry="29" fill="rgb(${rgb})" filter="url(#f)"/></svg>`,
  )
  const clean = await base.clone().composite([{ input: blot, left: 0, top: 0 }]).toBuffer()
  await sharp(clean).webp({ quality: 76, effort: 6 }).toFile(out('walima-night-1376.webp'))
  await sharp(clean).resize(820).webp({ quality: 74, effort: 6 }).toFile(out('walima-night-820.webp'))
  await sharp(clean).resize(48).blur(2).webp({ quality: 60 }).toFile(out('walima-night-blur.webp'))
}
