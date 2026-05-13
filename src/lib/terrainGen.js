import { createNoise } from './simplex'

export const TERRAIN = {
  OCEAN:           { id: 'ocean',           name: 'Ocean',           color: '#18365a', darkColor: '#0e2237' },
  COAST:           { id: 'coast',           name: 'Coast',           color: '#20486a', darkColor: '#132e44' },
  DESERT:          { id: 'desert',          name: 'Desert',          color: '#6b5c30', darkColor: '#3a3220' },
  PLAINS:          { id: 'plains',          name: 'Plains',          color: '#425a32', darkColor: '#283520' },
  GRASSLAND:       { id: 'grassland',       name: 'Grassland',       color: '#335530', darkColor: '#203520' },
  TUNDRA:          { id: 'tundra',          name: 'Tundra',          color: '#4a5e6e', darkColor: '#303d48' },
  SNOW:            { id: 'snow',            name: 'Snow',            color: '#96a0aa', darkColor: '#62686e' },
  HILLS:           { id: 'hills',           name: 'Hills',           color: '#554e38', darkColor: '#353020' },
  MOUNTAIN:        { id: 'mountain',        name: 'Mountain',        color: '#504840', darkColor: '#332e28' },
  FOREST:          { id: 'forest',          name: 'Forest',          color: '#1e3a1e', darkColor: '#152615' },
  JUNGLE:          { id: 'jungle',          name: 'Jungle',          color: '#183b18', darkColor: '#112611' },
  LAKE:            { id: 'lake',            name: 'Lake',            color: '#18365a', darkColor: '#0e2237' },
  RIVER:           { id: 'river',           name: 'River',           color: '#18365a', darkColor: '#0e2237' },
  SAND:            { id: 'sand',            name: 'Sand',            color: '#807550', darkColor: '#554d34' },
  VOID:            { id: 'void',            name: 'Void',            color: '#090d10', darkColor: '#090d10' },
  NEBULA:          { id: 'nebula',          name: 'Nebula',          color: '#1a0c22', darkColor: '#100614' },
  NEBULA_CORE:     { id: 'nebula_core',     name: 'Nebula Core',     color: '#381230', darkColor: '#220a1c' },
  NEBULA_BRIGHT:   { id: 'nebula_bright',   name: 'Nebula Bright',   color: '#561e42', darkColor: '#34102a' },
  NEBULA_HOTSPOT:  { id: 'nebula_hotspot',  name: 'Nebula Hotspot',  color: '#8a3858', darkColor: '#5a2034' },
  ASTEROID:        { id: 'asteroid',        name: 'Asteroid',        color: '#3a3228', darkColor: '#252018' },
  LARGE_ASTEROID:  { id: 'large_asteroid',  name: 'Large Asteroid',  color: '#4a4238', darkColor: '#302a20' },
  BG_ASTEROID:     { id: 'bg_asteroid',     name: 'Background Asteroid', color: '#1a1610', darkColor: '#12100a' },
  STAR:            { id: 'star',            name: 'Star',            color: '#e8e0c8', darkColor: '#a09880' },
  DUST:            { id: 'dust',            name: 'Dust Cloud',      color: '#0e121a', darkColor: '#0a0e12' },
  SPACE:           { id: 'space',           name: 'Space',           color: '#0a0e12', darkColor: '#0a0e12' },
  CRATER_OUTER:    { id: 'crater_outer',    name: 'Crater Rim',      color: '#4a5258', darkColor: '#333a3e' },
  CRATER_INNER:    { id: 'crater_inner',    name: 'Crater',           color: '#5c6468', darkColor: '#3e474b' },
}

