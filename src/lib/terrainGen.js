import { createNoise } from './simplex'

export const TERRAIN = {
  OCEAN:           { id: 'ocean',           name: 'Ocean',           color: '#1e4470', darkColor: '#122a45' },
  COAST:           { id: 'coast',           name: 'Coast',           color: '#285a85', darkColor: '#183a55' },
  DESERT:          { id: 'desert',          name: 'Desert',          color: '#6b5c30', darkColor: '#3a3220' },
  PLAINS:          { id: 'plains',          name: 'Plains',          color: '#425a32', darkColor: '#283520' },
  GRASSLAND:       { id: 'grassland',       name: 'Grassland',       color: '#335530', darkColor: '#203520' },
  TUNDRA:          { id: 'tundra',          name: 'Tundra',          color: '#4a5060', darkColor: '#303540' },
  SNOW:            { id: 'snow',            name: 'Snow',            color: '#606870', darkColor: '#404548' },
  HILLS:           { id: 'hills',           name: 'Hills',           color: '#554e38', darkColor: '#353020' },
  MOUNTAIN:        { id: 'mountain',        name: 'Mountain',        color: '#4a3d2e', darkColor: '#2e2518' },
  FOREST:          { id: 'forest',          name: 'Forest',          color: '#264826', darkColor: '#1a301a' },
  JUNGLE:          { id: 'jungle',          name: 'Jungle',          color: '#1e4a1e', darkColor: '#163016' },
  LAKE:            { id: 'lake',            name: 'Lake',            color: '#1e4470', darkColor: '#122a45' },
  RIVER:           { id: 'river',           name: 'River',           color: '#1e4470', darkColor: '#122a45' },
  SAND:            { id: 'sand',            name: 'Sand',            color: '#807550', darkColor: '#554d34' },
  VOID:            { id: 'void',            name: 'Void',            color: '#0d1117', darkColor: '#0d1117' },
  NEBULA:          { id: 'nebula',          name: 'Nebula',          color: '#1a1035', darkColor: '#0e0820' },
  NEBULA_CORE:     { id: 'nebula_core',     name: 'Nebula Core',     color: '#3a1848', darkColor: '#200e30' },
  NEBULA_BRIGHT:   { id: 'nebula_bright',   name: 'Nebula Core',     color: '#5a2868', darkColor: '#351545' },
  ASTEROID:        { id: 'asteroid',        name: 'Asteroid',        color: '#3a3228', darkColor: '#252018' },
  LARGE_ASTEROID:  { id: 'large_asteroid',  name: 'Large Asteroid',  color: '#4a4238', darkColor: '#302a20' },
  STAR:            { id: 'star',            name: 'Star',            color: '#d4b840', darkColor: '#8a7828' },
  DUST:            { id: 'dust',            name: 'Dust Cloud',      color: '#121620', darkColor: '#0d1117' },
  SPACE:           { id: 'space',           name: 'Space',           color: '#0d1117', darkColor: '#0d1117' },
}

export const RESOURCES = {
  COAL:       { id: 'coal',       name: 'Coal',       icon: 'coal.png',       chance: 0.04 },
  IRON:       { id: 'iron',       name: 'Iron',       icon: 'iron.png',       chance: 0.02 },
  URANIUM:    { id: 'uranium',    name: 'Uranium',    icon: 'uranium.png',    chance: 0.002 },
  TRITIUM:    { id: 'tritium',    name: 'Tritium',    icon: 'tritium.png',    chance: 0.001 },
  ALUMINUM:   { id: 'aluminum',   name: 'Aluminum',   icon: 'aluminum.png',   chance: 0.01 },
}

export const LUXURY_RESOURCES = {
  AMETHYST:   { id: 'amethyst',   name: 'Amethyst',   icon: 'amethyst.png',   chance: 0.45, yield: 2 },
  SAPPHIRE:   { id: 'sapphire',   name: 'Sapphire',   icon: 'sapphire.png',   chance: 0.60, yield: 2 },
  RUBY:       { id: 'ruby',       name: 'Ruby',       icon: 'ruby.png',       chance: 0.30, yield: 4 },
  DIAMOND:    { id: 'diamond',    name: 'Diamond',    icon: 'diamond.png',    chance: 0.10, yield: 6 },
}

