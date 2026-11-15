import * as THREE from 'three'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import { rng } from './textures'

/**
 * Procedural, realistic-looking roses for the envelope table: each bloom is ~26 individually shaped
 * petals on a golden-angle spiral (tight bud in the middle, open cupped petals outside whose tips
 * curl back), with darker petal bases baked into vertex colours. Leaves have a folded midrib.
 * Everything is instanced: three draw calls for all roses, leaves and loose petals.
 */

/** One petal in the XY plane, base at the origin, growing up +y, facing +z (away from the flower centre). */
function petal(w, h, cup, curl, shadeBase = 0.5) {
  const g = new THREE.PlaneGeometry(1, 1, 8, 12)
  const p = g.attributes.position
  const colors = []
  for (let i = 0; i < p.count; i++) {
    const u = p.getX(i) // -0.5 .. 0.5 across
    const v = p.getY(i) + 0.5 // 0 base .. 1 tip
    // Elliptical profile: narrow at the base, broadest above the middle, still wide at the top...
    const wf = Math.sqrt(Math.max(0, 1 - ((v - 0.55) / 0.6) ** 2))
    const x = u * w * wf
    // ...and the top edge arcs down towards the sides, so the petal ends in a soft round lobe, not a point.
    const y = v * h * (1 - 0.2 * (2 * u) ** 2 * v ** 4)
    // Cupped across the width, and the upper edge rolls back outward.
    const z = (2 * u) ** 2 * cup * w * (0.4 + 0.6 * v) + curl * h * v ** 3
    p.setXYZ(i, x, y, z)
    const shade = shadeBase + (1 - shadeBase) * Math.min(1, v * 1.15) + Math.abs(u) * 0.08
    colors.push(shade, shade, shade)
  }
  g.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3))
  return g
}

function roseGeometry() {
  const parts = []
  const N = 26
  for (let i = 0; i < N; i++) {
    const t = i / (N - 1)
    const h = 0.32 + 0.68 * t
    const w = 0.28 + 0.62 * t
    const tilt = 0.06 + 1.05 * t ** 1.25
    const r = 0.015 + 0.17 * t
    const g = petal(w, h, 0.42 - 0.16 * t, 0.03 + 0.3 * t * t, 0.42 + 0.1 * (1 - t))
    g.rotateX(tilt)
    g.translate(0, 0, r)
    g.rotateY(i * 2.39996)
    parts.push(g)
  }
  // A green receptacle under the bloom.
  const base = new THREE.SphereGeometry(0.16, 10, 6, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2)
  base.translate(0, 0.04, 0)
  const bc = []
  for (let i = 0; i < base.attributes.position.count; i++) bc.push(0.25, 0.42, 0.22)
  base.setAttribute('color', new THREE.Float32BufferAttribute(bc, 3))
  base.deleteAttribute('uv')
  parts.forEach((g) => g.deleteAttribute('uv'))
  const merged = mergeGeometries([...parts, base])
  merged.computeVertexNormals()
  parts.forEach((g) => g.dispose())
  base.dispose()
  return merged
}

function leafGeometry() {
  const g = new THREE.PlaneGeometry(1, 1, 4, 10)
  const p = g.attributes.position
  const colors = []
  for (let i = 0; i < p.count; i++) {
    const u = p.getX(i), v = p.getY(i) + 0.5
    const x = u * 0.5 * Math.sin(Math.PI * v) ** 0.75
    const z = Math.abs(x) * 0.55 + 0.18 * v * v // folded at the midrib, tip lifts slightly
    p.setXYZ(i, x, v, z)
    const s = 0.7 + 0.3 * v - Math.abs(u) * 0.25
    colors.push(s, s, s)
  }
  g.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3))
  g.rotateX(-Math.PI / 2) // lie on the table, pointing +z
  g.computeVertexNormals()
  return g
}

function loosePetalGeometry() {
  const g = petal(0.62, 0.72, 0.28, 0.12, 0.6)
  g.rotateX(-Math.PI / 2 + 0.18)
  g.computeVertexNormals()
  return g
}

const ROSE_COLOURS = ['#7d0d1f', '#9e1328', '#b8233a', '#8a1024', '#f1e3d3', '#e8b4b8', '#c9364d']

/**
 * Clusters of roses around an envelope lying on the table (stage space, table at y = 0).
 * The envelope spans x ±ew/2, z ±eh/2; the card slides out towards -z, so that lane stays clear.
 */
