/* eslint-disable react-hooks/immutability -- the R3F frame loop mutates three.js objects and DOM refs every frame by design. */
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { useEffect, useMemo, useRef, useState } from 'react'
import * as THREE from 'three'
import arch from '../content/arch.json'
import { wedding } from '../content/wedding'
import { quadToMatrix3d } from '../lib/homography'
import { clamp01, intro, isMobile, seg, smooth } from '../lib/motion'
import { drawCardFace, loadCardFonts, cardLayout } from './cardFace'
import { buildFlowers } from './roses'
import { makeFibreNormal, makeGlow, makeLining, makeSealFace, makeTable, rng } from './textures'

/** CylinderGeometry cap UVs run 90° to the seal's face once it is turned to face up: rotate the art back upright. */
function uprightSeal(seal) {
  for (const t of [seal.map, seal.bumpMap]) {
    t.center.set(0.5, 0.5)
    t.rotation = Math.PI / 2
  }
  return seal
}

const IMG = '/images/invite/'
const CW = 16
const CH = (CW * arch.image.height) / arch.image.width
const FOV = 35
const T = Math.tan(THREE.MathUtils.degToRad(FOV / 2))
const STAGE = new THREE.Vector3(0, -60, 0)
/** The scroll progress at which the light bloom hides the move from courtyard to envelope. */
const SWITCH = 0.245
const PORTRAIT_CROP = 811 / arch.image.width // must match scripts/process-images.mjs

// Arch opening in world units (courtyard plane at z = 0, centred on the origin).
const hole = (() => {
  const { x0, y0, x1, y1 } = arch.bbox
  const left = (x0 - 0.5) * CW, right = (x1 - 0.5) * CW
  const top = (0.5 - y0) * CH, bottom = (0.5 - y1) * CH
  return { left, right, top, bottom, w: right - left, h: top - bottom, cx: (left + right) / 2, cy: (top + bottom) / 2 }
})()

/* ----------------------------------------------------------------------------------------------
 * Courtyard: the supplied image on a plane, the arch opening discarded via its alpha. A procedural
 * depth field gives 2.5D parallax (walls, floor and lanterns move at different depths). Lanterns
 * and sconces get a soft emissive flicker; the reflective floor shimmers; light floods across the
 * floor as the doors open. Colours are written raw so frame 0 matches the poster <img> exactly.
 * -------------------------------------------------------------------------------------------- */