export const SPACE_RESOURCES = {
  TRITIUM:       { id: 'tritium',       name: 'Tritium',       icon: 'tritium.png',       chance: 0.09, largeChance: 0.45 },
  ALUMINUM:      { id: 'aluminum',      name: 'Aluminum',      icon: 'aluminum.png',      chance: 0.18, largeChance: 0.27 },
  QUASICRYSTAL:  { id: 'quasicrystal',  name: 'Quasicrystal',  icon: 'quasicrystals.png', chance: 0.015, largeChance: 0.10 },
}

function seededRandom(seed) {
  let s = seed | 0
  return () => {
    s = (s * 1664525 + 1013904223) & 0x7fffffff
    return s / 0x7fffffff
  }
}

export function generateTerrain(rows, cols, seed) {
  const noise = createNoise(seed)
  const rand = seededRandom(seed)
  const tiles = []

  const elevMap = []
  const moistMap = []
  const tempMap = []

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const nx = c / cols
      const ny = r / rows

      let elev = noise.octaves(nx * 6, ny * 6, 4, 2.0, 0.5)
      const edgeDistX = Math.min(c, cols - 1 - c) / (cols * 0.15)
      const edgeDistY = Math.min(r, rows - 1 - r) / (rows * 0.15)
      const edgeFalloff = Math.min(1, Math.min(edgeDistX, edgeDistY))
      elev = elev * edgeFalloff

      const moist = noise.octaves(nx * 5 + 100, ny * 5 + 100, 3, 2.0, 0.5)

      const latNorm = Math.abs(r / rows - 0.5) * 2
      const temp = 1 - latNorm + noise.octaves(nx * 3 + 200, ny * 3 + 200, 2, 2.0, 0.5) * 0.3

      elevMap.push(elev)
      moistMap.push(moist)
      tempMap.push(temp)
    }
  }

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const idx = r * cols + c
      const elev = elevMap[idx]
      const moist = moistMap[idx]
      const temp = tempMap[idx]

      let terrain
      if (elev > 0.6) {
        terrain = TERRAIN.MOUNTAIN
      } else if (elev > 0.4) {
        terrain = TERRAIN.HILLS
      } else if (temp < 0.2) {
        terrain = TERRAIN.SNOW
      } else if (temp < 0.35) {
        terrain = TERRAIN.TUNDRA
      } else if (temp > 0.75 && moist < -0.1) {
        terrain = TERRAIN.DESERT
      } else if (temp > 0.65 && moist > 0.2) {
        terrain = TERRAIN.JUNGLE
      } else if (moist > 0.25) {
        terrain = TERRAIN.FOREST
      } else if (moist > -0.1) {
        terrain = TERRAIN.GRASSLAND
      } else {
        terrain = TERRAIN.PLAINS
      }

      tiles.push({
        row: r,
        col: c,
        terrain: terrain.id,
        resource: null,
        hasRiver: false,
      })
    }
  }

  generateMountainRanges(tiles, rows, cols, rand)
  const mainRiver = generateMainRiver(tiles, rows, cols, elevMap, rand)
  generateRivers(tiles, rows, cols, elevMap, rand)
  generateLargeLake(tiles, rows, cols, elevMap, rand, mainRiver)
  generateLakes(tiles, rows, cols, elevMap, moistMap)
  placeSandBanks(tiles, rows, cols, rand)
  placeResources(tiles, rows, cols, rand)

  return tiles
}