export function buildFlowers({ ew, eh, cw, mobile, castShadow }) {
  const group = new THREE.Group()
  const r = rng(101)
  const lane = (x, z) => Math.abs(x) < cw / 2 + 0.3 && z < -eh / 2 + 0.1 // where the card slides out
  const onEnvelope = (x, z, m = 0.08) => Math.abs(x) < ew / 2 + m && Math.abs(z) < eh / 2 + m

  // Cluster centres on a rounded ring just outside the envelope, then a sparser outer ring.
  const centres = []
  const rings = mobile ? [[0.38, 9], [0.95, 7]] : [[0.42, 12], [1.05, 10]]
  for (const [margin, n] of rings)
    for (let k = 0; k < n; k++) {
      const a = (k / n) * Math.PI * 2 + r() * 0.4
      const rx = ew / 2 + margin + r() * 0.15, rz = eh / 2 + margin + r() * 0.15
      // superellipse: hugs the rectangle's corners
      const c = Math.cos(a), s = Math.sin(a)
      const x = Math.sign(c) * Math.abs(c) ** 0.6 * rx, z = Math.sign(s) * Math.abs(s) ** 0.6 * rz
      if (!lane(x, z) && !onEnvelope(x, z)) centres.push([x, z])
    }

  const roses = [], leaves = []
  for (const [cx, cz] of centres) {
    const n = 1 + Math.floor(r() * 3)
    for (let j = 0; j < n; j++) {
      const s = (j === 0 ? 0.16 : 0.11) * (0.85 + r() * 0.35)
      const x = cx + (j ? (r() - 0.5) * 0.36 : 0), z = cz + (j ? (r() - 0.5) * 0.36 : 0)
      if (lane(x, z) || onEnvelope(x, z, 0.02)) continue
      roses.push({ x, z, s, tilt: 0.25 + r() * 0.55, yaw: r() * Math.PI * 2, c: ROSE_COLOURS[Math.floor(r() * ROSE_COLOURS.length)] })
    }
    for (let j = 0; j < 3; j++) {
      const a = r() * Math.PI * 2
      leaves.push({ x: cx + Math.cos(a) * 0.12, z: cz + Math.sin(a) * 0.12, s: 0.2 + r() * 0.12, yaw: -a + Math.PI / 2 + (r() - 0.5) * 0.6, tone: r() })
    }
  }

  const petals = []
  const nPetals = mobile ? 26 : 60
  for (let tries = 0; petals.length < nPetals && tries < 600; tries++) {
    const x = (r() - 0.5) * (ew + 2.6), z = (r() - 0.5) * (eh + 2.6)
    if (onEnvelope(x, z, 0.04) || lane(x, z)) continue
    petals.push({ x, z, s: 0.06 + r() * 0.05, yaw: r() * Math.PI * 2, c: ROSE_COLOURS[Math.floor(r() * 4)] })
  }

  const dummy = new THREE.Object3D()
  const colour = new THREE.Color()

  const roseMat = new THREE.MeshPhysicalMaterial({
    vertexColors: true, roughness: 0.52, metalness: 0, sheen: 0.9, sheenRoughness: 0.45,
    sheenColor: new THREE.Color('#ffd6de'), side: THREE.DoubleSide,
  })
  const roseMesh = new THREE.InstancedMesh(roseGeometry(), roseMat, roses.length)
  roses.forEach((o, i) => {
    dummy.position.set(o.x, o.s * 0.42, o.z)
    // Cut heads resting on the table: tipped over a little, facing up and outwards.
    dummy.rotation.set(0, o.yaw, 0)
    dummy.rotateX(o.tilt)
    dummy.scale.setScalar(o.s)
    dummy.updateMatrix()
    roseMesh.setMatrixAt(i, dummy.matrix)
    roseMesh.setColorAt(i, colour.set(o.c))
  })

  const leafMat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.6, metalness: 0, side: THREE.DoubleSide })
  const leafMesh = new THREE.InstancedMesh(leafGeometry(), leafMat, leaves.length)
  leaves.forEach((o, i) => {
    dummy.position.set(o.x, 0.012, o.z)
    dummy.rotation.set(0, o.yaw, 0)
    dummy.scale.setScalar(o.s)
    dummy.updateMatrix()
    leafMesh.setMatrixAt(i, dummy.matrix)
    leafMesh.setColorAt(i, colour.set(o.tone > 0.5 ? '#2f5a2a' : '#3f6e34'))
  })

  const petalMat = new THREE.MeshPhysicalMaterial({
    vertexColors: true, roughness: 0.55, sheen: 0.8, sheenRoughness: 0.5, sheenColor: new THREE.Color('#ffd6de'), side: THREE.DoubleSide,
  })
  const petalMesh = new THREE.InstancedMesh(loosePetalGeometry(), petalMat, petals.length)
  petals.forEach((o, i) => {
    dummy.position.set(o.x, 0.008, o.z)
    dummy.rotation.set(0, o.yaw, 0)
    dummy.scale.setScalar(o.s)
    dummy.updateMatrix()
    petalMesh.setMatrixAt(i, dummy.matrix)
    petalMesh.setColorAt(i, colour.set(o.c))
  })

  for (const m of [roseMesh, leafMesh, petalMesh]) {
    m.castShadow = castShadow
    m.receiveShadow = castShadow
    m.instanceMatrix.needsUpdate = true
    if (m.instanceColor) m.instanceColor.needsUpdate = true
    group.add(m)
  }
  return group
}