export const TERRAIN_THEMES = {
  default: { id: 'default', name: 'Standard', colors: null },
  crimson_ice: {
    id: 'crimson_ice', name: 'Crimson Ice World',
    colors: {
      ocean:     { color: '#6b1a2a', darkColor: '#40101a' },
      coast:     { color: '#8a2535', darkColor: '#521620' },
      desert:    { color: '#6b5c30', darkColor: '#3a3220' },
      plains:    { color: '#4a7080', darkColor: '#2c4350' },
      grassland: { color: '#4a7080', darkColor: '#2c4350' },
      tundra:    { color: '#7a9aaa', darkColor: '#4a5c65' },
      snow:      { color: '#c8dde8', darkColor: '#7a8a92' },
      hills:     { color: '#3a5560', darkColor: '#243438' },
      mountain:  { color: '#2a3840', darkColor: '#1a2228' },
      forest:    { color: '#264826', darkColor: '#1a301a' },
      jungle:    { color: '#1e4a1e', darkColor: '#163016' },
      lake:      { color: '#6b1a2a', darkColor: '#40101a' },
      river:     { color: '#6b1a2a', darkColor: '#40101a' },
      sand:      { color: '#807550', darkColor: '#554d34' },
    },
  },
  fungal: {
    id: 'fungal', name: 'Fungal World',
    colors: {
      ocean:     { color: '#2a1a4a', darkColor: '#18102c' },
      coast:     { color: '#3a2560', darkColor: '#221638' },
      desert:    { color: '#7a3a6a', darkColor: '#4a2240' },
      plains:    { color: '#4a2d5a', darkColor: '#2c1a36' },
      grassland: { color: '#5a2070', darkColor: '#361444' },
      tundra:    { color: '#4a5060', darkColor: '#303540' },
      snow:      { color: '#606870', darkColor: '#404548' },
      hills:     { color: '#3d2248', darkColor: '#24142c' },
      mountain:  { color: '#261535', darkColor: '#180c20' },
      forest:    { color: '#6a1a8a', darkColor: '#401054' },
      jungle:    { color: '#6a1a8a', darkColor: '#401054' },
      lake:      { color: '#2a1a4a', darkColor: '#18102c' },
      river:     { color: '#2a1a4a', darkColor: '#18102c' },
      sand:      { color: '#7a3a6a', darkColor: '#4a2240' },
    },
  },
  volcanic: {
    id: 'volcanic', name: 'Volcanic Hellscape',
    colors: {
      ocean:     { color: '#8a2800', darkColor: '#521800' },
      coast:     { color: '#6a2010', darkColor: '#40140a' },
      desert:    { color: '#5a3a20', darkColor: '#362414' },
      plains:    { color: '#3a2818', darkColor: '#24180e' },
      grassland: { color: '#4a3020', darkColor: '#2c1c14' },
      tundra:    { color: '#4a5060', darkColor: '#303540' },
      snow:      { color: '#606870', darkColor: '#404548' },
      hills:     { color: '#2a1e18', darkColor: '#1a120e' },
      mountain:  { color: '#1a1210', darkColor: '#100a08' },
      forest:    { color: '#6a4010', darkColor: '#40280a' },
      jungle:    { color: '#6a4010', darkColor: '#40280a' },
      lake:      { color: '#8a2800', darkColor: '#521800' },
      river:     { color: '#8a2800', darkColor: '#521800' },
      sand:      { color: '#5a3a20', darkColor: '#362414' },
    },
  },
  crystal_tundra: {
    id: 'crystal_tundra', name: 'Crystal Tundra',
    colors: {
      ocean:     { color: '#083b48', darkColor: '#05232b' },
      coast:     { color: '#084d5a', darkColor: '#052e36' },
      desert:    { color: '#6b5c30', darkColor: '#3a3220' },
      plains:    { color: '#3a7080', darkColor: '#24444e' },
      grassland: { color: '#3a7080', darkColor: '#24444e' },
      tundra:    { color: '#5a9aaa', darkColor: '#365c66' },
      snow:      { color: '#b0d8e0', darkColor: '#6a8288' },
      hills:     { color: '#2a5060', darkColor: '#1a3038' },
      mountain:  { color: '#40464b', darkColor: '#292e32' },
      forest:    { color: '#264826', darkColor: '#1a301a' },
      jungle:    { color: '#1e4a1e', darkColor: '#163016' },
      lake:      { color: '#083b48', darkColor: '#05232b' },
      river:     { color: '#083b48', darkColor: '#05232b' },
      sand:      { color: '#70a8b8', darkColor: '#44666e' },
    },
  },
  acid_marsh: {
    id: 'acid_marsh', name: 'Acid Marsh',
    colors: {
      ocean:     { color: '#1a4a10', darkColor: '#102c0a' },
      coast:     { color: '#2a6018', darkColor: '#1a3a0e' },
      desert:    { color: '#808a20', darkColor: '#4e5414' },
      plains:    { color: '#4a7020', darkColor: '#2c4414' },
      grassland: { color: '#608028', darkColor: '#3a4e18' },
      tundra:    { color: '#4a5060', darkColor: '#303540' },
      snow:      { color: '#606870', darkColor: '#404548' },
      hills:     { color: '#2a3a18', darkColor: '#1a240e' },
      mountain:  { color: '#1a2810', darkColor: '#10180a' },
      forest:    { color: '#3a6010', darkColor: '#243a0a' },
      jungle:    { color: '#3a6010', darkColor: '#243a0a' },
      lake:      { color: '#1a4a10', darkColor: '#102c0a' },
      river:     { color: '#1a4a10', darkColor: '#102c0a' },
      sand:      { color: '#808a20', darkColor: '#4e5414' },
    },
  },
  obsidian_void: {
    id: 'obsidian_void', name: 'Obsidian Void World',
    colors: {
      ocean:     { color: '#1a1040', darkColor: '#100a28' },
      coast:     { color: '#221450', darkColor: '#140c30' },
      desert:    { color: '#483c64', darkColor: '#2d263c' },
      plains:    { color: '#26213c', darkColor: '#191426' },
      grassland: { color: '#322849', darkColor: '#1e192d' },
      tundra:    { color: '#51586a', darkColor: '#353a46' },
      snow:      { color: '#b0b0ca', darkColor: '#6a6a7b' },
      hills:     { color: '#1e1928', darkColor: '#120f19' },
      mountain:  { color: '#a0a0b4', darkColor: '#62626e' },
      forest:    { color: '#305a30', darkColor: '#213c21' },
      jungle:    { color: '#265d26', darkColor: '#1c3c1c' },
      lake:      { color: '#1a1040', darkColor: '#100a28' },
      river:     { color: '#1a1040', darkColor: '#100a28' },
      sand:      { color: '#483c64', darkColor: '#2d263c' },
    },
  },
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
  TRITIUM:       { id: 'tritium',       name: 'Tritium',       icon: 'tritium.png',       chance: 0.0225, largeChance: 0.1125 },
  ALUMINUM:      { id: 'aluminum',      name: 'Aluminum',      icon: 'aluminum.png',      chance: 0.045, largeChance: 0.0675 },
  QUASICRYSTAL:  { id: 'quasicrystal',  name: 'Quasicrystal',  icon: 'quasicrystals.png', chance: 0.0075, largeChance: 0.05 },
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

  const mainRiver = generateMainRiver(tiles, rows, cols, elevMap, rand)
  generateCoastalWaters(tiles, rows, cols, rand, mainRiver)
  generateMountainRanges(tiles, rows, cols, rand, mainRiver)
  generateRivers(tiles, rows, cols, elevMap, rand)
  generateLargeLake(tiles, rows, cols, elevMap, rand, mainRiver)
  generateGreatLake(tiles, rows, cols, rand, mainRiver)
  generateLakes(tiles, rows, cols, elevMap, moistMap)
  placeSandBanks(tiles, rows, cols, rand)
  placeResources(tiles, rows, cols, rand)

  return tiles
}

function generateCoastalWaters(tiles, rows, cols, rand, mainRiver) {
  const tileAt = (r, c) => tiles[r * cols + c]

  if (!mainRiver || !mainRiver.path || mainRiver.path.length === 0) return

  const riverEnd = mainRiver.path[mainRiver.path.length - 1]
  const [endR, endC] = riverEnd

  const distTop = endR
  const distBottom = rows - 1 - endR
  const distLeft = endC
  const distRight = cols - 1 - endC
  const minDist = Math.min(distTop, distBottom, distLeft, distRight)
  let edgeSide
  if (minDist === distTop) edgeSide = 'top'
  else if (minDist === distBottom) edgeSide = 'bottom'
  else if (minDist === distLeft) edgeSide = 'left'
  else edgeSide = 'right'

  const isVerticalEdge = edgeSide === 'left' || edgeSide === 'right'

  let centerR, centerC
  if (isVerticalEdge) {
    centerC = edgeSide === 'right' ? cols - 1 : 0
    const cornerR = endR > rows / 2 ? rows - 1 : 0
    centerR = Math.round(endR * 0.6 + cornerR * 0.4)
  } else {
    centerR = edgeSide === 'bottom' ? rows - 1 : 0
    const cornerC = endC > cols / 2 ? cols - 1 : 0
    centerC = Math.round(endC * 0.6 + cornerC * 0.4)
  }

  const spanAlong = isVerticalEdge
    ? Math.floor(rows * (0.25 + rand() * 0.15))
    : Math.floor(cols * (0.25 + rand() * 0.15))
  const spanDepth = isVerticalEdge
    ? Math.floor(cols * (0.12 + rand() * 0.08))
    : Math.floor(rows * (0.12 + rand() * 0.08))

  const waterSet = new Set()

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      let distAlong, distInward
      if (edgeSide === 'bottom') {
        distAlong = (c - centerC) / spanAlong
        distInward = (rows - 1 - r) / spanDepth
      } else if (edgeSide === 'top') {
        distAlong = (c - centerC) / spanAlong
        distInward = r / spanDepth
      } else if (edgeSide === 'right') {
        distAlong = (r - centerR) / spanAlong
        distInward = (cols - 1 - c) / spanDepth
      } else {
        distAlong = (r - centerR) / spanAlong
        distInward = c / spanDepth
      }
      if (distInward < 0) continue

      const seed1 = Math.sin(r * 5.1 + c * 8.7) * 43758.5453
      const edgeNoise = (seed1 - Math.floor(seed1) - 0.5) * 0.4
      const ellipse = distInward * distInward + distAlong * distAlong + edgeNoise

      if (ellipse < 1) {
        waterSet.add(`${r}-${c}`)
      }
    }
  }

  let [br, bc] = riverEnd
  for (let step = 0; step < 40; step++) {
    if (waterSet.has(`${br}-${bc}`)) break
    waterSet.add(`${br}-${bc}`)
    for (const [nr, nc] of hexNeighbors(br, bc, rows, cols)) {
      waterSet.add(`${nr}-${nc}`)
    }
    const dr = centerR - br
    const dc = centerC - bc
    const len = Math.max(1, Math.abs(dr) + Math.abs(dc))
    br += Math.round(dr / len)
    bc += Math.round(dc / len)
    br = Math.max(0, Math.min(rows - 1, br))
    bc = Math.max(0, Math.min(cols - 1, bc))
  }

  const waterDistFromLand = new Map()
  let landBorder = []
  for (const k of waterSet) {
    const [r, c] = k.split('-').map(Number)
    const touchesLand = hexNeighbors(r, c, rows, cols).some(([nr, nc]) => !waterSet.has(`${nr}-${nc}`))
    if (touchesLand) {
      waterDistFromLand.set(k, 0)
      landBorder.push(k)
    }
  }
  while (landBorder.length > 0) {
    const next = []
    for (const k of landBorder) {
      const d = waterDistFromLand.get(k)
      const [r, c] = k.split('-').map(Number)
      for (const [nr, nc] of hexNeighbors(r, c, rows, cols)) {
        const nk = `${nr}-${nc}`
        if (waterSet.has(nk) && !waterDistFromLand.has(nk)) {
          waterDistFromLand.set(nk, d + 1)
          next.push(nk)
        }
      }
    }
    landBorder = next
  }

  for (const k of waterSet) {
    const [r, c] = k.split('-').map(Number)
    const t = tileAt(r, c).terrain
    if (t === 'river') continue
    const depth = waterDistFromLand.get(k) || 0
    tileAt(r, c).terrain = depth >= 2 ? 'ocean' : 'coast'
  }

  for (const k of waterSet) {
    const [r, c] = k.split('-').map(Number)
    for (const [nr, nc] of hexNeighbors(r, c, rows, cols)) {
      const nk = `${nr}-${nc}`
      if (!waterSet.has(nk)) {
        const t = tileAt(nr, nc).terrain
        if (t !== 'ocean' && t !== 'coast' && t !== 'river' && t !== 'lake') {
          tileAt(nr, nc).terrain = 'coast'
        }
      }
    }
  }
}