function generateMountainRanges(tiles, rows, cols, rand) {
  const tileAt = (r, c) => tiles[r * cols + c]
  const allMountains = new Set()
  const rangeCount = 3 + Math.floor(rand() * 2)

  for (let i = 0; i < rangeCount; i++) {
    let sr, sc, attempts = 0
    do {
      sr = 3 + Math.floor(rand() * (rows - 6))
      sc = 3 + Math.floor(rand() * (cols - 6))
      attempts++
    } while (attempts < 80 && allMountains.has(`${sr}-${sc}`))
    if (attempts >= 80) continue

    const length = 10 + Math.floor(rand() * 10)
    const chain = [[sr, sc]]
    allMountains.add(`${sr}-${sc}`)
    let cr = sr, cc = sc
    let dirR = rand() < 0.5 ? -1 : 1
    let dirC = rand() < 0.5 ? -1 : 1

    for (let step = 1; step < length; step++) {
      if (rand() < 0.3) {
        if (rand() < 0.5) dirR = dirR === 0 ? (rand() < 0.5 ? -1 : 1) : (rand() < 0.3 ? 0 : -dirR)
        else dirC = dirC === 0 ? (rand() < 0.5 ? -1 : 1) : (rand() < 0.3 ? 0 : -dirC)
      }

      const neighbors = hexNeighbors(cr, cc, rows, cols)
      const scored = neighbors
        .filter(([nr, nc]) => nr >= 2 && nr < rows - 2 && nc >= 2 && nc < cols - 2 && !allMountains.has(`${nr}-${nc}`))
        .map(([nr, nc]) => {
          const dr = nr - cr, dc = nc - cc
          let score = 0
          if (dirR !== 0 && Math.sign(dr) === dirR) score += 2
          if (dirC !== 0 && Math.sign(dc) === dirC) score += 2
          if (dirR === 0 && dr === 0) score += 1
          if (dirC === 0 && dc === 0) score += 1
          score += rand() * 1.5
          return { r: nr, c: nc, score }
        })

      if (scored.length === 0) break
      scored.sort((a, b) => b.score - a.score)
      const pick = scored[0]
      cr = pick.r
      cc = pick.c
      chain.push([cr, cc])
      allMountains.add(`${cr}-${cc}`)
    }

    if (chain.length < 4) {
      for (const [r, c] of chain) allMountains.delete(`${r}-${c}`)
      continue
    }

    for (const [r, c] of chain) {
      tileAt(r, c).terrain = 'mountain'
    }

    let widened = 0
    for (let j = 2; j < chain.length - 2; j += 3) {
      if (widened >= 3 && rand() < 0.5) continue
      const [mr, mc] = chain[j]
      const neighbors = hexNeighbors(mr, mc, rows, cols)
      const picks = neighbors.filter(([nr, nc]) =>
        !allMountains.has(`${nr}-${nc}`) && nr >= 2 && nr < rows - 2 && nc >= 2 && nc < cols - 2
      )
      if (picks.length > 0) {
        const [wr, wc] = picks[Math.floor(rand() * picks.length)]
        tileAt(wr, wc).terrain = 'mountain'
        allMountains.add(`${wr}-${wc}`)
        widened++
      }
    }
  }
}

function hexNeighbors(r, c, rows, cols) {
  const odd = r & 1
  const dirs = odd
    ? [[-1,0],[-1,1],[0,1],[1,1],[1,0],[0,-1]]
    : [[-1,-1],[-1,0],[0,1],[1,0],[1,-1],[0,-1]]
  const result = []
  for (const [dr, dc] of dirs) {
    const nr = r + dr, nc = c + dc
    if (nr >= 0 && nr < rows && nc >= 0 && nc < cols) result.push([nr, nc])
  }
  return result
}

