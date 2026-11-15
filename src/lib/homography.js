/**
 * CSS matrix3d that maps the rectangle (0,0)-(w,h) onto the quad p0..p3
 * (top-left, top-right, bottom-right, bottom-left), in pixels, with transform-origin 0 0.
 * A planar card under perspective projection maps by a homography, so this is exact.
 */
export function quadToMatrix3d(w, h, [p0, p1, p2, p3]) {
  const src = [[0, 0], [w, 0], [w, h], [0, h]]
  const dst = [p0, p1, p2, p3]
  // Solve the 8 unknowns a..h of  x' = (a x + b y + c)/(g x + h y + 1),  y' = (d x + e y + f)/(g x + h y + 1)
  const A = []
  const B = []
  for (let i = 0; i < 4; i++) {
    const [x, y] = src[i]
    const [u, v] = dst[i]
    A.push([x, y, 1, 0, 0, 0, -u * x, -u * y]); B.push(u)
    A.push([0, 0, 0, x, y, 1, -v * x, -v * y]); B.push(v)
  }
  const s = solve(A, B)
  if (!s) return null
  const [a, b, c, d, e, f, g, hh] = s
  // Column-major 4×4 with the homography in the x/y/w rows and z passed through.
  return `matrix3d(${a},${d},0,${g},${b},${e},0,${hh},0,0,1,0,${c},${f},0,1)`
}

function solve(A, B) {
  const n = B.length
  const M = A.map((row, i) => [...row, B[i]])
  for (let c = 0; c < n; c++) {
    let piv = c
    for (let r = c + 1; r < n; r++) if (Math.abs(M[r][c]) > Math.abs(M[piv][c])) piv = r
    if (Math.abs(M[piv][c]) < 1e-12) return null
    ;[M[c], M[piv]] = [M[piv], M[c]]
    for (let r = 0; r < n; r++) {
      if (r === c) continue
      const k = M[r][c] / M[c][c]
      for (let k2 = c; k2 <= n; k2++) M[r][k2] -= k * M[c][k2]
    }
  }
  return M.map((row, i) => row[n] / row[i])
}