function generateMountainRanges(tiles, rows, cols, rand, mainRiver) {
  const tileAt = (r, c) => tiles[r * cols + c]
  const allMountains = new Set()
  const riverSet = mainRiver ? mainRiver.riverTiles : new Set()

  let riverFlowsHorizontal = true
  if (mainRiver && mainRiver.path.length > 1) {
    const first = mainRiver.path[0]
    const last = mainRiver.path[mainRiver.path.length - 1]
    riverFlowsHorizontal = Math.abs(last[1] - first[1]) > Math.abs(last[0] - first[0])
  }

  const rangeCount = 1 + Math.floor(rand() * 2)
  for (let i = 0; i < rangeCount; i++) {
    buildMountainRange(tiles, rows, cols, rand, allMountains, riverSet, riverFlowsHorizontal)
  }
  buildDiagonalMountainRange(tiles, rows, cols, rand, allMountains, riverSet)
}

function buildMountainRange(tiles, rows, cols, rand, allMountains, riverSet, _riverFlowsHorizontal) {
  const tileAt = (r, c) => tiles[r * cols + c]

  // Mountains flow mostly horizontal (left to right) with volatile curves
  const sr = Math.floor(rows * (0.15 + rand() * 0.7))
  const sc = 0

  const isGoal = (_r, c) => c === cols - 1

  const noiseScale = 0.25
  const wanderStrength = 8

  const key = (r, c) => r * cols + c
  const INF = 1e9
  const dist = new Float64Array(rows * cols).fill(INF)
  const prev = new Int32Array(rows * cols).fill(-1)
  dist[key(sr, sc)] = 0

  let goalKey = -1
  const heap = [[0, sr, sc]]
  while (heap.length > 0) {
    heap.sort((a, b) => a[0] - b[0])
    const [d, cr, cc] = heap.shift()
    if (isGoal(cr, cc)) { goalKey = key(cr, cc); break }
    if (d > dist[key(cr, cc)]) continue

    for (const [nr, nc] of hexNeighbors(cr, cc, rows, cols)) {
      const t = tileAt(nr, nc).terrain
      let cost = 1
      const WATER = ['river', 'lake', 'ocean', 'coast']
      if (WATER.includes(t)) cost = 50
      // Also penalize tiles adjacent to water
      const adjWater = hexNeighbors(nr, nc, rows, cols).some(([wr, wc]) => WATER.includes(tileAt(wr, wc).terrain))
      if (adjWater) cost += 20

      const seed1 = Math.sin(nr * 5.7 + nc * 9.3) * 43758.5453
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

  if (goalKey === -1) return

  const path = []
  let cur = goalKey
  while (cur !== -1) {
    const r = Math.floor(cur / cols)
    const c = cur % cols
    path.push([r, c])
    cur = prev[cur]
  }
  path.reverse()

  // Place 4-6 gaps (passes) through the range, 2-3 tiles wide
  const gapCount = 4 + Math.floor(rand() * 3)
  const gapIndices = new Set()
  for (let g = 0; g < gapCount; g++) {
    const gapCenter = Math.floor(path.length * (0.08 + rand() * 0.84))
    const gapSize = 2 + Math.floor(rand() * 2)
    for (let offset = -gapSize; offset <= gapSize; offset++) {
      const idx = gapCenter + offset
      if (idx >= 0 && idx < path.length) gapIndices.add(idx)
    }
  }

  // Compute distance to nearest gap for each path index (for tapering)
  const distToGap = new Array(path.length).fill(Infinity)
  for (const gi of gapIndices) {
    for (let i = 0; i < path.length; i++) {
      distToGap[i] = Math.min(distToGap[i], Math.abs(i - gi))
    }
  }

  // Place mountains along the path, skipping gaps and water tiles
  const WATER_SET = new Set(['river', 'lake', 'ocean', 'coast'])
  for (let i = 0; i < path.length; i++) {
    if (gapIndices.has(i)) continue
    const [r, c] = path[i]
    const t = tileAt(r, c).terrain
    if (WATER_SET.has(t)) continue
    const adjWater = hexNeighbors(r, c, rows, cols).some(([wr, wc]) => WATER_SET.has(tileAt(wr, wc).terrain))
    if (adjWater) continue
    tileAt(r, c).terrain = 'mountain'
    allMountains.add(`${r}-${c}`)
  }

  // Widen to 3 tiles thick, tapering near gaps
  for (let j = 0; j < path.length; j++) {
    if (gapIndices.has(j)) continue
    const [mr, mc] = path[j]

    // Taper: 2 tiles when far from gaps, 1 tile near gaps
    const gapDist = distToGap[j]
    if (gapDist <= 2) continue // just the spine near gaps

    const prevPt = j > 0 ? path[j - 1] : path[j]
    const nextPt = j < path.length - 1 ? path[j + 1] : path[j]
    const dr = nextPt[0] - prevPt[0]
    const dc = nextPt[1] - prevPt[1]
    const perpR = -dc
    const perpC = dr
    const neighbors = hexNeighbors(mr, mc, rows, cols)
    const side = Math.sin(j * 0.05 + mr * 1.3) > 0 ? 1 : -1

    let best = null, bestScore = -1e9
    for (const [nr, nc] of neighbors) {
      if (allMountains.has(`${nr}-${nc}`)) continue
      const t = tileAt(nr, nc).terrain
      if (WATER_SET.has(t)) continue
      const nearWater = hexNeighbors(nr, nc, rows, cols).some(([wr, wc]) => WATER_SET.has(tileAt(wr, wc).terrain))
      if (nearWater) continue
      const dot = ((nr - mr) * perpR + (nc - mc) * perpC) * side
      if (dot > bestScore) { bestScore = dot; best = [nr, nc] }
    }
    if (best) {
      const [wr, wc] = best
      tileAt(wr, wc).terrain = 'mountain'
      allMountains.add(`${wr}-${wc}`)
    }
  }
}

function buildDiagonalMountainRange(tiles, rows, cols, rand, allMountains, riverSet) {
  const tileAt = (r, c) => tiles[r * cols + c]

  const spanRows = Math.floor(rows * (0.35 + rand() * 0.2))
  const startRow = Math.floor(rows * (0.1 + rand() * 0.3))
  const endRow = Math.min(rows - 2, startRow + spanRows)
  const startCol = Math.floor(cols * (0.2 + rand() * 0.6))

  const sr = startRow
  const sc = startCol

  const isGoal = (r, _c) => r >= endRow

  const key = (r, c) => r * cols + c
  const INF = 1e9
  const dist = new Float64Array(rows * cols).fill(INF)
  const prev = new Int32Array(rows * cols).fill(-1)
  dist[key(sr, sc)] = 0

  let goalKey = -1
  const heap = [[0, sr, sc]]
  while (heap.length > 0) {
    heap.sort((a, b) => a[0] - b[0])
    const [d, cr, cc] = heap.shift()
    if (isGoal(cr, cc)) { goalKey = key(cr, cc); break }
    if (d > dist[key(cr, cc)]) continue

    for (const [nr, nc] of hexNeighbors(cr, cc, rows, cols)) {
      const t = tileAt(nr, nc).terrain
      let cost = 1
      const WATER = ['river', 'lake', 'ocean', 'coast']
      if (WATER.includes(t)) cost = 50
      const adjWater = hexNeighbors(nr, nc, rows, cols).some(([wr, wc]) => WATER.includes(tileAt(wr, wc).terrain))
      if (adjWater) cost += 20
      if (allMountains.has(`${nr}-${nc}`)) cost += 15

      const downwardBias = nr > cr ? 0 : 3
      const seed1 = Math.sin(nr * 7.1 + nc * 3.3) * 31415.9
      const wander = (Math.sin(seed1 + nr * 0.3 + nc * 0.6) + 1) * 5
      cost += wander + downwardBias

      const nd = d + cost
      if (nd < dist[key(nr, nc)]) {
        dist[key(nr, nc)] = nd
        prev[key(nr, nc)] = key(cr, cc)
        heap.push([nd, nr, nc])
      }
    }
  }

  if (goalKey === -1) return

  const path = []
  let cur = goalKey
  while (cur !== -1) {
    const r = Math.floor(cur / cols)
    const c = cur % cols
    path.push([r, c])
    cur = prev[cur]
  }
  path.reverse()

  const gapCount = 2 + Math.floor(rand() * 2)
  const gapIndices = new Set()
  for (let g = 0; g < gapCount; g++) {
    const gapCenter = Math.floor(path.length * (0.1 + rand() * 0.8))
    const gapSize = 1 + Math.floor(rand() * 2)
    for (let offset = -gapSize; offset <= gapSize; offset++) {
      const idx = gapCenter + offset
      if (idx >= 0 && idx < path.length) gapIndices.add(idx)
    }
  }

  const distToGap = new Array(path.length).fill(Infinity)
  for (const gi of gapIndices) {
    for (let i = 0; i < path.length; i++) {
      distToGap[i] = Math.min(distToGap[i], Math.abs(i - gi))
    }
  }

  const WATER_SET = new Set(['river', 'lake', 'ocean', 'coast'])
  for (let i = 0; i < path.length; i++) {
    if (gapIndices.has(i)) continue
    const [r, c] = path[i]
    const t = tileAt(r, c).terrain
    if (WATER_SET.has(t)) continue
    const adjWater = hexNeighbors(r, c, rows, cols).some(([wr, wc]) => WATER_SET.has(tileAt(wr, wc).terrain))
    if (adjWater) continue
    tileAt(r, c).terrain = 'mountain'
    allMountains.add(`${r}-${c}`)
  }

  for (let j = 0; j < path.length; j++) {
    if (gapIndices.has(j)) continue
    const [mr, mc] = path[j]
    const gapDist = distToGap[j]
    if (gapDist <= 2) continue

    const neighbors = hexNeighbors(mr, mc, rows, cols)
    const prevPt = j > 0 ? path[j - 1] : path[j]
    const nextPt = j < path.length - 1 ? path[j + 1] : path[j]
    const dr = nextPt[0] - prevPt[0]
    const dc = nextPt[1] - prevPt[1]
    const perpR = -dc
    const perpC = dr
    const side = Math.sin(j * 0.08 + mr * 1.7) > 0 ? 1 : -1

    let best = null, bestScore = -1e9
    for (const [nr, nc] of neighbors) {
      if (allMountains.has(`${nr}-${nc}`)) continue
      const t = tileAt(nr, nc).terrain
      if (WATER_SET.has(t)) continue
      const nearWater = hexNeighbors(nr, nc, rows, cols).some(([wr, wc]) => WATER_SET.has(tileAt(wr, wc).terrain))
      if (nearWater) continue
      const dot = ((nr - mr) * perpR + (nc - mc) * perpC) * side
      if (dot > bestScore) { bestScore = dot; best = [nr, nc] }
    }
    if (best) {
      const [wr, wc] = best
      tileAt(wr, wc).terrain = 'mountain'
      allMountains.add(`${wr}-${wc}`)
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

  const edges = []
  const topEdge = [], bottomEdge = [], leftEdge = [], rightEdge = []
  for (let c = 0; c < cols; c++) {
    if (isLand(0, c)) topEdge.push([0, c])
    if (isLand(rows - 1, c)) bottomEdge.push([rows - 1, c])
  }
  for (let r = 0; r < rows; r++) {
    if (isLand(r, 0)) leftEdge.push([r, 0])
    if (isLand(r, cols - 1)) rightEdge.push([r, cols - 1])
  }
  if (topEdge.length > 0) edges.push({ side: 'top', tiles: topEdge })
  if (bottomEdge.length > 0) edges.push({ side: 'bottom', tiles: bottomEdge })
  if (leftEdge.length > 0) edges.push({ side: 'left', tiles: leftEdge })
  if (rightEdge.length > 0) edges.push({ side: 'right', tiles: rightEdge })

  if (edges.length < 2) return

  const opposite = { top: 'bottom', bottom: 'top', left: 'right', right: 'left' }
  const startEdge = edges[Math.floor(rand() * edges.length)]
  const endCandidates = edges.filter(e => e.side === opposite[startEdge.side])
  if (endCandidates.length === 0) return
  const endEdge = endCandidates[0]

  const pickDiagonal = (edgeTiles, side, farSide) => {
    const sorted = [...edgeTiles]
    if (side === 'top' || side === 'bottom') {
      sorted.sort((a, b) => farSide === 'right' ? b[1] - a[1] : a[1] - b[1])
    } else {
      sorted.sort((a, b) => farSide === 'bottom' ? b[0] - a[0] : a[0] - b[0])
    }
    const quarter = Math.max(1, Math.floor(sorted.length * 0.3))
    return sorted[Math.floor(rand() * quarter)]
  }

  const isHorizontal = startEdge.side === 'left' || startEdge.side === 'right'
  const startFar = rand() < 0.5
    ? (isHorizontal ? 'bottom' : 'right')
    : (isHorizontal ? 'top' : 'left')
  const endFar = startFar === 'bottom' ? 'top' : startFar === 'top' ? 'bottom' : startFar === 'left' ? 'right' : 'left'

  const [sr, sc] = pickDiagonal(startEdge.tiles, startEdge.side, startFar)
  const [er, ec] = pickDiagonal(endEdge.tiles, endEdge.side, endFar)

  const midR = Math.floor(rows / 2)
  const midC = Math.floor(cols / 2)
  const wp1r = Math.floor(sr * 0.6 + er * 0.4 + (rand() - 0.5) * rows * 0.3)
  const wp1c = Math.floor(sc * 0.6 + ec * 0.4 + (rand() - 0.5) * cols * 0.3)
  const wp2r = Math.floor(sr * 0.35 + er * 0.65 + (rand() - 0.5) * rows * 0.3)
  const wp2c = Math.floor(sc * 0.35 + ec * 0.65 + (rand() - 0.5) * cols * 0.3)
  const w1r = Math.max(2, Math.min(rows - 3, wp1r))
  const w1c = Math.max(2, Math.min(cols - 3, wp1c))
  const w2r = Math.max(2, Math.min(rows - 3, wp2r))
  const w2c = Math.max(2, Math.min(cols - 3, wp2c))

  const waypoints = [[sr, sc], [w1r, w1c], [w2r, w2c], [er, ec]]

  function dijkstra(fromR, fromC, toR, toC) {
    const INF = 1e9
    const dist = new Float64Array(rows * cols).fill(INF)
    const prev = new Int32Array(rows * cols).fill(-1)
    dist[key(fromR, fromC)] = 0
    const heap = [[0, fromR, fromC]]
    while (heap.length > 0) {
      heap.sort((a, b) => a[0] - b[0])
      const [d, cr, cc] = heap.shift()
      if (cr === toR && cc === toC) break
      if (d > dist[key(cr, cc)]) continue
      for (const [nr, nc] of hexNeighbors(cr, cc, rows, cols)) {
        const t = tileAt(nr, nc).terrain
        let cost = 1
        if (t === 'mountain') cost = 12
        else if (t === 'hills') cost = 3
        const seed1 = Math.sin(nr * 7.3 + nc * 13.7) * 43758.5453
        const wander = (Math.sin(seed1 + nr * 0.15 + nc * 0.15 * 2.3) + 1) * 4
        cost += wander
        const nd = d + cost
        if (nd < dist[key(nr, nc)]) {
          dist[key(nr, nc)] = nd
          prev[key(nr, nc)] = key(cr, cc)
          heap.push([nd, nr, nc])
        }
      }
    }
    if (dist[key(toR, toC)] >= INF) return null
    const seg = []
    let cur = key(toR, toC)
    while (cur !== -1) {
      seg.push([Math.floor(cur / cols), cur % cols])
      cur = prev[cur]
    }
    seg.reverse()
    return seg
  }

  const path = []
  for (let i = 0; i < waypoints.length - 1; i++) {
    const seg = dijkstra(waypoints[i][0], waypoints[i][1], waypoints[i + 1][0], waypoints[i + 1][1])
    if (!seg) return
    if (i > 0) seg.shift()
    path.push(...seg)
  }

  const riverTiles = new Set(path.map(([r, c]) => `${r}-${c}`))

  for (const [r, c] of path) {
    tileAt(r, c).terrain = 'river'
    tileAt(r, c).hasRiver = true
  }

  // Widen river: for each path tile, add neighbors on both perpendicular sides
  for (let i = 0; i < path.length; i++) {
    const [r, c] = path[i]
    const prevPt = i > 0 ? path[i - 1] : path[i]
    const nextPt = i < path.length - 1 ? path[i + 1] : path[i]
    const dr = nextPt[0] - prevPt[0]
    const dc = nextPt[1] - prevPt[1]
    const perpR = -dc
    const perpC = dr

    const neighbors = hexNeighbors(r, c, rows, cols)

    // Sort neighbors into perpendicular sides
    let bestSame = null, bestSameScore = -1e9
    let bestOpp = null, bestOppScore = -1e9
    for (const [nr, nc] of neighbors) {
      const dot = (nr - r) * perpR + (nc - c) * perpC
      if (dot > 0 && dot > bestSameScore) { bestSameScore = dot; bestSame = [nr, nc] }
      if (dot < 0 && -dot > bestOppScore) { bestOppScore = -dot; bestOpp = [nr, nc] }
    }

    // Add one tile on each perpendicular side (guarantees 3-wide minimum)
    for (const side of [bestSame, bestOpp]) {
      if (!side) continue
      const [nr, nc] = side
      if (!riverTiles.has(`${nr}-${nc}`)) {
        tileAt(nr, nc).terrain = 'river'
        tileAt(nr, nc).hasRiver = true
        riverTiles.add(`${nr}-${nc}`)
      }

      if (cols > 48) {
        // Add a second ring tile beyond each side (4-5 wide base) for large+ maps only
        const outerNeighbors = hexNeighbors(nr, nc, rows, cols)
        for (const [onr, onc] of outerNeighbors) {
          if (riverTiles.has(`${onr}-${onc}`)) continue
          const dot = (onr - r) * perpR + (onc - c) * perpC
          if ((side === bestSame && dot > 0) || (side === bestOpp && dot < 0)) {
            tileAt(onr, onc).terrain = 'river'
            tileAt(onr, onc).hasRiver = true
            riverTiles.add(`${onr}-${onc}`)
            break
          }
        }
      }
    }
  }

  // Guarantee pass: any path tile with fewer than 2 river neighbors gets filled
  for (const [r, c] of path) {
    const neighbors = hexNeighbors(r, c, rows, cols)
    const riverNeighborCount = neighbors.filter(([nr, nc]) => riverTiles.has(`${nr}-${nc}`)).length
    if (riverNeighborCount < 2) {
      for (const [nr, nc] of neighbors) {
        if (!riverTiles.has(`${nr}-${nc}`)) {
          tileAt(nr, nc).terrain = 'river'
          tileAt(nr, nc).hasRiver = true
          riverTiles.add(`${nr}-${nc}`)
          if (neighbors.filter(([nr2, nc2]) => riverTiles.has(`${nr2}-${nc2}`)).length >= 2) break
        }
      }
    }
  }

  // Smoothing pass: remove isolated land tiles surrounded by river on most sides
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (riverTiles.has(`${r}-${c}`)) continue
      const neighbors = hexNeighbors(r, c, rows, cols)
      const riverCount = neighbors.filter(([nr, nc]) => riverTiles.has(`${nr}-${nc}`)).length
      if (riverCount >= 4) {
        tileAt(r, c).terrain = 'river'
        tileAt(r, c).hasRiver = true
        riverTiles.add(`${r}-${c}`)
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

function generateGreatLake(tiles, rows, cols, rand, mainRiver) {
  if (rows * cols < 1500) return
  const tileAt = (r, c) => tiles[r * cols + c]
  const AVOID = new Set(['river', 'lake', 'ocean', 'coast', 'mountain'])
  const riverTiles = mainRiver ? mainRiver.riverTiles : new Set()

  const margin = 6
  let center = null
  for (let attempt = 0; attempt < 40; attempt++) {
    const cr = margin + Math.floor(rand() * (rows - margin * 2))
    const cc = margin + Math.floor(rand() * (cols - margin * 2))
    const t = tileAt(cr, cc).terrain
    if (AVOID.has(t)) continue
    let tooClose = false
    for (let dr = -8; dr <= 8 && !tooClose; dr++) {
      for (let dc = -8; dc <= 8 && !tooClose; dc++) {
        const nr = cr + dr, nc = cc + dc
        if (nr < 0 || nr >= rows || nc < 0 || nc >= cols) continue
        if (riverTiles.has(`${nr}-${nc}`)) tooClose = true
        const nt = tileAt(nr, nc).terrain
        if (nt === 'ocean' || nt === 'coast') tooClose = true
      }
    }
    if (tooClose) continue
    center = [cr, cc]
    break
  }
  if (!center) return

  const [lr, lc] = center
  const angle = rand() * Math.PI
  const radiusA = 8 + rand() * 4
  const radiusB = radiusA * (0.55 + rand() * 0.2)
  const cosA = Math.cos(angle), sinA = Math.sin(angle)

  const lakeTiles = []
  const scanR = Math.ceil(Math.max(radiusA, radiusB)) + 2
  for (let dr = -scanR; dr <= scanR; dr++) {
    for (let dc = -scanR; dc <= scanR; dc++) {
      const r = lr + dr, c = lc + dc
      if (r < 0 || r >= rows || c < 0 || c >= cols) continue
      const localR = dr * cosA + dc * sinA
      const localC = -dr * sinA + dc * cosA
      const ellipseDist = (localR / radiusA) ** 2 + (localC / radiusB) ** 2
      const seed1 = Math.sin(r * 7.3 + c * 11.1) * 43758.5453
      const edgeNoise = (seed1 - Math.floor(seed1) - 0.5) * 0.3
      if (ellipseDist + edgeNoise > 1) continue
      if (riverTiles.has(`${r}-${c}`)) continue
      const nt = tileAt(r, c).terrain
      if (nt === 'river' || nt === 'ocean' || nt === 'coast') continue
      lakeTiles.push([r, c])
    }
  }

  for (const [r, c] of lakeTiles) {
    tileAt(r, c).terrain = 'lake'
    tileAt(r, c).hasRiver = false
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
  return // ore placement disabled
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
  return // ore placement disabled
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

function generateNebulaFlow(tiles, rows, cols, rand, noise) {
  const tileAt = (r, c) => tiles[r * cols + c]
  const key = (r, c) => r * cols + c

  // Pick diagonal: top-left region to bottom-right region (or vice versa)
  const topLeft = []
  const bottomRight = []
  const topRight = []
  const bottomLeft = []
  for (let c = 0; c < cols; c++) {
    if (c < cols * 0.4) topLeft.push([0, c])
    if (c > cols * 0.6) bottomRight.push([rows - 1, c])
    if (c > cols * 0.6) topRight.push([0, c])
    if (c < cols * 0.4) bottomLeft.push([rows - 1, c])
  }
  for (let r = 0; r < rows; r++) {
    if (r < rows * 0.4) topLeft.push([r, 0])
    if (r > rows * 0.6) bottomRight.push([r, cols - 1])
    if (r < rows * 0.4) topRight.push([r, cols - 1])
    if (r > rows * 0.6) bottomLeft.push([r, 0])
  }

  const diagonal = rand() < 0.5 ? [topLeft, bottomRight] : [topRight, bottomLeft]
  const [sideA, sideB] = diagonal
  if (sideA.length === 0 || sideB.length === 0) return

  const [sr, sc] = sideA[Math.floor(rand() * sideA.length)]
  const [er, ec] = sideB[Math.floor(rand() * sideB.length)]

  const noiseScale = 0.12
  const wanderStrength = 8
  const centerR = rows / 2
  const centerC = cols / 2

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
      let cost = 1
      const seed1 = Math.sin(nr * 7.3 + nc * 11.7) * 43758.5453
      const wander = (Math.sin(seed1 + nr * noiseScale + nc * noiseScale * 2.3) + 1) * wanderStrength
      cost += wander
      // Pull path toward center of map
      const distToCenter = Math.sqrt(((nr - centerR) / rows) ** 2 + ((nc - centerC) / cols) ** 2)
      cost += distToCenter * 6
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

  // Paint nebula with variable width along the path
  const nebulaSet = new Set()
  const coreSet = new Set()
  const brightSet = new Set()
  const hotspotSet = new Set()

  // Use noise field to create organic cloud shape around the path spine
  const maxRadius = Math.max(10, Math.floor(Math.min(rows, cols) * 0.4))

  // Single BFS from ALL path tiles, tracking distance
  const distFromPath = new Map()
  let frontier = []
  for (let i = 0; i < path.length; i++) {
    const [r, c] = path[i]
    const k = `${r}-${c}`
    distFromPath.set(k, 0)
    frontier.push([r, c, 0])
  }

  while (frontier.length > 0) {
    const next = []
    for (const [fr, fc, fd] of frontier) {
      if (fd >= maxRadius) continue
      for (const [nr, nc] of hexNeighbors(fr, fc, rows, cols)) {
        const nk = `${nr}-${nc}`
        const newDist = fd + 1
        if (!distFromPath.has(nk) || distFromPath.get(nk) > newDist) {
          distFromPath.set(nk, newDist)
          next.push([nr, nc, newDist])
        }
      }
    }
    frontier = next
  }

  // Precompute smooth width along path using low-frequency noise
  const pathWidths = []
  for (let i = 0; i < path.length; i++) {
    const t = i / path.length
    const w = noise.octaves(t * 2.5 + 400, 0.5, 2, 2.0, 0.5)
    pathWidths.push(4 + (w + 0.3) * (maxRadius * 0.4))
  }
  // Smooth the widths with a moving average for gentle tapering
  const smoothed = [...pathWidths]
  const windowSize = Math.max(5, Math.floor(path.length * 0.08))
  for (let i = 0; i < path.length; i++) {
    let sum = 0, count = 0
    for (let j = Math.max(0, i - windowSize); j <= Math.min(path.length - 1, i + windowSize); j++) {
      sum += pathWidths[j]
      count++
    }
    smoothed[i] = sum / count
  }

  // Assign each BFS tile to its nearest path index to get the local width
  for (const [k, fd] of distFromPath) {
    const [r, c] = k.split('-').map(Number)
    // Find closest path tile
    let minDist = Infinity, closestIdx = 0
    for (let i = 0; i < path.length; i += 2) {
      const [pr, pc] = path[i]
      const d = Math.abs(r - pr) + Math.abs(c - pc)
      if (d < minDist) { minDist = d; closestIdx = i }
    }
    const cloudThreshold = smoothed[closestIdx]

    if (fd > cloudThreshold) continue

    const distRatio = fd / Math.max(cloudThreshold, 1)

    if (distRatio < 0.2 && cloudThreshold >= 6) {
      hotspotSet.add(k)
      brightSet.add(k)
      coreSet.add(k)
    } else if (distRatio < 0.45) {
      brightSet.add(k)
      coreSet.add(k)
    } else if (distRatio < 0.75) {
      coreSet.add(k)
    }
    nebulaSet.add(k)
  }

  // Remove hotspot tiles that aren't part of a cluster of at least 4
  const hotspotClusters = []
  const hotspotVisited = new Set()
  for (const k of hotspotSet) {
    if (hotspotVisited.has(k)) continue
    const cluster = [k]
    hotspotVisited.add(k)
    for (let i = 0; i < cluster.length; i++) {
      const [cr, cc] = cluster[i].split('-').map(Number)
      for (const [nr, nc] of hexNeighbors(cr, cc, rows, cols)) {
        const nk = `${nr}-${nc}`
        if (hotspotSet.has(nk) && !hotspotVisited.has(nk)) {
          hotspotVisited.add(nk)
          cluster.push(nk)
        }
      }
    }
    hotspotClusters.push(cluster)
  }
  for (const cluster of hotspotClusters) {
    if (cluster.length < 4) {
      for (const k of cluster) hotspotSet.delete(k)
    }
  }

  // Add 2 rings of dark nebula around the existing shape
  for (let ring = 0; ring < 2; ring++) {
    const border = []
    for (const k of nebulaSet) {
      const [r, c] = k.split('-').map(Number)
      for (const [nr, nc] of hexNeighbors(r, c, rows, cols)) {
        const nk = `${nr}-${nc}`
        if (!nebulaSet.has(nk)) border.push(nk)
      }
    }
    for (const nk of border) nebulaSet.add(nk)
  }
  // Add 2 rings of core around existing core
  const coreExpand = new Set(coreSet)
  for (let ring = 0; ring < 2; ring++) {
    const additions = []
    for (const k of coreExpand) {
      const [r, c] = k.split('-').map(Number)
      for (const [nr, nc] of hexNeighbors(r, c, rows, cols)) {
        const nk = `${nr}-${nc}`
        if (nebulaSet.has(nk) && !coreExpand.has(nk)) {
          additions.push(nk)
        }
      }
    }
    for (const nk of additions) {
      coreExpand.add(nk)
      coreSet.add(nk)
    }
  }

  // Apply terrain from outermost to innermost (so inner overwrites outer)
  for (const k of nebulaSet) {
    const [r, c] = k.split('-').map(Number)
    tileAt(r, c).terrain = 'nebula'
  }
  for (const k of coreSet) {
    const [r, c] = k.split('-').map(Number)
    tileAt(r, c).terrain = 'nebula_core'
  }
  for (const k of brightSet) {
    const [r, c] = k.split('-').map(Number)
    tileAt(r, c).terrain = 'nebula_bright'
  }
  for (const k of hotspotSet) {
    const [r, c] = k.split('-').map(Number)
    tileAt(r, c).terrain = 'nebula_hotspot'
  }

  // Fill void holes inside nebula: any void tile with 4+ nebula neighbors becomes nebula
  const nebulaTerrains = new Set(['nebula', 'nebula_core', 'nebula_bright', 'nebula_hotspot'])
  for (let pass = 0; pass < 3; pass++) {
    let changed = false
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        if (tileAt(r, c).terrain !== 'void') continue
        const neighbors = hexNeighbors(r, c, rows, cols)
        const nebCount = neighbors.filter(([nr, nc]) => nebulaTerrains.has(tileAt(nr, nc).terrain)).length
        if (nebCount >= 4) {
          tileAt(r, c).terrain = 'nebula'
          changed = true
        }
      }
    }
    if (!changed) break
  }
}

export function generateSpaceTerrain(rows, cols, seed) {
  const noise = createNoise(seed + 9999)
  const rand = seededRandom(seed + 9999)
  const tiles = []
  const tileAt = (r, c) => tiles[r * cols + c]

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      tiles.push({
        row: r,
        col: c,
        terrain: TERRAIN.VOID.id,
        resource: null,
        hasRiver: false,
      })
    }
  }

  // Generate nebula as a flowing path from one edge to the opposite (like a river)
  generateNebulaFlow(tiles, rows, cols, rand, noise)

  // Scatter smaller background nebula blobs
  const bgNebulaCount = 3 + Math.floor(rand() * 3)
  for (let i = 0; i < bgNebulaCount; i++) {
    const cr = 3 + Math.floor(rand() * (rows - 6))
    const cc = 3 + Math.floor(rand() * (cols - 6))
    if (tileAt(cr, cc).terrain !== 'void') continue
    const size = 8 + Math.floor(rand() * 14)
    const cluster = [[cr, cc]]
    const used = new Set([`${cr}-${cc}`])

    for (let step = 0; step < size * 3 && cluster.length < size; step++) {
      const [sr, sc] = cluster[Math.floor(rand() * cluster.length)]
      const neighbors = hexNeighbors(sr, sc, rows, cols)
      const candidates = neighbors.filter(([nr, nc]) => {
        const nk = `${nr}-${nc}`
        return !used.has(nk) && tileAt(nr, nc).terrain === 'void'
      })
      if (candidates.length === 0) continue
      const [nr, nc] = candidates[Math.floor(rand() * candidates.length)]
      used.add(`${nr}-${nc}`)
      cluster.push([nr, nc])
    }

    if (cluster.length < 5) continue

    // BFS from center to get distance for layering
    const distMap = new Map()
    distMap.set(`${cr}-${cc}`, 0)
    let front = [[cr, cc, 0]]
    while (front.length > 0) {
      const next = []
      for (const [fr, fc, fd] of front) {
        for (const [nr, nc] of hexNeighbors(fr, fc, rows, cols)) {
          const nk = `${nr}-${nc}`
          if (used.has(nk) && !distMap.has(nk)) {
            distMap.set(nk, fd + 1)
            next.push([nr, nc, fd + 1])
          }
        }
      }
      front = next
    }

    const maxDist = Math.max(...distMap.values(), 1)
    for (const [ar, ac] of cluster) {
      const d = distMap.get(`${ar}-${ac}`) || 0
      const ratio = d / maxDist
      if (ratio < 0.3 && rand() < 0.4) {
        tileAt(ar, ac).terrain = 'nebula_bright'
      } else if (ratio < 0.6) {
        tileAt(ar, ac).terrain = 'nebula_core'
      } else {
        tileAt(ar, ac).terrain = 'nebula'
      }
    }
  }

  // Place 5-6 background asteroid chunks (behind foreground, in front of nebula)
  const bgAsteroidCount = 5 + (rand() < 0.5 ? 1 : 0)
  for (let i = 0; i < bgAsteroidCount; i++) {
    const cr = 3 + Math.floor(rand() * (rows - 6))
    const cc = 3 + Math.floor(rand() * (cols - 6))
    const size = 15 + Math.floor(rand() * 20)
    const cluster = [[cr, cc]]
    const used = new Set([`${cr}-${cc}`])

    for (let step = 0; step < size * 3 && cluster.length < size; step++) {
      const [sr, sc] = cluster[Math.floor(rand() * cluster.length)]
      const neighbors = hexNeighbors(sr, sc, rows, cols)
      const candidates = neighbors.filter(([nr, nc]) => !used.has(`${nr}-${nc}`))
      if (candidates.length === 0) continue
      const [nr, nc] = candidates[Math.floor(rand() * candidates.length)]
      used.add(`${nr}-${nc}`)
      cluster.push([nr, nc])
    }

    for (const [ar, ac] of cluster) {
      const t = tileAt(ar, ac).terrain
      if (t === 'void' || t === 'space' || t === 'dust' || t === 'nebula' || t === 'nebula_core') {
        tileAt(ar, ac).terrain = 'bg_asteroid'
      }
    }
  }

  const isLargeMap = cols > 48
  const minSpacing = 20
  const clusterCenters = []

  function tooClose(r, c) {
    if (!isLargeMap) return false
    for (const [pr, pc] of clusterCenters) {
      const dr = r - pr
      const dc = c - pc
      if (Math.sqrt(dr * dr + dc * dc) < minSpacing) return true
    }
    return false
  }

  function pickCenter(margin, maxAttempts) {
    for (let a = 0; a < maxAttempts; a++) {
      const r = margin + Math.floor(rand() * (rows - margin * 2))
      const c = margin + Math.floor(rand() * (cols - margin * 2))
      if (!tooClose(r, c)) return [r, c]
    }
    return null
  }

  // Place 3-4 medium asteroid clusters
  const clusterCount = 3 + (rand() < 0.5 ? 1 : 0)
  for (let i = 0; i < clusterCount; i++) {
    const center = pickCenter(4, 30)
    if (!center) continue
    const [cr, cc] = center
    clusterCenters.push([cr, cc])
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

  const hugeCount = isLargeMap ? 2 : 1
  for (let i = 0; i < hugeCount; i++) {
    const center = pickCenter(6, 30)
    if (!center) continue
    const [hr, hc] = center
    clusterCenters.push([hr, hc])
    const size = 25 + Math.floor(rand() * 15)
    const cluster = [[hr, hc]]
    const used = new Set([`${hr}-${hc}`])

    for (let step = 0; step < size * 2 && cluster.length < size; step++) {
      const [sr, sc] = cluster[Math.floor(rand() * cluster.length)]
      const neighbors = hexNeighbors(sr, sc, rows, cols)
      const candidates = neighbors.filter(([nr, nc]) => !used.has(`${nr}-${nc}`))
      if (candidates.length === 0) continue
      const [nr, nc] = candidates[Math.floor(rand() * candidates.length)]
      used.add(`${nr}-${nc}`)
      cluster.push([nr, nc])
    }

    for (const [ar, ac] of cluster) {
      tileAt(ar, ac).terrain = 'large_asteroid'
    }
  }

  // Super large asteroid on large maps (100-120 tiles)
  if (isLargeMap) {
    const center = pickCenter(8, 30)
    if (center) {
    const [slr, slc] = center
    clusterCenters.push([slr, slc])
    const slSize = 100 + Math.floor(rand() * 21)
    const slCluster = [[slr, slc]]
    const slUsed = new Set([`${slr}-${slc}`])

    for (let step = 0; step < slSize * 3 && slCluster.length < slSize; step++) {
      const [sr, sc] = slCluster[Math.floor(rand() * slCluster.length)]
      const neighbors = hexNeighbors(sr, sc, rows, cols)
      const candidates = neighbors.filter(([nr, nc]) => !slUsed.has(`${nr}-${nc}`))
      if (candidates.length === 0) continue
      const [nr, nc] = candidates[Math.floor(rand() * candidates.length)]
      slUsed.add(`${nr}-${nc}`)
      slCluster.push([nr, nc])
    }

    for (const [ar, ac] of slCluster) {
      tileAt(ar, ac).terrain = 'large_asteroid'
    }
    }
  }

  // Massive asteroid for large maps (350-450 tiles)
  if (isLargeMap) {
    const center = pickCenter(10, 30)
    if (center) {
    const [mr, mc] = center
    clusterCenters.push([mr, mc])
    const mSize = 350 + Math.floor(rand() * 101)
    const mCluster = [[mr, mc]]
    const mUsed = new Set([`${mr}-${mc}`])

    for (let step = 0; step < mSize * 4 && mCluster.length < mSize; step++) {
      const [sr, sc] = mCluster[Math.floor(rand() * mCluster.length)]
      const neighbors = hexNeighbors(sr, sc, rows, cols)
      const candidates = neighbors.filter(([nr, nc]) => !mUsed.has(`${nr}-${nc}`))
      if (candidates.length === 0) continue
      const [nr, nc] = candidates[Math.floor(rand() * candidates.length)]
      mUsed.add(`${nr}-${nc}`)
      mCluster.push([nr, nc])
    }

    for (const [ar, ac] of mCluster) {
      if (rand() < 0.4) {
        tileAt(ar, ac).terrain = 'large_asteroid'
      } else {
        tileAt(ar, ac).terrain = 'asteroid'
      }
    }
    }
  }

  // Smooth all asteroid cluster edges: remove tiles with <=1 asteroid neighbor
  const asteroidTypes = new Set(['asteroid', 'large_asteroid'])
  for (let pass = 0; pass < 3; pass++) {
    let changed = false
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const t = tileAt(r, c)
        if (!asteroidTypes.has(t.terrain)) continue
        const neighbors = hexNeighbors(r, c, rows, cols)
        const asteroidNeighborCount = neighbors.filter(([nr, nc]) => asteroidTypes.has(tileAt(nr, nc).terrain)).length
        if (asteroidNeighborCount <= 1) {
          t.terrain = 'void'
          changed = true
        }
      }
    }
    if (!changed) break
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