function generateMainRiver(tiles, rows, cols, elevMap, rand) {
  const tileAt = (r, c) => tiles[r * cols + c]
  const key = (r, c) => r * cols + c
  const isLand = (r, c) => {
    const t = tileAt(r, c).terrain
    return t !== 'mountain'
  }

  const topEdge = [], bottomEdge = [], leftEdge = [], rightEdge = []
  for (let c = 0; c < cols; c++) {
    if (isLand(0, c)) topEdge.push([0, c])
    if (isLand(rows - 1, c)) bottomEdge.push([rows - 1, c])
  }
  for (let r = 0; r < rows; r++) {
    if (isLand(r, 0)) leftEdge.push([r, 0])
    if (isLand(r, cols - 1)) rightEdge.push([r, cols - 1])
  }

  const pairs = []
  if (leftEdge.length > 0 && rightEdge.length > 0) pairs.push([leftEdge, rightEdge])
  if (topEdge.length > 0 && bottomEdge.length > 0) pairs.push([topEdge, bottomEdge])
  if (pairs.length === 0) return

  const [sideA, sideB] = pairs[Math.floor(rand() * pairs.length)]
  const [sr, sc] = sideA[Math.floor(rand() * sideA.length)]
  const [er, ec] = sideB[Math.floor(rand() * sideB.length)]

  const noiseScale = 0.15
  const wanderStrength = 6

  const INF = 1e9
  const dist = new Float64Array(rows * cols).fill(INF)
  const prev = new Int32Array(rows * cols).fill(-1)
  dist[key(sr, sc)] = 0

  const heap = [[0, sr, sc]]
  while (heap.length > 0) {
    heap.sort((a, b) => a[0] - b[0])
    const [d, cr, cc] = heap.shift()
    if (cr === er && cc === ec) break
    if (d > dist[key(cr, cc)]) continue

    for (const [nr, nc] of hexNeighbors(cr, cc, rows, cols)) {
      const t = tileAt(nr, nc).terrain
      let cost = 1
      if (t === 'mountain') cost = 12
      else if (t === 'hills') cost = 3

      const seed1 = Math.sin(nr * 7.3 + nc * 13.7) * 43758.5453
      const wander = (Math.sin(seed1 + nr * noiseScale + nc * noiseScale * 2.3) + 1) * wanderStrength
      cost += wander

      const nd = d + cost
      if (nd < dist[key(nr, nc)]) {
        dist[key(nr, nc)] = nd
        prev[key(nr, nc)] = key(cr, cc)
        heap.push([nd, nr, nc])
      }
    }
  }

  if (dist[key(er, ec)] >= INF) return

  const path = []
  let cur = key(er, ec)
  while (cur !== -1) {
    const r = Math.floor(cur / cols)
    const c = cur % cols
    path.push([r, c])
    cur = prev[cur]
  }
  path.reverse()

  const riverTiles = new Set(path.map(([r, c]) => `${r}-${c}`))

  for (const [r, c] of path) {
    tileAt(r, c).terrain = 'river'
    tileAt(r, c).hasRiver = true
  }

  const sideChoices = []
  for (let i = 0; i < path.length; i++) {
    const [r, c] = path[i]
    const prev = i > 0 ? path[i - 1] : path[i]
    const next = i < path.length - 1 ? path[i + 1] : path[i]
    const dr = next[0] - prev[0]
    const dc = next[1] - prev[1]
    const perpR = -dc
    const perpC = dr

    const neighbors = hexNeighbors(r, c, rows, cols)
    let bestSame = null, bestSameScore = -1e9
    let bestOpp = null, bestOppScore = -1e9

    for (const [nr, nc] of neighbors) {
      if (riverTiles.has(`${nr}-${nc}`)) continue
      const dot = (nr - r) * perpR + (nc - c) * perpC
      const score = dot
      if (dot >= 0) {
        if (score > bestSameScore) { bestSameScore = score; bestSame = [nr, nc] }
      } else {
        if (-score > bestOppScore) { bestOppScore = -score; bestOpp = [nr, nc] }
      }
    }
    sideChoices.push({ same: bestSame, opp: bestOpp })
  }

  let prevChoice = null
  for (let i = 0; i < path.length; i++) {
    const pick = sideChoices[i]
    const is3Wide = rand() < 0.1

    let chosen = pick.same || pick.opp
    if (prevChoice && pick.same) {
      const [pr, pc] = prevChoice
      const ds = pick.same ? Math.abs(pick.same[0] - pr) + Math.abs(pick.same[1] - pc) : 99
      const dopp = pick.opp ? Math.abs(pick.opp[0] - pr) + Math.abs(pick.opp[1] - pc) : 99
      chosen = ds <= dopp ? pick.same : (pick.opp || pick.same)
    }

    if (chosen) {
      const [br, bc] = chosen
      if (!riverTiles.has(`${br}-${bc}`)) {
        tileAt(br, bc).terrain = 'river'
        tileAt(br, bc).hasRiver = true
        riverTiles.add(`${br}-${bc}`)
      }
      prevChoice = chosen

      if (is3Wide) {
        const opp = chosen === pick.same ? pick.opp : pick.same
        if (opp && !riverTiles.has(`${opp[0]}-${opp[1]}`)) {
          tileAt(opp[0], opp[1]).terrain = 'river'
          tileAt(opp[0], opp[1]).hasRiver = true
          riverTiles.add(`${opp[0]}-${opp[1]}`)
        }
      }
    }
  }

  return { path, riverTiles }
}