const courtyardShader = {
  vertexShader: /* glsl */ `
    varying vec2 vUv;
    void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
  fragmentShader: /* glsl */ `
    uniform sampler2D map;
    uniform vec2 uPointer;
    uniform float uTime, uOpen, uAmp, uAspect;
    uniform vec4 uLant[4];
    uniform vec2 uArch;
    varying vec2 vUv;
    float flick(float i) {
      return 0.82 + 0.1 * sin(uTime * 7.3 + i * 1.7) * sin(uTime * 3.1 + i * 4.1) + 0.08 * sin(uTime * 13.0 + i);
    }
    float depth(vec2 uv) {
      float d = 0.2;
      d += smoothstep(0.34, 0.0, uv.y) * 0.8;                    // floor rises towards the viewer
      d += smoothstep(0.17, 0.48, abs(uv.x - 0.5)) * 0.5;        // side bays are nearer than the arch wall
      for (int i = 0; i < 4; i++) {
        vec2 q = (uv - uLant[i].xy) * vec2(uAspect, 1.0);
        d += (1.0 - smoothstep(uLant[i].z * 0.7, uLant[i].z * 1.8, length(q * vec2(1.0, 0.55)))) * 0.55;
      }
      return d;
    }
    void main() {
      vec2 uv = vUv + uPointer * (depth(vUv) - 0.35) * uAmp;
      vec4 c = texture2D(map, uv);
      if (c.a < 0.5) discard;
      vec3 col = c.rgb;
      float lum = dot(col, vec3(0.299, 0.587, 0.114));
      // Lantern and sconce flicker: modulate the bright pixels around each light, plus a soft halo.
      for (int i = 0; i < 4; i++) {
        vec2 q = (vUv - uLant[i].xy) * vec2(uAspect, 1.0);
        float r = length(q * vec2(1.0, 0.6));
        float f = flick(float(i));
        float core = 1.0 - smoothstep(0.0, uLant[i].z * 1.4, r);
        col *= mix(1.0, f + 0.12, core * smoothstep(0.45, 0.9, lum));
        col += vec3(1.0, 0.7, 0.36) * exp(-r * r / (uLant[i].z * uLant[i].z * 6.0)) * 0.07 * f;
      }
      // Floor: the reflections shimmer subtly.
      float floorMask = smoothstep(0.32, 0.26, vUv.y);
      float wave = sin(vUv.x * 120.0 + uTime * 1.3 + sin(vUv.y * 60.0 + uTime * 0.7) * 2.0);
      col += col * floorMask * smoothstep(0.5, 1.0, lum) * wave * 0.05;
      // Light floods out of the open doors across the floor.
      float beam = exp(-pow((vUv.x - uArch.x) * 7.0 / (1.0 + (0.3 - vUv.y) * 3.0), 2.0));
      col += vec3(1.0, 0.82, 0.55) * uOpen * beam * floorMask * 0.55;
      col += vec3(1.0, 0.85, 0.6) * uOpen * 0.25 * exp(-pow(length((vUv - uArch) * vec2(uAspect, 1.0)) * 5.0, 2.0));
      gl_FragColor = vec4(col, 1.0);
    }`,
}

/** Warm light beyond the doors; brightens to near-white as they open (the bloom that carries the cut). */
const lightShader = {
  vertexShader: courtyardShader.vertexShader,
  fragmentShader: /* glsl */ `
    uniform float uOpen;
    varying vec2 vUv;
    void main() {
      float r = length((vUv - vec2(0.5, 0.45)) * vec2(1.0, 0.8));
      vec3 closed = mix(vec3(1.0, 0.93, 0.78), mix(vec3(0.97, 0.79, 0.47), vec3(0.79, 0.55, 0.24), smoothstep(0.3, 0.75, r)), smoothstep(0.0, 0.42, r));
      vec3 open = mix(vec3(1.0, 0.98, 0.93), vec3(1.0, 0.86, 0.6), smoothstep(0.1, 0.8, r));
      gl_FragColor = vec4(mix(closed, open, uOpen), 1.0);
    }`,
}

/* ------------------------------------------------------------------------------------------- */

function stripGeometry(x1, y1, x2, y2, w, z = 0) {
  const dx = x2 - x1, dy = y2 - y1, len = Math.hypot(dx, dy)
  const nx = (-dy / len) * (w / 2), ny = (dx / len) * (w / 2)
  const g = new THREE.BufferGeometry()
  g.setAttribute('position', new THREE.Float32BufferAttribute([
    x1 + nx, y1 + ny, z, x1 - nx, y1 - ny, z, x2 - nx, y2 - ny, z, x2 + nx, y2 + ny, z,
  ], 3))
  g.setAttribute('normal', new THREE.Float32BufferAttribute([0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1], 3))
  g.setAttribute('uv', new THREE.Float32BufferAttribute([0, 1, 0, 0, 1, 0, 1, 1], 2))
  g.setIndex([0, 1, 2, 0, 2, 3])
  return g
}

function mergeStrips(list) {
  const pos = [], nor = [], uv = [], idx = []
  for (const g of list) {
    const base = pos.length / 3
    pos.push(...g.attributes.position.array)
    nor.push(...g.attributes.normal.array)
    uv.push(...g.attributes.uv.array)
    idx.push(...g.index.array.map((i) => i + base))
    g.dispose()
  }
  const out = new THREE.BufferGeometry()
  out.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3))
  out.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3))
  out.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2))
  out.setIndex(idx)
  return out
}

/** Bends the flap as it swings: a vertex-shader offset along z, strongest mid-flap. */
function bendable(material, uniforms, flapH) {
  material.onBeforeCompile = (shader) => {
    shader.uniforms.uBend = uniforms.uBend
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nuniform float uBend;')
      .replace(
        '#include <begin_vertex>',
        `#include <begin_vertex>
         float bt = clamp(-position.y / ${flapH.toFixed(4)}, 0.0, 1.0);
         transformed.z += uBend * sin(bt * 3.14159) * ${(flapH * 0.14).toFixed(4)};`,
      )
  }
  material.customProgramCacheKey = () => `bend-${flapH.toFixed(3)}`
  return material
}

/* ----------------------------------------------------------------------------------------------
 * Build everything imperatively once the textures are in. Returns the root and a per-frame update.
 * -------------------------------------------------------------------------------------------- */
function buildWorld(tex, size, mobile) {
  const root = new THREE.Group()
  const aspect = size.width / size.height
  const portrait = window.matchMedia('(orientation: portrait)').matches

  /* ---------- courtyard ---------- */
  const court = new THREE.Group()
  root.add(court)
  const lantern = arch.lanterns.map((l) => new THREE.Vector4(l.x, 1 - l.y, l.r, 0))
  const courtMat = new THREE.ShaderMaterial({
    ...courtyardShader,
    uniforms: {
      map: { value: tex.court },
      uPointer: { value: new THREE.Vector2() },
      uTime: { value: 0 },
      uOpen: { value: 0 },
      uAmp: { value: mobile ? 0.006 : 0.012 },
      uAspect: { value: CW / CH },
      uLant: { value: lantern },
      uArch: { value: new THREE.Vector2(arch.centre.x, 1 - arch.bbox.y1 + 0.02) },
    },
  })
  const courtPlane = new THREE.Mesh(new THREE.PlaneGeometry(CW, CH), courtMat)
  court.add(courtPlane)

  const lightMat = new THREE.ShaderMaterial({ ...lightShader, uniforms: { uOpen: { value: 0 } } })
  const light = new THREE.Mesh(new THREE.PlaneGeometry(hole.w * 1.3, hole.h * 1.15), lightMat)
  light.position.set(hole.cx, hole.cy, -0.25)
  court.add(light)

  // Gold, shared by the doors and the envelope foil so both scenes match.
  const goldParams = { color: new THREE.Color('#d9ae5f'), metalness: 1, roughness: 0.3, envMapIntensity: 1.25 }
  const gold = new THREE.MeshStandardMaterial(goldParams)

  const doorMat = (map) =>
    new THREE.MeshStandardMaterial({
      ...goldParams,
      color: new THREE.Color('#ffffff'),
      map,
      metalness: 0.55,
      roughness: 0.38,
      alphaTest: 0.45,
      side: THREE.DoubleSide,
      emissive: new THREE.Color('#ffffff'),
      emissiveMap: map,
      emissiveIntensity: 0.55,
    })
  const doorGeo = new THREE.PlaneGeometry(hole.w / 2, hole.h)
  const doorL = new THREE.Group(), doorR = new THREE.Group()
  doorL.position.set(hole.left, hole.cy, -0.004)
  doorR.position.set(hole.right, hole.cy, -0.004)
  const dl = new THREE.Mesh(doorGeo, doorMat(tex.doorL))
  dl.position.x = hole.w / 4
  const dr = new THREE.Mesh(doorGeo, doorMat(tex.doorR))
  dr.position.x = -hole.w / 4
  doorL.add(dl)
  doorR.add(dr)
  court.add(doorL, doorR)

  // Faint volumetric glow in front of the lattice.
  const haloMat = new THREE.SpriteMaterial({ map: tex.glow, color: '#ffd9a0', transparent: true, opacity: 0.18, depthWrite: false, blending: THREE.AdditiveBlending })
  const halo = new THREE.Sprite(haloMat)
  halo.scale.set(hole.w * 2.4, hole.h * 1.7, 1)
  halo.position.set(hole.cx, hole.cy, 0.25)
  court.add(halo)

  // Courtyard lights for the PBR doors.
  const doorLight = new THREE.PointLight('#ffd7a0', 6, 6, 1.5)
  doorLight.position.set(hole.cx, hole.cy + 0.4, 1.6)
  court.add(doorLight, new THREE.AmbientLight('#fff0dc', 0.5))

  // Dust motes drifting in the light.
  const dustN = mobile ? 70 : 220
  const r = rng(11)
  const dustPos = new Float32Array(dustN * 3), dustSeed = new Float32Array(dustN)
  for (let i = 0; i < dustN; i++) {
    dustPos.set([(r() - 0.5) * hole.w * 3.5 + hole.cx, (r() - 0.5) * CH * 0.8, 0.3 + r() * 4], i * 3)
    dustSeed[i] = r()
  }
  const dustGeo = new THREE.BufferGeometry()
  dustGeo.setAttribute('position', new THREE.BufferAttribute(dustPos, 3))
  dustGeo.setAttribute('seed', new THREE.BufferAttribute(dustSeed, 1))
  const dustMat = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    uniforms: { uTime: { value: 0 }, uMap: { value: tex.glow }, uPx: { value: size.height * 0.02 } },
    vertexShader: /* glsl */ `
      attribute float seed; uniform float uTime, uPx; varying float vA;
      void main() {
        vec3 p = position;
        p.x += sin(uTime * 0.15 + seed * 40.0) * 0.25;
        p.y += mod(seed * 9.0 + uTime * (0.03 + seed * 0.04), 9.0) - 4.5;
        vec4 mv = modelViewMatrix * vec4(p, 1.0);
        gl_Position = projectionMatrix * mv;
        gl_PointSize = uPx * (0.4 + seed) / -mv.z;
        vA = 0.25 + 0.35 * sin(uTime * 0.8 + seed * 30.0) * 0.5 + 0.2;
      }`,
    fragmentShader: /* glsl */ `
      uniform sampler2D uMap; varying float vA;
      void main() { vec4 t = texture2D(uMap, gl_PointCoord); gl_FragColor = vec4(1.0, 0.85, 0.6, t.a * vA); }`,
  })
  const dust = new THREE.Points(dustGeo, dustMat)
  dust.frustumCulled = false
  court.add(dust)

  // Camera framing for frame 0: "object-fit: cover" of the poster, centred on the arch.
  const visW = portrait ? PORTRAIT_CROP * CW : CW
  const camX0 = portrait ? (arch.centre.x - 0.5) * CW : 0
  const z0 = Math.min(CH / (2 * T), visW / (2 * T * aspect)) // "cover": the view never sees past the image
  const zNear = Math.max((hole.h * 0.95) / (2 * T), (hole.w * 0.9) / (2 * T * aspect)) * 0.95

  /* ---------- envelope stage ---------- */
  const stage = new THREE.Group()
  stage.position.copy(STAGE)
  root.add(stage)

  const ch = 1.6, cw = ch * aspect
  const ew = cw + 0.12, eh = ch + 0.12
  const w = ew / 2, h = eh / 2
  const fh = eh * 0.62

  const table = new THREE.Mesh(new THREE.PlaneGeometry(40, 40), new THREE.MeshStandardMaterial({ map: tex.table, roughness: 0.75, metalness: 0.05 }))
  table.rotation.x = -Math.PI / 2
  table.receiveShadow = !mobile
  stage.add(table)

  stage.add(new THREE.HemisphereLight('#fff1e2', '#5c1020', 1.15))
  const spot = new THREE.SpotLight('#fff2de', 60, 30, 0.6, 0.65, 1.6)
  spot.position.set(1.8, 7, 4)
  spot.target.position.set(0, 0, 0)
  spot.castShadow = !mobile
  spot.shadow.mapSize.set(1024, 1024)
  spot.shadow.bias = -0.0004
  stage.add(spot, spot.target)
  const fill = new THREE.PointLight('#ffc98a', 4, 12, 1.5)
  fill.position.set(-3, 2.5, 2)
  stage.add(fill)

  const env = new THREE.Group()
  env.rotation.x = -Math.PI / 2
  env.position.y = 0.004
  stage.add(env)

  // Plain beige envelope paper: a soft fibre texture, no pattern.
  const envParams = { color: new THREE.Color('#f4ead8'), roughness: 0.86, metalness: 0, normalMap: tex.fibre, normalScale: new THREE.Vector2(0.32, 0.32) }
  const velvet = new THREE.MeshStandardMaterial(envParams)
  // The card itself stays ivory paper.
  const paper = new THREE.MeshStandardMaterial({
    color: '#f4ecdc', roughness: 0.88, metalness: 0, normalMap: tex.fibre, normalScale: new THREE.Vector2(0.35, 0.35),
  })
  tex.fibre.repeat.set(3, 3)

  // Back panel: inside shows the jaali lining.
  const back = new THREE.Mesh(new THREE.PlaneGeometry(ew, eh), velvet)
  const backLining = new THREE.Mesh(new THREE.PlaneGeometry(ew, eh), new THREE.MeshStandardMaterial({ map: tex.lining, roughness: 0.6, metalness: 0.2 }))
  backLining.position.z = 0.001
  back.castShadow = !mobile
  env.add(back, backLining)

  // Pocket (front) with a V notch down to the centre.
  const pocketShape = new THREE.Shape()
  pocketShape.moveTo(-w, -h)
  pocketShape.lineTo(w, -h)
  pocketShape.lineTo(w, h)
  pocketShape.lineTo(0, 0)
  pocketShape.lineTo(-w, h)
  pocketShape.closePath()
  const pocket = new THREE.Mesh(new THREE.ShapeGeometry(pocketShape), velvet)
  pocket.position.z = 0.012
  env.add(pocket)
  const inset = 0.05, sw = 0.012
  const pocketFoil = new THREE.Mesh(mergeStrips([
    stripGeometry(-w + inset, -h + inset, w - inset, -h + inset, sw),
    stripGeometry(-w + inset, -h + inset, -w + inset, h - inset * 2.2, sw),
    stripGeometry(w - inset, -h + inset, w - inset, h - inset * 2.2, sw),
    stripGeometry(-w + inset, h - inset * 2.2, -inset * 0.4, -inset * 1.2, sw),
    stripGeometry(w - inset, h - inset * 2.2, inset * 0.4, -inset * 1.2, sw),
  ]), gold)
  pocketFoil.position.z = 0.0125
  env.add(pocketFoil)

  // Flap: hinged at the top edge. Outside = embossed geometric pattern, inside = jaali lining.
  const bendU = { uBend: { value: 0 } }
  const flapShape = new THREE.Shape()
  flapShape.moveTo(-w, 0)
  flapShape.lineTo(w, 0)
  flapShape.lineTo(0, -fh)
  flapShape.closePath()
  const flapGeo = new THREE.ShapeGeometry(flapShape, 1)
  {
    // Normalised UVs (ShapeGeometry uses raw positions).
    const p = flapGeo.attributes.position, uv = flapGeo.attributes.uv
    for (let i = 0; i < p.count; i++) uv.setXY(i, (p.getX(i) + w) / ew, (p.getY(i) + fh) / fh)
  }
  // Plain beige flap (the gold foil edge is a separate strip).
  const flapOuter = bendable(new THREE.MeshStandardMaterial({ ...envParams, color: new THREE.Color('#f6eddc') }), bendU, fh)
  const flapInner = bendable(new THREE.MeshStandardMaterial({ map: tex.lining, roughness: 0.6, metalness: 0.2, side: THREE.BackSide }), bendU, fh)
  const flapPivot = new THREE.Group()
  flapPivot.position.set(0, h, 0.016)
  const flapA = new THREE.Mesh(flapGeo, flapOuter)
  const flapB = new THREE.Mesh(flapGeo, flapInner)
  flapA.castShadow = !mobile
  const flapFoilMat = bendable(gold.clone(), bendU, fh)
  const flapFoil = new THREE.Mesh(mergeStrips([
    stripGeometry(-w + inset * 1.6, -inset * 0.6, -inset * 0.2, -fh + inset * 1.5, sw, 0.0006),
    stripGeometry(w - inset * 1.6, -inset * 0.6, inset * 0.2, -fh + inset * 1.5, sw, 0.0006),
  ]), flapFoilMat)
  flapPivot.add(flapA, flapB, flapFoil)
  env.add(flapPivot)

  // Wax seal: three prebuilt fracture wedges with the monogram face.
  const sealR = Math.min(ew, eh) * 0.1
  const sealY = -fh * 0.86
  const seal = new THREE.Group()
  seal.position.set(0, h + sealY, 0.03)
  const sealMat = new THREE.MeshStandardMaterial({
    map: tex.seal.map, bumpMap: tex.seal.bumpMap, bumpScale: 2.5, roughness: 0.42,
    metalness: wedding.options.sealColour === 'gold' ? 0.45 : 0.1, side: THREE.DoubleSide, transparent: true,
  })
  const pieces = [0, 1, 2].map((k) => {
    const start = (k * Math.PI * 2) / 3 + 0.3
    const g = new THREE.CylinderGeometry(sealR, sealR * 1.04, 0.035, 14, 1, false, start, (Math.PI * 2) / 3)
    g.rotateX(Math.PI / 2)
    const m = new THREE.Mesh(g, sealMat)
    m.castShadow = !mobile
    const mid = start + Math.PI / 3
    // CylinderGeometry measures theta from +z towards +x; after rotateX the direction lies in x/y.
    m.userData.dir = new THREE.Vector3(Math.sin(mid), -Math.cos(mid), 0)
    seal.add(m)
    return m
  })
  env.add(seal)

  // Gold particle burst when the seal cracks.
  const burstN = mobile ? 50 : 140
  const burstGeo = new THREE.BufferGeometry()
  const burstPos = new Float32Array(burstN * 3)
  const burstVel = []
  const rb = rng(23)
  for (let i = 0; i < burstN; i++) {
    const a = rb() * Math.PI * 2, s = 0.4 + rb() * 1.1
    burstVel.push(new THREE.Vector3(Math.cos(a) * s, Math.sin(a) * s, 0.6 + rb() * 1.4))
  }
  burstGeo.setAttribute('position', new THREE.BufferAttribute(burstPos, 3))
  const burstMat = new THREE.PointsMaterial({ map: tex.glow, color: '#ffd27a', size: 0.045, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending })
  const burst = new THREE.Points(burstGeo, burstMat)
  burst.position.copy(seal.position)
  burst.frustumCulled = false
  env.add(burst)

  // The card (front = the invitation, painted from the same layout as the DOM card face).
  const cardFront = new THREE.MeshStandardMaterial({ map: tex.card, roughness: 0.85, normalMap: tex.fibre, normalScale: new THREE.Vector2(0.15, 0.15) })
  const card = new THREE.Mesh(new THREE.PlaneGeometry(cw, ch), cardFront)
  const cardBack = new THREE.Mesh(new THREE.PlaneGeometry(cw, ch), paper)
  cardBack.rotation.y = Math.PI
  card.add(cardBack)
  card.castShadow = !mobile
  stage.add(card)

  // Roses, leaves and loose petals all around the envelope (the card lane stays clear).
  stage.add(buildFlowers({ ew, eh, cw, mobile, castShadow: !mobile }))

  // Card poses (stage space).
  const qFlat = new THREE.Quaternion().setFromEuler(new THREE.Euler(-Math.PI / 2, 0, 0))
  const qUp = new THREE.Quaternion()
  const slideDist = eh * 1.02
  const F = new THREE.Vector3(0, ch / 2 + 0.3, -eh * 0.25)
  const dFinal = ch / 2 / T // the card fills the viewport exactly from here
  const inEnv = (y) => new THREE.Vector3(0, env.position.y + 0.006, -y)

  // Stage camera keys.
  // Wide enough to show the ring of roses around the envelope.
  const D = Math.max((eh * 2.15) / (2 * T), (ew * 1.85) / (2 * T * aspect))
  const sealWorld = new THREE.Vector3(0, 0.03, -(h + sealY))
  const keys = [
    { p: SWITCH, pos: [0, D * 1.25, D * 0.22], look: [0, 0, 0] }, // overhead: the bloom resolves straight onto the envelope
    { p: 0.345, pos: [0, D * 1.0, D * 0.3], look: [0, 0, 0] },
    { p: 0.42, pos: [0, D * 0.62, D * 0.3], look: sealWorld.toArray() },
    { p: 0.52, pos: [0, D * 0.6, D * 0.33], look: sealWorld.toArray() },
    { p: 0.66, pos: [0, D * 0.88, D * 0.42], look: [0, 0, -eh * 0.2] },
    { p: 0.8, pos: [0, F.y + 0.25, F.z + dFinal * 2.1], look: F.toArray() },
    { p: 1, pos: [F.x, F.y, F.z + dFinal], look: F.toArray() },
  ].map((k) => ({ ...k, pos: new THREE.Vector3(...k.pos), look: new THREE.Vector3(...k.look) }))

  /* ---------- per-frame ---------- */
  const tmpA = new THREE.Vector3(), tmpB = new THREE.Vector3(), tmpV = new THREE.Vector3()
  const corners = [[-cw / 2, ch / 2], [cw / 2, ch / 2], [cw / 2, -ch / 2], [-cw / 2, -ch / 2]].map(([x, y]) => new THREE.Vector3(x, y, 0))

  function update(p, time, pointer, camera) {
    const inCourt = p < SWITCH
    court.visible = inCourt
    stage.visible = !inCourt

    if (inCourt) {
      // Heavy doors: they start slowly and take most of the approach to swing fully open.
      const open = Math.pow(seg(p, 0.06, 0.215), 1.35)
      courtMat.uniforms.uTime.value = time
      courtMat.uniforms.uOpen.value = open
      courtMat.uniforms.uPointer.value.copy(pointer).multiplyScalar(1 - seg(p, 0.08, 0.16))
      dustMat.uniforms.uTime.value = time
      lightMat.uniforms.uOpen.value = seg(p, 0.08, 0.235)
      doorL.rotation.y = open * 1.75
      doorR.rotation.y = -open * 1.75
      haloMat.opacity = 0.18 + 0.5 * open
      doorLight.intensity = 6 + open * 10
      // Dolly up the steps to the arch, then through it.
      const a = seg(p, 0.03, 0.21), b = seg(p, 0.21, SWITCH)
      const x = THREE.MathUtils.lerp(camX0, hole.cx, a)
      const y = THREE.MathUtils.lerp(0, hole.cy + 0.08, a)
      const z = THREE.MathUtils.lerp(z0, zNear, a) - b * (zNear + 0.6)
      camera.position.set(x + pointer.x * 0.02 * (1 - a), y + pointer.y * 0.015 * (1 - a), z)
      camera.lookAt(x, y + a * 0.05, z - 10)
      return null
    }

    // Seal: crack, burst, fall, fade.
    const crack = seg(p, 0.42, 0.45), fly = clamp01((p - 0.45) / 0.07), fade = 1 - seg(p, 0.53, 0.58)
    seal.visible = p < 0.58
    sealMat.opacity = fade
    pieces.forEach((m, i) => {
      const d = m.userData.dir
      const e = smooth(fly)
      m.position.set(d.x * (crack * 0.008 + e * sealR * (2.2 + i * 0.4)), d.y * (crack * 0.008 + e * sealR * (2.2 + i * 0.4)), Math.sin(e * Math.PI) * 0.12 - e * 0.02)
      m.rotation.set(d.y * e * 1.4, -d.x * e * 1.4, e * (i - 1) * 0.8)
    })
    const bt = clamp01((p - 0.445) / 0.1)
    burst.visible = bt > 0 && bt < 1
    burstMat.opacity = (1 - bt) * 0.95
    for (let i = 0; i < burstN; i++) {
      const v = burstVel[i]
      burstPos[i * 3] = v.x * bt * 0.35
      burstPos[i * 3 + 1] = v.y * bt * 0.35
      burstPos[i * 3 + 2] = 0.04 + v.z * bt * 0.3 - bt * bt * 0.45
    }
    burstGeo.attributes.position.needsUpdate = true

    // Flap: real hinge rotation, bending mid-swing.
    const f = seg(p, 0.52, 0.66)
    flapPivot.rotation.x = -(Math.PI + 0.3) * f
    bendU.uBend.value = Math.sin(f * Math.PI) * 1.0

    // Card: slides out of the pocket, rises, turns to face the camera.
    const s = seg(p, 0.66, 0.73), rise = seg(p, 0.73, 0.8)
    const S = inEnv(slideDist * s)
    tmpA.copy(S).lerp(F, rise)
    tmpA.y += Math.sin(rise * Math.PI) * 0.25
    card.position.copy(tmpA)
    card.quaternion.slerpQuaternions(qFlat, qUp, rise)

    // Camera through the keys.
    let k = 0
    while (k < keys.length - 2 && p > keys[k + 1].p) k++
    const A = keys[k], B = keys[k + 1]
    const t = seg(p, A.p, B.p)
    tmpA.lerpVectors(A.pos, B.pos, t)
    tmpB.lerpVectors(A.look, B.look, t)
    // Slight pointer tilt on the envelope; fades to zero so the final pose is exact.
    const tilt = 1 - seg(p, 0.7, 0.8)
    tmpA.x += pointer.x * 0.12 * tilt
    tmpA.y += pointer.y * 0.08 * tilt
    camera.position.copy(tmpA).add(STAGE)
    camera.lookAt(tmpV.copy(tmpB).add(STAGE))

    // Projected card corners → matrix3d for the DOM card face.
    if (p < 0.74) return null
    camera.updateMatrixWorld()
    card.updateMatrixWorld()
    const quad = []
    for (const c of corners) {
      tmpV.copy(c).applyMatrix4(card.matrixWorld)
      const view = tmpV.clone().applyMatrix4(camera.matrixWorldInverse)
      if (view.z > -0.01) return null
      tmpV.project(camera)
      quad.push([(tmpV.x * 0.5 + 0.5) * size.width, (-tmpV.y * 0.5 + 0.5) * size.height])
    }
    return quad
  }

  return { root, update, info: { cw, ch, dFinal } }
}

/* ---------------------------------------------------------------------------------------------- */

function World({ onProgress, onReady, cardEl, flashEl, mobile }) {
  const { gl, scene, camera, size, invalidate } = useThree()
  const [tex, setTex] = useState(null)
  const pointer = useRef(new THREE.Vector2())
  const target = useRef(new THREE.Vector2())
  const lastMatrix = useRef('')

  // Load textures (counted by the preloader), build procedural ones, set the env map.
  useEffect(() => {
    let alive = true
    const manager = new THREE.LoadingManager()
    manager.onProgress = (_, loaded, total) => onProgress(0.15 + 0.6 * (loaded / total))
    const loader = new THREE.TextureLoader(manager)
    const load = (url, srgb = true) =>
      new Promise((res, rej) =>
        loader.load(url, (t) => {
          t.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace
          t.anisotropy = 4
          res(t)
        }, undefined, rej),
      )
    // The seal's monogram is drawn into a canvas, so its Arabic font must be loaded first.
    const sealFont = document.fonts?.load('700 160px Amiri', wedding.couple.monogram.script).catch(() => {}) ?? Promise.resolve()
    Promise.all([
      load(IMG + (mobile ? 'palace-courtyard-cut-1024.webp' : 'palace-courtyard-cut-2048.webp'), false),
      load(IMG + 'jaali-door-left-2x.webp'),
      load(IMG + 'jaali-door-right-2x.webp'),
      load(IMG + 'palace-courtyard-env.webp'),
      sealFont,
    ]).then(([court, doorL, doorR, envTex]) => {
      if (!alive) return
      court.generateMipmaps = true
      envTex.mapping = THREE.EquirectangularReflectionMapping
      const pmrem = new THREE.PMREMGenerator(gl)
      scene.environment = pmrem.fromEquirectangular(envTex).texture
      pmrem.dispose()
      setTex({
        court, doorL, doorR,
        fibre: makeFibreNormal(),
        lining: makeLining(),
        seal: uprightSeal(makeSealFace(wedding.couple.monogram.script, wedding.options.sealColour)),
        glow: makeGlow(),
        table: makeTable(),
      })
    }).catch((e) => {
      console.error(e)
      onReady(false)
    })
    return () => { alive = false }
  }, [gl, scene, mobile, onProgress, onReady])

  // Card face texture: drawn after the fonts are ready, from the shared layout.
  const [cardTex, setCardTex] = useState(null)
  useEffect(() => {
    let alive = true
    const L = cardLayout(size.width, size.height)
    loadCardFonts(L).then(() => {
      if (!alive) return
      const cv = document.createElement('canvas')
      const s = Math.min(2048 / Math.max(size.width, size.height), 1.5)
      drawCardFace(cv, size.width, size.height, s)
      const t = new THREE.CanvasTexture(cv)
      t.colorSpace = THREE.SRGBColorSpace
      t.anisotropy = 8
      setCardTex((old) => {
        old?.dispose()
        return t
      })
    })
    return () => { alive = false }
  }, [size.width, size.height])

  const world = useMemo(() => {
    if (!tex || !cardTex) return null
    return buildWorld({ ...tex, card: cardTex }, size, mobile)
  }, [tex, cardTex, size, mobile])

  if (import.meta.env.DEV) window.__three = { camera, size, gl }
  // Compile shaders before declaring ready, so the first scroll never hitches.
  useEffect(() => {
    if (!world) return
    scene.add(world.root)
    camera.fov = FOV
    camera.near = 0.02
    camera.far = 200
    camera.updateProjectionMatrix()
    // Pre-compile both halves of the journey.
    world.update(0.3, 0, pointer.current, camera)
    world.root.traverse((o) => { o.visible = true })
    const done = () => {
      world.update(intro.p, 0, pointer.current, camera)
      onProgress(1)
      onReady(true)
      invalidate()
    }
    const compile = gl.compileAsync ? gl.compileAsync(scene, camera) : Promise.resolve(gl.compile(scene, camera))
    onProgress(0.85)
    compile.then(done, done)
    return () => {
      scene.remove(world.root)
    }
  }, [world, scene, camera, gl, onProgress, onReady, invalidate])

  useEffect(() => {
    if (mobile) return
    const move = (e) => target.current.set((e.clientX / innerWidth) * 2 - 1, -((e.clientY / innerHeight) * 2 - 1))
    addEventListener('pointermove', move, { passive: true })
    return () => removeEventListener('pointermove', move)
  }, [mobile])

  useFrame((state) => {
    if (!world) return
    pointer.current.lerp(target.current, 0.06)
    const p = intro.p
    const quad = world.update(p, state.clock.elapsedTime, pointer.current, camera)

    // DOM overlays driven from the same frame.
    // The bloom rises as the camera passes the doors and holds while the Salam is read, then reveals the envelope.
    if (flashEl.current) flashEl.current.style.opacity = String(p < SWITCH ? seg(p, 0.19, SWITCH) : 1 - seg(p, 0.3, 0.345))
    const el = cardEl.current
    if (!el) return
    if (p >= 0.999) {
      if (lastMatrix.current !== 'none') {
        el.style.transform = 'none'
        el.style.opacity = '1'
        lastMatrix.current = 'none'
      }
      return
    }
    const vis = seg(p, 0.78, 0.83)
    el.style.opacity = String(0.002 + 0.998 * vis)
    if (quad) {
      const m = quadToMatrix3d(size.width, size.height, quad)
      if (m && m !== lastMatrix.current) {
        el.style.transform = m
        lastMatrix.current = m
        el.dataset.matrix = m
      }
    }
  })

  return null
}

export default function Scene({ onProgress, onReady, cardEl, flashEl, active }) {
  const mobile = useMemo(() => isMobile(), [])
  return (
    <Canvas
      className="scene-canvas"
      aria-hidden="true"
      frameloop={active ? 'always' : 'never'}
      dpr={[1, Math.min(1.75, window.devicePixelRatio || 1)]}
      shadows={!mobile}
      camera={{ fov: FOV, near: 0.02, far: 200, position: [0, 0, 20] }}
      gl={{ antialias: !mobile, powerPreference: 'high-performance', alpha: false }}
      onCreated={({ gl }) => {
        gl.toneMapping = THREE.NeutralToneMapping
        gl.toneMappingExposure = 1
        gl.setClearColor('#3a0a16')
      }}
    >
      <World onProgress={onProgress} onReady={onReady} cardEl={cardEl} flashEl={flashEl} mobile={mobile} />
    </Canvas>
  )
}
