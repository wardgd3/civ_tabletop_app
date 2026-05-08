const F2 = 0.5 * (Math.sqrt(3) - 1)
const G2 = (3 - Math.sqrt(3)) / 6

const grad = [[1,1],[-1,1],[1,-1],[-1,-1],[1,0],[-1,0],[0,1],[0,-1]]

function dot(g, x, y) { return g[0] * x + g[1] * y }

export function createNoise(seed) {
  const perm = new Uint8Array(512)
  const p = new Uint8Array(256)

  let s = seed | 0
  for (let i = 0; i < 256; i++) {
    s = (s * 1664525 + 1013904223) & 0xffffffff
    p[i] = (s >>> 16) & 255
  }
  for (let i = 0; i < 512; i++) perm[i] = p[i & 255]

  function noise2D(x, y) {
    const s = (x + y) * F2
    const i = Math.floor(x + s)
    const j = Math.floor(y + s)
    const t = (i + j) * G2
    const x0 = x - (i - t)
    const y0 = y - (j - t)

    const i1 = x0 > y0 ? 1 : 0
    const j1 = x0 > y0 ? 0 : 1

    const x1 = x0 - i1 + G2
    const y1 = y0 - j1 + G2
    const x2 = x0 - 1 + 2 * G2
    const y2 = y0 - 1 + 2 * G2

    const ii = i & 255
    const jj = j & 255

    let n0 = 0, n1 = 0, n2 = 0

    let t0 = 0.5 - x0 * x0 - y0 * y0
    if (t0 > 0) {
      t0 *= t0
      const gi = perm[ii + perm[jj]] % 8
      n0 = t0 * t0 * dot(grad[gi], x0, y0)
    }

    let t1 = 0.5 - x1 * x1 - y1 * y1
    if (t1 > 0) {
      t1 *= t1
      const gi = perm[ii + i1 + perm[jj + j1]] % 8
      n1 = t1 * t1 * dot(grad[gi], x1, y1)
    }

    let t2 = 0.5 - x2 * x2 - y2 * y2
    if (t2 > 0) {
      t2 *= t2
      const gi = perm[ii + 1 + perm[jj + 1]] % 8
      n2 = t2 * t2 * dot(grad[gi], x2, y2)
    }

    return 70 * (n0 + n1 + n2)
  }

  function octaves(x, y, count, lacunarity, persistence) {
    let val = 0, amp = 1, freq = 1, max = 0
    for (let i = 0; i < count; i++) {
      val += noise2D(x * freq, y * freq) * amp
      max += amp
      amp *= persistence
      freq *= lacunarity
    }
    return val / max
  }

  return { noise2D, octaves }
}