function generateRivers(tiles, rows, cols, elevMap, rand) {
  const tileAt = (r, c) => tiles[r * cols + c]
  const elevAt = (r, c) => elevMap[r * cols + c]
  const riverCount = Math.floor(rows * cols * 0.008)

  for (let i = 0; i < riverCount; i++) {
    let startR, startC, attempts = 0
    do {
      startR = Math.floor(rand() * rows)
      startC = Math.floor(rand() * cols)
      attempts++
    } while (attempts < 100 && (elevAt(startR, startC) < 0.2 || elevAt(startR, startC) > 0.65))

    if (attempts >= 100) continue

    let cr = startR, cc = startC
    const visited = new Set()
    for (let step = 0; step < 60; step++) {
      const key = `${cr}-${cc}`
      if (visited.has(key)) break
      visited.add(key)

      const tile = tileAt(cr, cc)
      tile.hasRiver = true

      const neighbors = hexNeighbors(cr, cc, rows, cols)
      let lowest = elevAt(cr, cc)
      let next = null
      for (const [nr, nc] of neighbors) {
        const ne = elevAt(nr, nc)
        if (ne < lowest) {
          lowest = ne
          next = [nr, nc]
        }
      }
      if (!next) break
      cr = next[0]
      cc = next[1]
    }
  }
}

function generateLargeLake(tiles, rows, cols, elevMap, rand, mainRiver) {
  if (!mainRiver) return
  const { path, riverTiles } = mainRiver
  const tileAt = (r, c) => tiles[r * cols + c]
  const key = (r, c) => r * cols + c

  const mid = Math.floor(path.length * (0.3 + rand() * 0.4))
  const [anchorR, anchorC] = path[mid]

  const prev = mid > 0 ? path[mid - 1] : path[mid]
  const next = mid < path.length - 1 ? path[mid + 1] : path[mid]
  const dr = next[0] - prev[0]
  const dc = next[1] - prev[1]
  const perpR = -dc
  const perpC = dr
  const side = rand() < 0.5 ? 1 : -1

  let lakeCenter = null
  let bestDist = 0
  for (let step = 3; step <= 6; step++) {
    const tr = Math.round(anchorR + perpR * side * step)
    const tc = Math.round(anchorC + perpC * side * step)
    if (tr < 4 || tr >= rows - 4 || tc < 4 || tc >= cols - 4) continue
    const t = tileAt(tr, tc).terrain
    if (t === 'river' || t === 'mountain') continue
    lakeCenter = [tr, tc]
    bestDist = step
    break
  }
  if (!lakeCenter) return

  const [lr, lc] = lakeCenter
  const targetSize = 20 + Math.floor(rand() * 13)
  const lakeTiles = [[lr, lc]]
  const lakeSet = new Set([`${lr}-${lc}`])

  for (let i = 0; i < lakeTiles.length && lakeTiles.length < targetSize; i++) {
    const neighbors = hexNeighbors(lakeTiles[i][0], lakeTiles[i][1], rows, cols)
    for (const [nr, nc] of neighbors) {
      if (lakeTiles.length >= targetSize) break
      const k = `${nr}-${nc}`
      if (lakeSet.has(k) || riverTiles.has(k)) continue
      if (nr < 3 || nr >= rows - 3 || nc < 3 || nc >= cols - 3) continue
      const t = tileAt(nr, nc).terrain
      if (t === 'river' || t === 'mountain') continue
      const distFromCenter = Math.abs(nr - lr) + Math.abs(nc - lc)
      if (distFromCenter > 4) continue
      lakeSet.add(k)
      lakeTiles.push([nr, nc])
    }
  }

  for (const [r, c] of lakeTiles) {
    tileAt(r, c).terrain = 'lake'
  }

  const branchLen = bestDist + 1
  let cr = anchorR, cc = anchorC
  for (let step = 0; step < branchLen; step++) {
    const neighbors = hexNeighbors(cr, cc, rows, cols)
    let bestN = null, bestScore = -1e9
    for (const [nr, nc] of neighbors) {
      if (riverTiles.has(`${nr}-${nc}`)) continue
      const distToLake = Math.abs(nr - lr) + Math.abs(nc - lc)
      const score = -distToLake
      if (score > bestScore) { bestScore = score; bestN = [nr, nc] }
    }
    if (!bestN) break
    const [br, bc] = bestN
    if (lakeSet.has(`${br}-${bc}`)) {
      tileAt(br, bc).terrain = 'river'
      tileAt(br, bc).hasRiver = true
      break
    }
    tileAt(br, bc).terrain = 'river'
    tileAt(br, bc).hasRiver = true
    riverTiles.add(`${br}-${bc}`)
    cr = br
    cc = bc
  }
}

function generateLakes(tiles, rows, cols, elevMap, moistMap) {
  const tileAt = (r, c) => tiles[r * cols + c]
  const used = new Set()

  const candidates = []
  for (let r = 4; r < rows - 4; r++) {
    for (let c = 4; c < cols - 4; c++) {
      const idx = r * cols + c
      const tile = tileAt(r, c)
      if (tile.terrain === 'mountain' || tile.terrain === 'river' || tile.terrain === 'lake') continue
      if (elevMap[idx] > -0.05 && elevMap[idx] < 0.15 && moistMap[idx] > 0.25) {
        const neighbors = hexNeighbors(r, c, rows, cols)
        let nearWater = false
        for (const [nr, nc] of neighbors) {
          const nt = tileAt(nr, nc).terrain
          if (nt === 'river' || nt === 'lake') { nearWater = true; break }
          for (const [nnr, nnc] of hexNeighbors(nr, nc, rows, cols)) {
            const nnt = tileAt(nnr, nnc).terrain
            if (nnt === 'river' || nnt === 'lake') { nearWater = true; break }
          }
          if (nearWater) break
        }
        if (!nearWater) candidates.push([r, c])
      }
    }
  }

  let placed = 0
  for (const [sr, sc] of candidates) {
    if (placed >= 2) break
    if (used.has(`${sr}-${sc}`)) continue

    const targetSize = 4 + Math.floor(Math.abs(moistMap[sr * cols + sc]) * 13)
    const clampedSize = Math.min(16, Math.max(4, targetSize))
    const cluster = [[sr, sc]]
    used.add(`${sr}-${sc}`)

    for (let i = 0; i < cluster.length && cluster.length < clampedSize; i++) {
      const neighbors = hexNeighbors(cluster[i][0], cluster[i][1], rows, cols)
      for (const [nr, nc] of neighbors) {
        if (cluster.length >= clampedSize) break
        const k = `${nr}-${nc}`
        if (used.has(k)) continue
        const t = tileAt(nr, nc).terrain
        if (t === 'mountain' || t === 'river' || t === 'lake') continue
        const nn = hexNeighbors(nr, nc, rows, cols)
        const touchesWater = nn.some(([wr, wc]) => {
          const wt = tileAt(wr, wc).terrain
          return wt === 'river' || wt === 'lake'
        })
        if (touchesWater) continue
        const minR = Math.min(sr, nr), maxR = Math.max(sr, nr)
        const minC = Math.min(sc, nc), maxC = Math.max(sc, nc)
        let spanR = maxR - minR + 1, spanC = maxC - minC + 1
        for (const [er, ec] of cluster) {
          spanR = Math.max(spanR, Math.abs(er - nr) + 1)
          spanC = Math.max(spanC, Math.abs(ec - nc) + 1)
        }
        if (spanR > 4 || spanC > 4) continue
        used.add(k)
        cluster.push([nr, nc])
      }
    }

    if (cluster.length >= 4) {
      for (const [lr, lc] of cluster) tileAt(lr, lc).terrain = 'lake'
      placed++
    }
  }
}

function placeSandBanks(tiles, rows, cols, rand) {
  const WATER = new Set(['river', 'lake'])
  const tileAt = (r, c) => tiles[r * cols + c]

  const waterAdj = []
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const t = tileAt(r, c).terrain
      if (WATER.has(t) || t === 'mountain') continue
      const neighbors = hexNeighbors(r, c, rows, cols)
      const touchesWater = neighbors.some(([nr, nc]) => WATER.has(tileAt(nr, nc).terrain))
      if (touchesWater) waterAdj.push([r, c])
    }
  }

  if (waterAdj.length === 0) return

  for (let i = waterAdj.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [waterAdj[i], waterAdj[j]] = [waterAdj[j], waterAdj[i]]
  }

  const sandSet = new Set()
  const bankCount = 3 + Math.floor(rand() * 2)
  const bankSize = 5 + Math.floor(rand() * 4)

  for (let b = 0; b < bankCount && waterAdj.length > 0; b++) {
    let startIdx = -1
    for (let i = 0; i < waterAdj.length; i++) {
      const [r, c] = waterAdj[i]
      if (!sandSet.has(`${r}-${c}`)) { startIdx = i; break }
    }
    if (startIdx === -1) break

    const [sr, sc] = waterAdj[startIdx]
    const bank = [[sr, sc]]
    sandSet.add(`${sr}-${sc}`)

    for (let step = 0; step < bankSize && bank.length < bankSize; step++) {
      const [cr, cc] = bank[bank.length - 1]
      const neighbors = hexNeighbors(cr, cc, rows, cols)
      const candidates = neighbors.filter(([nr, nc]) => {
        if (sandSet.has(`${nr}-${nc}`)) return false
        const nt = tileAt(nr, nc).terrain
        if (WATER.has(nt) || nt === 'mountain') return false
        const nn = hexNeighbors(nr, nc, rows, cols)
        return nn.some(([nnr, nnc]) => WATER.has(tileAt(nnr, nnc).terrain))
      })
      if (candidates.length === 0) break
      const [nr, nc] = candidates[Math.floor(rand() * candidates.length)]
      bank.push([nr, nc])
      sandSet.add(`${nr}-${nc}`)
    }

    if (bank.length < 2) {
      for (const [r, c] of bank) sandSet.delete(`${r}-${c}`)
      continue
    }

    for (const [r, c] of bank) {
      tileAt(r, c).terrain = 'sand'
    }
  }
}

function placeResources(tiles, rows, cols, rand) {
  const resourceList = Object.values(RESOURCES)
  for (const tile of tiles) {
    if (tile.resource) continue
    if (tile.terrain === 'mountain' || tile.terrain === 'river' || tile.terrain === 'lake' || tile.terrain === 'ocean') continue
    for (const res of resourceList) {
      if (rand() < res.chance) {
        tile.resource = res.id
        tile.oreAmount = 2 + Math.floor(rand() * 4)
        break
      }
    }
  }

  const luxuryList = Object.values(LUXURY_RESOURCES)
  const totalWeight = luxuryList.reduce((s, r) => s + r.chance, 0)
  const targetCount = Math.floor(rows * cols * 0.015)
  const eligible = tiles.filter(t => !t.resource && t.terrain !== 'mountain' && t.terrain !== 'river' && t.terrain !== 'lake' && t.terrain !== 'ocean')
  for (let i = eligible.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [eligible[i], eligible[j]] = [eligible[j], eligible[i]]
  }
  const toPlace = Math.min(targetCount, eligible.length)
  for (let i = 0; i < toPlace; i++) {
    let roll = rand() * totalWeight
    let picked = luxuryList[luxuryList.length - 1]
    for (const res of luxuryList) {
      roll -= res.chance
      if (roll <= 0) { picked = res; break }
    }
    eligible[i].resource = picked.id
  }
}

function placeSpaceResources(tiles, rand) {
  const ores = Object.values(SPACE_RESOURCES)
  for (const tile of tiles) {
    if (tile.terrain !== 'asteroid' && tile.terrain !== 'large_asteroid') continue
    const isLarge = tile.terrain === 'large_asteroid'
    const roll = rand()
    let cumulative = 0
    for (const ore of ores) {
      const chance = isLarge ? ore.largeChance : ore.chance
      cumulative += chance
      if (roll < cumulative) {
        tile.resource = ore.id
        tile.oreAmount = 2 + Math.floor(rand() * 4)
        break
      }
    }
  }
}

export function generateSpaceTerrain(rows, cols, seed) {
  const noise = createNoise(seed + 9999)
  const rand = seededRandom(seed + 9999)
  const tiles = []
  const tileAt = (r, c) => tiles[r * cols + c]

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const nx = c / cols
      const ny = r / rows

      const density = noise.octaves(nx * 5, ny * 5, 3, 2.0, 0.5)
      const nebula = noise.octaves(nx * 1.8 + 50, ny * 1.8 + 50, 3, 2.0, 0.5)

      let terrain
      if (density > 0.55 && rand() < 0.25) {
        terrain = TERRAIN.ASTEROID
      } else if (nebula > 0.45) {
        terrain = TERRAIN.NEBULA_BRIGHT
      } else if (nebula > 0.35) {
        terrain = TERRAIN.NEBULA_CORE
      } else if (nebula > 0.2) {
        terrain = TERRAIN.NEBULA
      } else {
        terrain = TERRAIN.VOID
      }

      tiles.push({
        row: r,
        col: c,
        terrain: terrain.id,
        resource: null,
        hasRiver: false,
      })
    }
  }

  // Ensure bright cores have at least 2 tiles of darker nebula around them
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const t = tileAt(r, c)
      if (t.terrain !== 'nebula_bright' && t.terrain !== 'nebula_core') continue
      const ring1 = hexNeighbors(r, c, rows, cols)
      for (const [nr, nc] of ring1) {
        const nt = tileAt(nr, nc)
        if (nt.terrain === 'void' || nt.terrain === 'dust') {
          nt.terrain = 'nebula_core'
        }
        const ring2 = hexNeighbors(nr, nc, rows, cols)
        for (const [nr2, nc2] of ring2) {
          const nt2 = tileAt(nr2, nc2)
          if (nt2.terrain === 'void' || nt2.terrain === 'dust') {
            nt2.terrain = 'nebula'
          }
        }
      }
    }
  }

  // Place 3-4 large asteroid clusters
  const clusterCount = 3 + (rand() < 0.5 ? 1 : 0)
  for (let i = 0; i < clusterCount; i++) {
    const cr = 4 + Math.floor(rand() * (rows - 8))
    const cc = 4 + Math.floor(rand() * (cols - 8))
    const clusterSize = 12 + Math.floor(rand() * 10)
    const cluster = [[cr, cc]]
    const used = new Set([`${cr}-${cc}`])

    for (let step = 0; step < clusterSize && cluster.length < clusterSize; step++) {
      const [sr, sc] = cluster[Math.floor(rand() * cluster.length)]
      const neighbors = hexNeighbors(sr, sc, rows, cols)
      const candidates = neighbors.filter(([nr, nc]) => !used.has(`${nr}-${nc}`))
      if (candidates.length === 0) continue
      const [nr, nc] = candidates[Math.floor(rand() * candidates.length)]
      used.add(`${nr}-${nc}`)
      cluster.push([nr, nc])
    }

    for (const [ar, ac] of cluster) {
      const t = tileAt(ar, ac)
      if (rand() < 0.35) {
        t.terrain = 'large_asteroid'
      } else {
        t.terrain = 'asteroid'
      }
    }
  }

  // Place 4-8 stars scattered across the map
  const starCount = 4 + Math.floor(rand() * 5)
  for (let i = 0; i < starCount; i++) {
    const sr = 3 + Math.floor(rand() * (rows - 6))
    const sc = 3 + Math.floor(rand() * (cols - 6))
    const t = tileAt(sr, sc)
    if (t.terrain === 'asteroid' || t.terrain === 'large_asteroid') continue
    t.terrain = 'star'
  }

  placeSpaceResources(tiles, rand)

  const centerR = Math.floor(rows / 2)
  const centerC = Math.floor(cols / 2)
  const guildR = centerR - 5 + Math.floor(rand() * 10)
  const guildC = centerC - 5 + Math.floor(rand() * 10)
  const guildTile = tileAt(
    Math.max(0, Math.min(rows - 1, guildR)),
    Math.max(0, Math.min(cols - 1, guildC))
  )
  guildTile.resource = 'space_guild'
  guildTile.terrain = 'void'

  return tiles
}
