import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import CommandShipPanel from './CommandShipPanel'
import SpaceGuildPanel from './SpaceGuildPanel'
import BattleLog from './BattleLog'
import TeamChat from './TeamChat'
import { TERRAIN, TERRAIN_THEMES, RESOURCES, SPACE_RESOURCES, LUXURY_RESOURCES } from '../lib/terrainGen'
import { SHIELD_HP, getEffectiveAttackRange } from '../hooks/useGameState'

const HEX_SIZE = 48
const HEX_W = Math.round(Math.sqrt(3) * HEX_SIZE)
const HEX_H = HEX_SIZE * 2
const ROW_H = HEX_H * 0.75
const GAP = 1
const RENDER_W = HEX_W - GAP
const RENDER_H = HEX_H - GAP

function hexDistance(r1, c1, r2, c2) {
  const q1 = c1 - ((r1 - (r1 & 1)) >> 1)
  const q2 = c2 - ((r2 - (r2 & 1)) >> 1)
  const s1 = -q1 - r1
  const s2 = -q2 - r2
  return Math.max(Math.abs(q1 - q2), Math.abs(r1 - r2), Math.abs(s1 - s2))
}

const TERRAIN_BY_ID = Object.fromEntries(Object.values(TERRAIN).map(t => [t.id, t]))

const TERRAIN_ELEVATION = {
  ocean: 0, lake: 0, river: 0.1, coast: 0.15, sand: 0.2,
  desert: 0.3, plains: 0.3, grassland: 0.35, forest: 0.4,
  jungle: 0.4, tundra: 0.3, snow: 0.35, hills: 0.5, mountain: 0.7,
}
const WATER_TERRAINS = new Set(['ocean', 'coast', 'lake', 'river'])
const SPACE_EMPTY = new Set(['void', 'space', 'dust', 'bg_asteroid'])
const SPACE_DENSE = new Set(['nebula', 'nebula_core', 'nebula_bright', 'nebula_hotspot'])

const SPACE_ELEVATION = {
  space: 0, void: 0, dust: 0.1, bg_asteroid: 0.05,
  nebula: 0.25, nebula_core: 0.4, nebula_bright: 0.5, nebula_hotspot: 0.6,
  asteroid: 0.35, large_asteroid: 0.45, star: 0.8,
}

function tileHash(r, c) {
  let h = (r * 374761393 + c * 668265263) | 0
  h = (h ^ (h >> 13)) * 1274126177
  h = h ^ (h >> 16)
  return (h & 0x7fffffff) / 0x7fffffff
}

function parseHex(hex) {
  return [parseInt(hex.slice(1, 3), 16), parseInt(hex.slice(3, 5), 16), parseInt(hex.slice(5, 7), 16)]
}

function toHex(r, g, b) {
  return '#' + [r, g, b].map(v => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')).join('')
}

function blendColors(base, target, amount) {
  const [br, bg, bb] = parseHex(base)
  const [tr, tg, tb] = parseHex(target)
  return toHex(
    br + (tr - br) * amount,
    bg + (tg - bg) * amount,
    bb + (tb - bb) * amount,
  )
}
const RESOURCE_BY_ID = Object.fromEntries([
  ...Object.values(RESOURCES).map(r => [r.id, r]),
  ...Object.values(SPACE_RESOURCES).map(r => [r.id, r]),
  ...Object.values(LUXURY_RESOURCES).map(r => [r.id, r]),
])
function getMaxHp(unit) {
  const base = unit?.wg_unit_types?.hp || 0
  const hullSlots = unit?.upgrades?.hull || unit?.upgrades?.walls || []
  const maxTier = Array.isArray(hullSlots) ? Math.max(0, ...hullSlots.filter(t => t > 0)) : 0
  return base + maxTier * 30
}
function getUnitIcon(unitType, unit) {
  if (!unitType?.icon) return '/assets/infantry.png'
  if (unitType.name === 'Command Ship') {
    const model = unit?.upgrades?.shipModel || 'commandship7'
    return `/assets/${model}.png`
  }
  if (unitType.name === 'Command Center') {
    const model = unit?.upgrades?.ccModel || 'command center'
    return `/assets/${encodeURIComponent(model)}.png`
  }
  return `/assets/${encodeURIComponent(unitType.icon)}`
}

function getUnitShield(unit) {
  const slots = unit?.upgrades?.shields || []
  const maxTier = Math.max(...slots.filter(s => s > 0), 0)
  if (maxTier === 0) return null
  const max = SHIELD_HP[maxTier] || 0
  const current = unit.upgrades?.shieldHp !== undefined ? unit.upgrades.shieldHp : max
  return { current, max }
}

const GROUND_IMPASSABLE = new Set(['ocean', 'mountain', 'lake', 'river'])
const SPACE_IMPASSABLE = new Set(['asteroid', 'large_asteroid', 'star'])
const MINING_PASSABLE = new Set(['asteroid', 'large_asteroid'])

function hexNeighborsBoard(r, c, rows, cols) {
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

export default function GameBoard({
  game, players, units, allUnits, unitTypes, allUnitTypes, tiles, discoveredTiles, persistDiscoveredTiles,
  currentPlayer, isMyTurn, isAdmin,
  deployUnit, moveUnit, attackUnit, buildRoad, destroyRoad, endTurn,
  excavate, upgradeShipCompartment, levelUpUnit, buyMissile, fireMissile, produceWarhead, missileFiredShips, sendConvoyToGuild,
  buildConvoy, loadUnitToConvoy, loadFromBayToConvoy, unloadToHoldingBay, sendConvoy, deployFromBay, produceUnitToBay, loadCargoToConvoy, unloadCargoFromConvoy, loadInventoryToConvoy,
  dockTransport, loadSoldierToTransport, loadBaySoldierToTransport, unloadSoldierFromTransport, undockTransport, deployFromTransport, buyAndLoadToTransport, boardSoldierToTransport,
  setAutoPath, clearAutoPath,
  deployFromHangar, produceUnitToHangar, transferHangarUnit, transferAllHangar, addToHangar, renameUnit, produceBattleshipToBay, buyMissileForDockedBs, renameDockedBattleship, loadToBattleshipHangar, deployDockedBattleship, produceFactoryItem,
  battleLog,
  isFullscreen, onExitFullscreen,
  activeBoard, setActiveBoard, canActOnBoard, allPlayers, realIsMyTurn,
  productionPerTurn, economy, getUsedProduction,
}) {
  const [selectedUnitId, setSelectedUnitId] = useState(null)
  const [selectedUnitType, setSelectedUnitType] = useState(null)
  const [inspectedUnitId, setInspectedUnitId] = useState(null)
  const [hoveredTile, setHoveredTile] = useState(null)
  const [tappedTile, setTappedTile] = useState(null)
  const [mode, setMode] = useState('select')
  const [error, setError] = useState(null)
  const [panelOpen, setPanelOpen] = useState(false)
  const [zoom, setZoom] = useState(0.34)
  const [spaceHeld, setSpaceHeld] = useState(false)
  const [isPanning, setIsPanning] = useState(false)
  const [touchPanning, setTouchPanning] = useState(false)
  const [commandShipUnitId, setCommandShipUnitId] = useState(null)
  const [bayDeployInfo, setBayDeployInfo] = useState(null)
  const [hangarDeployInfo, setHangarDeployInfo] = useState(null)
  const [hangarDeployAllInfo, setHangarDeployAllInfo] = useState(null)
  const [transportDeployInfo, setTransportDeployInfo] = useState(null)
  const [unitDeployFromTransportInfo, setUnitDeployFromTransportInfo] = useState(null)
  const [bsDeployInfo, setBsDeployInfo] = useState(null)
  const [missileTargetInfo, setMissileTargetInfo] = useState(null)
  const [shipModelPicker, setShipModelPicker] = useState(null)
  const [chatOpen, setChatOpen] = useState(false)
  const [battleLogOpen, setBattleLogOpen] = useState(false)
  const [spaceGuildOpen, setSpaceGuildOpen] = useState(false)
  const [clickedTile, setClickedTile] = useState(null)
  const [turnExpanded, setTurnExpanded] = useState(false)
  const [numberedOverlays, setNumberedOverlays] = useState([])
  const boardRef = useRef(null)
  const boardInnerRef = useRef(null)
  const wrapperRef = useRef(null)
  const zoomRef = useRef(zoom)
  zoomRef.current = zoom
  const baseZoomRef = useRef(zoom)
  const panStart = useRef({ x: 0, y: 0, scrollLeft: 0, scrollTop: 0 })
  const touchPanRef = useRef(null)
  const panningRef = useRef(false)
  const spaceRef = useRef(false)
  const velocityRef = useRef({ vx: 0, vy: 0 })
  const lastMoveRef = useRef({ x: 0, y: 0, t: 0 })
  const inertiaRef = useRef(null)

  const prevUnitMapRef = useRef(null)
  const prevBoardRef = useRef(activeBoard)
  const [deadUnits, setDeadUnits] = useState([])
  const [slidingUnits, setSlidingUnits] = useState(new Map())

  const unitAnimations = useMemo(() => {
    const prev = prevUnitMapRef.current
    if (!prev || prevBoardRef.current !== activeBoard) return new Map()
    const anims = new Map()
    for (const u of units) {
      const p = prev.get(u.id)
      if (!p) {
        anims.set(u.id, { type: 'fadeIn' })
      } else if (p.row !== u.grid_row || p.col !== u.grid_col) {
        const fromX = p.col * HEX_W + (p.row & 1 ? HEX_W / 2 : 0) + RENDER_W / 2
        const fromY = p.row * ROW_H + RENDER_H / 2
        const toX = u.grid_col * HEX_W + (u.grid_row & 1 ? HEX_W / 2 : 0) + RENDER_W / 2
        const toY = u.grid_row * ROW_H + RENDER_H / 2
        anims.set(u.id, { type: 'slide', fromX, fromY, toX, toY })
      }
    }
    return anims
  }, [units, activeBoard])

  const slideKeyframes = useMemo(() => {
    let css = ''
    for (const [id, anim] of slidingUnits) {
      css += `@keyframes slide-${id}{from{left:${anim.fromX}px;top:${anim.fromY}px}to{left:${anim.toX}px;top:${anim.toY}px}}`
    }
    return css
  }, [slidingUnits])

  useEffect(() => {
    const prev = prevUnitMapRef.current
    if (prev && prevBoardRef.current === activeBoard) {
      const currentIds = new Set(units.map(u => u.id))
      const dying = []
      for (const [id, data] of prev) {
        if (!currentIds.has(id)) {
          dying.push({ ...data, removeAt: Date.now() + 500 })
        }
      }
      if (dying.length > 0) setDeadUnits(p => [...p, ...dying])
    }

    const slides = new Map()
    for (const [id, anim] of unitAnimations) {
      if (anim.type === 'slide') {
        const u = units.find(u => u.id === id)
        if (u) slides.set(id, { ...anim, unit: u })
      }
    }
    if (slides.size > 0) {
      setSlidingUnits(slides)
      setTimeout(() => setSlidingUnits(new Map()), 550)
    }

    prevBoardRef.current = activeBoard
    const newMap = new Map()
    for (const u of units) {
      newMap.set(u.id, {
        id: u.id, row: u.grid_row, col: u.grid_col,
        unitType: u.wg_unit_types, unit: u, ownerId: u.owner_id,
      })
    }
    prevUnitMapRef.current = newMap
  }, [units, activeBoard])

  useEffect(() => {
    if (deadUnits.length === 0) return
    const timer = setTimeout(() => {
      setDeadUnits(p => p.filter(d => d.removeAt > Date.now()))
    }, 600)
    return () => clearTimeout(timer)
  }, [deadUnits])

  const selectedUnit = selectedUnitId ? units.find(u => u.id === selectedUnitId) || null : null
  const inspectedUnit = inspectedUnitId ? units.find(u => u.id === inspectedUnitId) || null : null

  const myColor = currentPlayer?.color
  const allMyUnits = allUnits || units
  const hasCommandCenter = !!allMyUnits.find(u => u.owner_id === currentPlayer?.player_id && (u.wg_unit_types?.name === 'Command Center' || u.wg_unit_types?.name === 'Command Ship'))
  const hasCommandStructureOnThisBoard = !!units.find(u => u.owner_id === currentPlayer?.player_id && (u.wg_unit_types?.name === 'Command Center' || u.wg_unit_types?.name === 'Command Ship'))
  const myCommandCenter = units.find(u => u.owner_id === currentPlayer?.player_id && (u.wg_unit_types?.name === 'Command Center' || u.wg_unit_types?.name === 'Command Ship'))
  const myBuildings = units.filter(u => u.owner_id === currentPlayer?.player_id && (u.wg_unit_types?.name === 'Base' || u.wg_unit_types?.name === 'Factory'))
  const myStructures = myCommandCenter ? [myCommandCenter, ...myBuildings] : []

  const DEPLOY_HIDDEN = new Set(['Convoy Ship', 'Mother Ship', 'Factory'])
  const sortedUnitTypes = [...unitTypes].filter(ut => !DEPLOY_HIDDEN.has(ut.name)).sort((a, b) => {
    if (a.name === 'Command Center' || a.name === 'Command Ship') return -1
    if (b.name === 'Command Center' || b.name === 'Command Ship') return 1
    if (a.name === 'Base') return -1
    if (b.name === 'Base') return 1
    return 0
  })

  const selectedUnitTypeData = selectedUnitType ? unitTypes.find(t => t.id === selectedUnitType) : null

  useEffect(() => {
    if (selectedUnitId && !units.find(u => u.id === selectedUnitId)) {
      setSelectedUnitId(null)
      setMode('select')
    }
    if (inspectedUnitId && !units.find(u => u.id === inspectedUnitId)) {
      setInspectedUnitId(null)
    }
    if (commandShipUnitId && !units.find(u => u.id === commandShipUnitId)) {
      setCommandShipUnitId(null)
    }
  }, [units, selectedUnitId, inspectedUnitId, commandShipUnitId])

  const rows = game.grid_rows
  const cols = game.grid_cols

  const boardPixelW = cols * HEX_W + HEX_W / 2 + GAP
  const boardPixelH = (rows - 1) * ROW_H + HEX_H + GAP
  const isMobileView = isFullscreen || (typeof window !== 'undefined' && window.innerWidth < 768)
  const wrapPad = isMobileView ? 0.05 : 0.6
  const minZoom = isMobileView
    ? Math.max(window.innerWidth / boardPixelW, window.innerHeight / boardPixelH) * 0.68
    : 0.1

  const tileMap = useMemo(() => {
    const map = new Map()
    for (const t of tiles) map.set(`${t.grid_row}-${t.grid_col}`, t)
    return map
  }, [tiles])

  const { mountainShadowTiles, mountainInterior } = useMemo(() => {
    const shadow = new Set()
    const interior = new Set()
    for (const t of tiles) {
      if (t.terrain !== 'mountain') continue
      const r = t.grid_row, c = t.grid_col
      const odd = r & 1
      const below = odd ? [[r+1, c], [r+1, c+1]] : [[r+1, c-1], [r+1, c]]
      for (const [nr, nc] of below) {
        if (nr >= 0 && nr < rows && nc >= 0 && nc < cols) {
          const neighbor = tileMap.get(`${nr}-${nc}`)
          if (neighbor && neighbor.terrain !== 'mountain') shadow.add(`${nr}-${nc}`)
        }
      }
      const above = odd ? [[r-1, c], [r-1, c+1]] : [[r-1, c-1], [r-1, c]]
      const hasMountainAbove = above.some(([ar, ac]) => {
        if (ar < 0 || ar >= rows || ac < 0 || ac >= cols) return false
        const n = tileMap.get(`${ar}-${ac}`)
        return n && n.terrain === 'mountain'
      })
      if (hasMountainAbove && tileHash(r, c) > 0.4) interior.add(`${r}-${c}`)
    }
    return { mountainShadowTiles: shadow, mountainInterior: interior }
  }, [tiles, tileMap, rows, cols])

  const unitPosMap = useMemo(() => {
    const map = new Map()
    for (const u of units) map.set(`${u.grid_row}-${u.grid_col}`, u)
    for (const u of units) {
      if (u.wg_unit_types?.name === 'Command Ship' || u.wg_unit_types?.name === 'Command Center') {
        for (const [nr, nc] of hexNeighborsBoard(u.grid_row, u.grid_col, rows, cols)) {
          const key = `${nr}-${nc}`
          if (!map.has(key)) map.set(key, u)
        }
      }
    }
    return map
  }, [units, rows, cols])

  const visibleTiles = useMemo(() => {
    const set = new Set()
    if (isAdmin) {
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          set.add(`${r}-${c}`)
        }
      }
      return set
    }
    const teamPlayerIds = (allPlayers || players).filter(p => p.color === myColor).map(p => p.player_id)
    const teamUnits = units.filter(u => teamPlayerIds.includes(u.owner_id))
    for (const u of teamUnits) {
      const vis = u.wg_unit_types?.name === 'Recon Drone' ? 5 : (u.wg_unit_types?.visibility ?? 2)
      const rMin = Math.max(0, u.grid_row - vis)
      const rMax = Math.min(rows - 1, u.grid_row + vis)
      const cMin = Math.max(0, u.grid_col - vis)
      const cMax = Math.min(cols - 1, u.grid_col + vis)
      for (let r = rMin; r <= rMax; r++) {
        for (let c = cMin; c <= cMax; c++) {
          if (hexDistance(u.grid_row, u.grid_col, r, c) <= vis) {
            set.add(`${r}-${c}`)
          }
        }
      }
    }
    return set
  }, [isAdmin, rows, cols, units, allPlayers, players, myColor])

  const prevVisibleRef = useRef(new Set())
  useEffect(() => {
    const board = activeBoard || 'ground'
    const newKeys = []
    for (const key of visibleTiles) {
      const fullKey = `${board}-${key}`
      if (!discoveredTiles.has(fullKey) && !prevVisibleRef.current.has(key)) {
        newKeys.push(fullKey)
      }
    }
    prevVisibleRef.current = visibleTiles
    if (newKeys.length > 0) persistDiscoveredTiles(newKeys)
  }, [visibleTiles, discoveredTiles, persistDiscoveredTiles, activeBoard])

  const themeColors = useMemo(() => {
    const themeId = game.terrain_theme || 'default'
    const theme = TERRAIN_THEMES[themeId]
    return theme?.colors || null
  }, [game.terrain_theme])

  const enhancedColorMap = useMemo(() => {
    const map = new Map()
    const isSpace = activeBoard === 'space'

    // Precompute asteroid edge distance for elevation-style shading
    const asteroidDepth = new Map()
    if (isSpace) {
      const asteroidSet = new Set()
      for (const tile of tiles) {
        if (tile.terrain === 'asteroid' || tile.terrain === 'large_asteroid') {
          asteroidSet.add(`${tile.grid_row}-${tile.grid_col}`)
        }
      }
      // Find edge asteroids (adjacent to non-asteroid)
      const edgeTiles = []
      for (const k of asteroidSet) {
        const [r, c] = k.split('-').map(Number)
        const neighbors = hexNeighborsBoard(r, c, rows, cols)
        let isEdge = false
        for (const [nr, nc] of neighbors) {
          if (!asteroidSet.has(`${nr}-${nc}`)) { isEdge = true; break }
        }
        if (isEdge) {
          asteroidDepth.set(k, 0)
          edgeTiles.push(k)
        }
      }
      // BFS inward from edges
      let frontier = edgeTiles
      while (frontier.length > 0) {
        const next = []
        for (const k of frontier) {
          const d = asteroidDepth.get(k)
          const [r, c] = k.split('-').map(Number)
          for (const [nr, nc] of hexNeighborsBoard(r, c, rows, cols)) {
            const nk = `${nr}-${nc}`
            if (asteroidSet.has(nk) && !asteroidDepth.has(nk)) {
              asteroidDepth.set(nk, d + 1)
              next.push(nk)
            }
          }
        }
        frontier = next
      }
    }

    for (const tile of tiles) {
      const r = tile.grid_row, c = tile.grid_col
      const terrain = TERRAIN_BY_ID[tile.terrain]
      if (!terrain) continue

      const themed = themeColors && themeColors[tile.terrain]
      let baseColor = themed ? themed.color : terrain.color
      let baseDark = themed ? themed.darkColor : terrain.darkColor

      if (isSpace) {
        const isEmpty = SPACE_EMPTY.has(tile.terrain)
        if (!isEmpty) {
          const neighbors = hexNeighborsBoard(r, c, rows, cols)
          let nr2 = 0, ng = 0, nb = 0
          let dr = 0, dg = 0, db = 0
          let count = 0
          for (const [nr, nc] of neighbors) {
            const nt = tileMap.get(`${nr}-${nc}`)
            if (!nt) continue
            const nt2 = TERRAIN_BY_ID[nt.terrain]
            if (!nt2) continue
            const [r3, g3, b3] = parseHex(nt2.color)
            const [r4, g4, b4] = parseHex(nt2.darkColor)
            nr2 += r3; ng += g3; nb += b3
            dr += r4; dg += g4; db += b4
            count++
          }
          if (count > 0) {
            const avgColor = toHex(nr2 / count, ng / count, nb / count)
            const avgDark = toHex(dr / count, dg / count, db / count)
            baseColor = blendColors(baseColor, avgColor, 0.15)
            baseDark = blendColors(baseDark, avgDark, 0.15)
          }
        }
        if (SPACE_DENSE.has(tile.terrain)) {
          const neighbors = hexNeighborsBoard(r, c, rows, cols)
          let emptyCount = 0
          for (const [nr, nc] of neighbors) {
            const nt = tileMap.get(`${nr}-${nc}`)
            if (nt && SPACE_EMPTY.has(nt.terrain)) emptyCount++
          }
          if (emptyCount > 0) {
            const fadeAmt = Math.min(emptyCount * 0.06, 0.25)
            baseColor = blendColors(baseColor, '#111214', fadeAmt)
            baseDark = blendColors(baseDark, '#111214', fadeAmt)
          }
        }
        if (tile.terrain !== 'star') {
          const neighbors = hexNeighborsBoard(r, c, rows, cols)
          for (const [nr, nc] of neighbors) {
            const nt = tileMap.get(`${nr}-${nc}`)
            if (nt && nt.terrain === 'star') {
              baseColor = blendColors(baseColor, '#e8e8f0', 0.15)
              baseDark = blendColors(baseDark, '#a0a0a8', 0.15)
              break
            }
          }
        }

        const hash = tileHash(r, c)
        const jitter = (hash - 0.5) * 0.10
        const [cr, cg, cb] = parseHex(baseColor)
        const [dr2, dg2, db2] = parseHex(baseDark)
        baseColor = toHex(cr * (1 + jitter), cg * (1 + jitter), cb * (1 + jitter))
        baseDark = toHex(dr2 * (1 + jitter), dg2 * (1 + jitter), db2 * (1 + jitter))

        if (tile.terrain === 'asteroid' || tile.terrain === 'large_asteroid') {
          const h2 = tileHash(r + 31, c + 17)
          const warmCool = (h2 - 0.5) * 0.12
          const brightDark = (tileHash(r + 53, c + 7) - 0.5) * 0.08
          // Elevation shading: darker at edges, lighter in center
          const depth = asteroidDepth.get(`${r}-${c}`) || 0
          const depthShift = Math.min(depth, 3) * 0.08 // up to ~24% lighter at center
          const edgeDarken = depth === 0 ? -0.22 : 0
          const elevAdj = depthShift + edgeDarken
          const [ar, ag, ab] = parseHex(baseColor)
          baseColor = toHex(
            ar * (1 + warmCool + brightDark + elevAdj),
            ag * (1 + brightDark + elevAdj),
            ab * (1 - warmCool * 0.6 + brightDark + elevAdj)
          )
          const [adr, adg, adb] = parseHex(baseDark)
          baseDark = toHex(
            adr * (1 + warmCool + brightDark + elevAdj),
            adg * (1 + brightDark + elevAdj),
            adb * (1 - warmCool * 0.6 + brightDark + elevAdj)
          )
        }

        const elev = SPACE_ELEVATION[tile.terrain] ?? 0.1
        const elevShift = (elev - 0.2) * 0.08
        const [er, eg, eb] = parseHex(baseColor)
        baseColor = toHex(er * (1 + elevShift), eg * (1 + elevShift), eb * (1 + elevShift))
        const [edr, edg, edb] = parseHex(baseDark)
        baseDark = toHex(edr * (1 + elevShift), edg * (1 + elevShift), edb * (1 + elevShift))
      } else {
        const isWater = WATER_TERRAINS.has(tile.terrain)
        if (isWater) {
          const neighbors = hexNeighborsBoard(r, c, rows, cols)
          let landCount = 0
          for (const [nr, nc] of neighbors) {
            const nt = tileMap.get(`${nr}-${nc}`)
            if (nt && !WATER_TERRAINS.has(nt.terrain)) landCount++
          }
          if (landCount > 0) {
            const shallowAmt = Math.min(landCount * 0.06, 0.25)
            baseColor = blendColors(baseColor, '#4a7a8a', shallowAmt)
            baseDark = blendColors(baseDark, '#2a4a55', shallowAmt)
          }
        }

        if (!isWater) {
          const neighbors = hexNeighborsBoard(r, c, rows, cols)
          let nr2 = 0, ng = 0, nb = 0
          let dr = 0, dg = 0, db = 0
          let count = 0
          for (const [nr, nc] of neighbors) {
            const nt = tileMap.get(`${nr}-${nc}`)
            if (!nt) continue
            const nt2 = TERRAIN_BY_ID[nt.terrain]
            if (!nt2) continue
            const nThemed = themeColors && themeColors[nt.terrain]
            const nc2 = nThemed ? nThemed.color : nt2.color
            const nd2 = nThemed ? nThemed.darkColor : nt2.darkColor
            const [r3, g3, b3] = parseHex(nc2)
            const [r4, g4, b4] = parseHex(nd2)
            nr2 += r3; ng += g3; nb += b3
            dr += r4; dg += g4; db += b4
            count++
          }
          if (count > 0) {
            const avgColor = toHex(nr2 / count, ng / count, nb / count)
            const avgDark = toHex(dr / count, dg / count, db / count)
            baseColor = blendColors(baseColor, avgColor, 0.12)
            baseDark = blendColors(baseDark, avgDark, 0.12)
          }
        }

        const hash = tileHash(r, c)
        const jitter = (hash - 0.5) * 0.10
        const [cr, cg, cb] = parseHex(baseColor)
        const [dr2, dg2, db2] = parseHex(baseDark)
        baseColor = toHex(cr * (1 + jitter), cg * (1 + jitter), cb * (1 + jitter))
        baseDark = toHex(dr2 * (1 + jitter), dg2 * (1 + jitter), db2 * (1 + jitter))

        const elev = TERRAIN_ELEVATION[tile.terrain] ?? 0.3
        const elevShift = (elev - 0.3) * 0.08
        const [er, eg, eb] = parseHex(baseColor)
        baseColor = toHex(er * (1 + elevShift), eg * (1 + elevShift), eb * (1 + elevShift))
        const [edr, edg, edb] = parseHex(baseDark)
        baseDark = toHex(edr * (1 + elevShift), edg * (1 + elevShift), edb * (1 + elevShift))
      }

      // Tundra mountain: darken shadow values by 15% in scattered clusters
      if (!isSpace && tile.terrain === 'mountain' && game?.terrain_theme === 'crystal_tundra') {
        const clusterNoise = tileHash(r * 3 + 11, c * 5 + 29)
        if (clusterNoise > 0.55) {
          const [dr3, dg3, db3] = parseHex(baseDark)
          baseDark = toHex(dr3 * 0.85, dg3 * 0.85, db3 * 0.85)
        }
      }

      map.set(`${r}-${c}`, { color: baseColor, darkColor: baseDark })
    }
    return map
  }, [tiles, tileMap, themeColors, activeBoard, rows, cols, game?.terrain_theme])

  const miningAffectedTiles = useMemo(() => {
    const GROUND_EXCLUDED = new Set(['ocean', 'lake', 'river', 'mountain'])
    const SPACE_EXCLUDED = new Set(['void', 'nebula', 'nebula_core', 'nebula_bright', 'nebula_hotspot', 'star'])
    const map = new Map()
    for (const u of units) {
      const m = u.upgrades?.mining
      if (m && m.active && m.layer >= 1) {
        const isSpace = (u.board || 'ground') === 'space'
        const excluded = isSpace ? SPACE_EXCLUDED : GROUND_EXCLUDED
        for (const [nr, nc] of hexNeighborsBoard(m.centerRow, m.centerCol, rows, cols)) {
          const key = `${nr}-${nc}`
          if (map.has(key)) continue
          const td = tileMap.get(key)
          if (!td) continue
          if (td.has_road && !isSpace) continue
          if (excluded.has(td.terrain)) continue
          map.set(key, isSpace ? 'space' : 'ground')
        }
      }
    }
    return map
  }, [units, rows, cols, tileMap])

  function getTileColor(row, col, isVisible, isDiscovered) {
    const isSpace = activeBoard === 'space'
    const fogColor = isSpace ? '#111214' : '#1a2029'
    const tile = tileMap.get(`${row}-${col}`)
    if (!tile) return isVisible ? '#232a35' : isDiscovered ? '#1e2530' : fogColor
    const terrain = TERRAIN_BY_ID[tile.terrain]
    if (!terrain) return isVisible ? '#232a35' : isDiscovered ? '#1e2530' : fogColor
    const miningBoard = miningAffectedTiles.get(`${row}-${col}`)
    if (miningBoard && isVisible) {
      const h = tileHash(row, col)
      const jitter = (h - 0.5) * 0.12
      const baseColor = miningBoard === 'space' ? '#1a1610' : '#7c857a'
      const [br, bg, bb] = parseHex(baseColor)
      return toHex(br * (1 + jitter), bg * (1 + jitter), bb * (1 + jitter))
    }
    if (tile.has_road) {
      if (isVisible) return '#8a7a60'
      if (isDiscovered) return '#5a5040'
      return fogColor
    }
    const enhanced = enhancedColorMap.get(`${row}-${col}`)
    if (enhanced) {
      if (isVisible) return enhanced.color
      if (isDiscovered) return enhanced.darkColor
    } else {
      const themed = themeColors && themeColors[tile.terrain]
      if (isVisible) return themed ? themed.color : terrain.color
      if (isDiscovered) return themed ? themed.darkColor : terrain.darkColor
    }
    return fogColor
  }

  function getTerrainInfo(row, col) {
    const tile = tileMap.get(`${row}-${col}`)
    if (!tile) return null
    const terrain = TERRAIN_BY_ID[tile.terrain]
    const resource = tile.resource ? RESOURCE_BY_ID[tile.resource] : null
    return { terrain, resource, resourceId: tile.resource, hasRiver: tile.has_river, oreAmount: tile.ore_amount }
  }

  function isImpassable(row, col, unitTypeName = null) {
    const tile = tileMap.get(`${row}-${col}`)
    if (!tile) return false
    if (tile.resource === 'space_guild') return true
    if (tile.has_road) return false
    if (activeBoard === 'space') {
      if (unitTypeName === 'Mining Station' && MINING_PASSABLE.has(tile.terrain)) return false
      return SPACE_IMPASSABLE.has(tile.terrain)
    }
    return GROUND_IMPASSABLE.has(tile.terrain)
  }

  function getUnitAt(row, col) {
    return unitPosMap.get(`${row}-${col}`) || null
  }

  const playerColorMap = useMemo(() => {
    const map = new Map()
    for (const p of (allPlayers || players)) map.set(p.player_id, p.color)
    return map
  }, [allPlayers, players])

  function getPlayerColor(playerId, unit) {
    if (unit?.isNPC) return '#e05050'
    return playerColorMap.get(playerId) || '#888'
  }

  function getMoveRange(unit) {
    if (!unit?.wg_unit_types) return new Set()
    const unitName = unit.wg_unit_types.name
    const unitBoard = unit.board || 'ground'
    const baseRange = unit.wg_unit_types.movement + (unitBoard === 'space' ? 3 : 0)
    const usedSoFar = unit.moves_used || 0
    const sourceTile = tileMap.get(`${unit.grid_row}-${unit.grid_col}`)
    const sourceHasRoad = sourceTile?.has_road

    const visited = new Map()
    visited.set(`${unit.grid_row}-${unit.grid_col}`, 0)
    const queue = [[unit.grid_row, unit.grid_col, 0]]
    const cells = []

    while (queue.length > 0) {
      const [cr, cc, dist] = queue.shift()
      const neighbors = hexNeighborsBoard(cr, cc, rows, cols)
      for (const [nr, nc] of neighbors) {
        const nk = `${nr}-${nc}`
        if (isImpassable(nr, nc, unitName)) continue
        const blocker = getUnitAt(nr, nc)
        if (blocker && blocker.id !== unit.id) continue
        const nTile = tileMap.get(nk)
        const nHasRoad = nTile?.has_road
        let cost = 1
        const maxRange = (sourceHasRoad && nHasRoad) ? baseRange + 2 : baseRange
        const remainingRange = maxRange - usedSoFar
        const newDist = dist + cost
        if (newDist > remainingRange) continue
        const prev = visited.get(nk)
        if (prev !== undefined && prev <= newDist) continue
        visited.set(nk, newDist)
        cells.push(nk)
        queue.push([nr, nc, newDist])
      }
    }
    return new Set(cells)
  }

  function findPath(fromRow, fromCol, toRow, toCol, unitName) {
    const maxDist = 40
    if (hexDistance(fromRow, fromCol, toRow, toCol) > maxDist) return null
    const startKey = `${fromRow}-${fromCol}`
    const endKey = `${toRow}-${toCol}`
    const gScore = new Map()
    gScore.set(startKey, 0)
    const cameFrom = new Map()
    const open = [[hexDistance(fromRow, fromCol, toRow, toCol), fromRow, fromCol]]
    const closed = new Set()

    while (open.length > 0) {
      open.sort((a, b) => a[0] - b[0])
      const [, cr, cc] = open.shift()
      const ck = `${cr}-${cc}`
      if (ck === endKey) {
        const path = []
        let cur = endKey
        while (cur && cur !== startKey) {
          const [r, c] = cur.split('-').map(Number)
          path.unshift({ row: r, col: c })
          cur = cameFrom.get(cur)
        }
        return path
      }
      if (closed.has(ck)) continue
      closed.add(ck)
      const g = gScore.get(ck)
      const neighbors = hexNeighborsBoard(cr, cc, rows, cols)
      for (const [nr, nc] of neighbors) {
        const nk = `${nr}-${nc}`
        if (closed.has(nk)) continue
        if (isImpassable(nr, nc, unitName)) continue
        const tentG = g + 1
        if (tentG > maxDist) continue
        const prev = gScore.get(nk)
        if (prev !== undefined && prev <= tentG) continue
        gScore.set(nk, tentG)
        cameFrom.set(nk, ck)
        const h = hexDistance(nr, nc, toRow, toCol)
        open.push([tentG + h, nr, nc])
      }
    }
    return null
  }

  function getAttackRange(unit) {
    if (!unit?.wg_unit_types) return new Set()
    const cells = new Set()
    const range = getEffectiveAttackRange(unit)
    const rMin = Math.max(0, unit.grid_row - range)
    const rMax = Math.min(rows - 1, unit.grid_row + range)
    const cMin = Math.max(0, unit.grid_col - range)
    const cMax = Math.min(cols - 1, unit.grid_col + range)
    for (let r = rMin; r <= rMax; r++) {
      for (let c = cMin; c <= cMax; c++) {
        const dist = hexDistance(unit.grid_row, unit.grid_col, r, c)
        const target = getUnitAt(r, c)
        if (dist > 0 && dist <= range && target && target.owner_id !== currentPlayer?.player_id) {
          cells.add(`${r}-${c}`)
        }
      }
    }
    return cells
  }

  function getBuildRange(unit) {
    if (!unit?.wg_unit_types || unit.wg_unit_types.name !== 'Engineer') return new Set()
    const cells = new Set()
    const neighbors = hexNeighborsBoard(unit.grid_row, unit.grid_col, rows, cols)
    for (const [nr, nc] of neighbors) {
      const tile = tileMap.get(`${nr}-${nc}`)
      if (!tile || tile.has_road || tile.terrain === 'mountain') continue
      cells.add(`${nr}-${nc}`)
    }
    return cells
  }

  function getDestroyRange(unit) {
    if (!unit?.wg_unit_types || unit.wg_unit_types.name !== 'Engineer') return new Set()
    const cells = new Set()
    const neighbors = hexNeighborsBoard(unit.grid_row, unit.grid_col, rows, cols)
    for (const [nr, nc] of neighbors) {
      const tile = tileMap.get(`${nr}-${nc}`)
      if (!tile || !tile.has_road) continue
      cells.add(`${nr}-${nc}`)
    }
    return cells
  }

  const hasRemainingMoves = selectedUnit && !selectedUnit.has_moved && (selectedUnit.moves_used || 0) < (selectedUnit.wg_unit_types?.movement || 0)
  const moveRange = selectedUnit && (isAdmin || hasRemainingMoves) ? getMoveRange(selectedUnit) : new Set()
  const attackRange = mode === 'attack' && selectedUnit ? getAttackRange(selectedUnit) : new Set()
  const buildRange = mode === 'build' && selectedUnit ? getBuildRange(selectedUnit) : new Set()
  const destroyRange = mode === 'destroy' && selectedUnit ? getDestroyRange(selectedUnit) : new Set()

  const autoPathTiles = useMemo(() => {
    const set = new Set()
    for (const u of units) {
      const path = u.upgrades?.autoPath
      if (path && Array.isArray(path)) {
        for (const wp of path) set.add(`${wp.row}-${wp.col}`)
      }
    }
    return set
  }, [units])


  function isNearEdge(r, c) {
    return Math.min(r, rows - 1 - r, c, cols - 1 - c) <= 3
  }

  function isFarFromEnemyCCs(r, c) {
    const enemyCCs = (allUnits || units).filter(u => u.owner_id !== currentPlayer?.player_id && (u.wg_unit_types?.name === 'Command Center' || u.wg_unit_types?.name === 'Command Ship'))
    return enemyCCs.every(cc => hexDistance(cc.grid_row, cc.grid_col, r, c) >= 20)
  }

  function distToNearestStructure(r, c) {
    let min = Infinity
    for (const s of myStructures) {
      const d = hexDistance(s.grid_row, s.grid_col, r, c)
      if (d < min) min = d
    }
    return min
  }

  function getDeployRange(unitTypeData) {
    if (!unitTypeData) return new Set()
    const cells = new Set()
    const isMiningStation = unitTypeData.name === 'Mining Station'
    if (unitTypeData.name === 'Command Center' || unitTypeData.name === 'Command Ship') {
      if (hasCommandStructureOnThisBoard) return new Set()
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          if (!getUnitAt(r, c) && !isImpassable(r, c) && isNearEdge(r, c) && isFarFromEnemyCCs(r, c)) {
            cells.add(`${r}-${c}`)
          }
        }
      }
    } else if (unitTypeData.name === 'Base' || unitTypeData.name === 'Factory') {
      if (!hasCommandCenter) return new Set()
      const range = 4
      for (const s of myStructures) {
        const rMin = Math.max(0, s.grid_row - range)
        const rMax = Math.min(rows - 1, s.grid_row + range)
        const cMin = Math.max(0, s.grid_col - range)
        const cMax = Math.min(cols - 1, s.grid_col + range)
        for (let r = rMin; r <= rMax; r++) {
          for (let c = cMin; c <= cMax; c++) {
            const key = `${r}-${c}`
            if (cells.has(key)) continue
            const d = hexDistance(s.grid_row, s.grid_col, r, c)
            if (d > 0 && d <= range && !getUnitAt(r, c) && !isImpassable(r, c)) {
              cells.add(key)
            }
          }
        }
      }
    } else if (hasCommandCenter) {
      const range = 3
      for (const s of myStructures) {
        const rMin = Math.max(0, s.grid_row - range)
        const rMax = Math.min(rows - 1, s.grid_row + range)
        const cMin = Math.max(0, s.grid_col - range)
        const cMax = Math.min(cols - 1, s.grid_col + range)
        for (let r = rMin; r <= rMax; r++) {
          for (let c = cMin; c <= cMax; c++) {
            const key = `${r}-${c}`
            if (cells.has(key)) continue
            const d = hexDistance(s.grid_row, s.grid_col, r, c)
            if (d > 0 && d <= range && !getUnitAt(r, c) && !isImpassable(r, c, isMiningStation ? 'Mining Station' : null)) {
              cells.add(key)
            }
          }
        }
      }
    }
    return cells
  }

  const deployRange = mode === 'deploy' && selectedUnitTypeData ? getDeployRange(selectedUnitTypeData) : new Set()

  const bayDeployRange = bayDeployInfo ? (() => {
    const cc = units.find(u => u.id === bayDeployInfo.shipId)
    if (!cc) return new Set()
    const cells = new Set()
    const range = 3
    const rMin = Math.max(0, cc.grid_row - range)
    const rMax = Math.min(rows - 1, cc.grid_row + range)
    const cMin = Math.max(0, cc.grid_col - range)
    const cMax = Math.min(cols - 1, cc.grid_col + range)
    for (let r = rMin; r <= rMax; r++) {
      for (let c = cMin; c <= cMax; c++) {
        const d = hexDistance(cc.grid_row, cc.grid_col, r, c)
        if (d > 0 && d <= range && !getUnitAt(r, c) && !isImpassable(r, c)) {
          cells.add(`${r}-${c}`)
        }
      }
    }
    return cells
  })() : new Set()

  const activeHangarDeploy = hangarDeployInfo || hangarDeployAllInfo || bsDeployInfo
  const hangarDeployRange = activeHangarDeploy ? (() => {
    const cc = units.find(u => u.id === activeHangarDeploy.shipId)
    if (!cc) return new Set()
    const cells = new Set()
    const range = 3
    const rMin = Math.max(0, cc.grid_row - range)
    const rMax = Math.min(rows - 1, cc.grid_row + range)
    const cMin = Math.max(0, cc.grid_col - range)
    const cMax = Math.min(cols - 1, cc.grid_col + range)
    for (let r = rMin; r <= rMax; r++) {
      for (let c = cMin; c <= cMax; c++) {
        const d = hexDistance(cc.grid_row, cc.grid_col, r, c)
        if (d > 0 && d <= range && !getUnitAt(r, c) && !isImpassable(r, c)) {
          cells.add(`${r}-${c}`)
        }
      }
    }
    return cells
  })() : new Set()

  const missileTargetRange = missileTargetInfo ? (() => {
    const ship = units.find(u => u.id === missileTargetInfo.shipId)
    if (!ship) return new Set()
    const MISSILE_RANGE = { tactical: 6, cruise: 11, ipbm: 999 }
    const range = MISSILE_RANGE[missileTargetInfo.missileType] || 5
    const cells = new Set()
    const rMin = Math.max(0, ship.grid_row - range)
    const rMax = Math.min(rows - 1, ship.grid_row + range)
    const cMin = Math.max(0, ship.grid_col - range)
    const cMax = Math.min(cols - 1, ship.grid_col + range)
    for (let r = rMin; r <= rMax; r++) {
      for (let c = cMin; c <= cMax; c++) {
        const d = hexDistance(ship.grid_row, ship.grid_col, r, c)
        if (d > 0 && d <= range) {
          cells.add(`${r}-${c}`)
        }
      }
    }
    return cells
  })() : new Set()

  const transportDeployRange = transportDeployInfo ? (() => {
    const struct = units.find(u => u.id === transportDeployInfo.structId)
    if (!struct) return new Set()
    const cells = new Set()
    const range = 3
    const rMin = Math.max(0, struct.grid_row - range)
    const rMax = Math.min(rows - 1, struct.grid_row + range)
    const cMin = Math.max(0, struct.grid_col - range)
    const cMax = Math.min(cols - 1, struct.grid_col + range)
    for (let r = rMin; r <= rMax; r++) {
      for (let c = cMin; c <= cMax; c++) {
        const d = hexDistance(struct.grid_row, struct.grid_col, r, c)
        if (d > 0 && d <= range && !getUnitAt(r, c) && !isImpassable(r, c)) {
          cells.add(`${r}-${c}`)
        }
      }
    }
    return cells
  })() : new Set()

  const unitFromTransportDeployRange = unitDeployFromTransportInfo ? (() => {
    const transport = units.find(u => u.id === unitDeployFromTransportInfo.transportId)
    if (!transport) return new Set()
    const neighbors = hexNeighborsBoard(transport.grid_row, transport.grid_col, rows, cols)
    const cells = new Set()
    for (const [nr, nc] of neighbors) {
      if (getUnitAt(nr, nc)) continue
      if (isImpassable(nr, nc)) continue
      cells.add(`${nr}-${nc}`)
    }
    return cells
  })() : new Set()

  const ccAdjacentTiles = useMemo(() => {
    const map = new Map()
    for (const u of units) {
      if (u.wg_unit_types?.name !== 'Command Center' && u.wg_unit_types?.name !== 'Command Ship') continue
      const pColor = getPlayerColor(u.owner_id)
      const isVis = u.owner_id === currentPlayer?.player_id || visibleTiles.has(`${u.grid_row}-${u.grid_col}`)
      if (!isVis) continue
      const neighbors = hexNeighborsBoard(u.grid_row, u.grid_col, rows, cols)
      for (const [nr, nc] of neighbors) {
        map.set(`${nr}-${nc}`, pColor)
      }
      map.set(`${u.grid_row}-${u.grid_col}`, pColor)
    }
    return map
  }, [units, currentPlayer, visibleTiles, rows, cols])

  function stopInertia() {
    if (inertiaRef.current) {
      cancelAnimationFrame(inertiaRef.current)
      inertiaRef.current = null
    }
  }

  function startInertia() {
    const el = boardRef.current
    if (!el) return
    const { vx, vy } = velocityRef.current
    if (Math.abs(vx) < 0.5 && Math.abs(vy) < 0.5) return
    const friction = 0.92
    function tick() {
      velocityRef.current.vx *= friction
      velocityRef.current.vy *= friction
      el.scrollLeft -= velocityRef.current.vx
      el.scrollTop -= velocityRef.current.vy
      if (Math.abs(velocityRef.current.vx) > 0.3 || Math.abs(velocityRef.current.vy) > 0.3) {
        inertiaRef.current = requestAnimationFrame(tick)
      }
    }
    inertiaRef.current = requestAnimationFrame(tick)
  }

  function beginPan(clientX, clientY) {
    stopInertia()
    panningRef.current = true
    setIsPanning(true)
    setTappedTile(null)
    const el = boardRef.current
    panStart.current = { x: clientX, y: clientY, scrollLeft: el.scrollLeft, scrollTop: el.scrollTop }
    lastMoveRef.current = { x: clientX, y: clientY, t: performance.now() }
    velocityRef.current = { vx: 0, vy: 0 }
  }

  function updatePan(clientX, clientY) {
    if (!panningRef.current) return
    const el = boardRef.current
    el.scrollLeft = panStart.current.scrollLeft - (clientX - panStart.current.x)
    el.scrollTop = panStart.current.scrollTop - (clientY - panStart.current.y)
    const now = performance.now()
    const dt = now - lastMoveRef.current.t || 16
    velocityRef.current = {
      vx: (clientX - lastMoveRef.current.x) / dt * 16,
      vy: (clientY - lastMoveRef.current.y) / dt * 16,
    }
    lastMoveRef.current = { x: clientX, y: clientY, t: now }
  }

  function endPan() {
    if (!panningRef.current) return
    panningRef.current = false
    startInertia()
    setTimeout(() => setIsPanning(false), 50)
  }

  useEffect(() => {
    function onKeyDown(e) {
      if (e.code === 'Space' && e.target.tagName !== 'INPUT' && e.target.tagName !== 'TEXTAREA') {
        e.preventDefault()
        if (!e.repeat) {
          spaceRef.current = true
          setSpaceHeld(true)
          document.body.style.overflow = 'hidden'
        }
      }
    }
    function onKeyUp(e) {
      if (e.code === 'Space') {
        e.preventDefault()
        spaceRef.current = false
        setSpaceHeld(false)
        endPan()
        document.body.style.overflow = ''
      }
    }
    function onMouseMove(e) { updatePan(e.clientX, e.clientY) }
    function onMouseUp() { endPan() }
    window.addEventListener('keydown', onKeyDown)
    window.addEventListener('keyup', onKeyUp)
    window.addEventListener('mousemove', onMouseMove)
    window.addEventListener('mouseup', onMouseUp)
    return () => {
      window.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('keyup', onKeyUp)
      window.removeEventListener('mousemove', onMouseMove)
      window.removeEventListener('mouseup', onMouseUp)
    }
  }, [])

  const wheelRafRef = useRef(null)
  const wheelPendingRef = useRef(null)

  const handleWheel = useCallback((e) => {
    e.preventDefault()
    const el = boardRef.current
    if (!el) return
    const factor = e.deltaY > 0 ? 0.94 : 1.065
    const current = zoomRef.current
    const newZoom = Math.min(1.5, Math.max(minZoom, current * factor))
    if (newZoom === current) return

    const rect = el.getBoundingClientRect()
    const cursorInViewX = e.clientX - rect.left
    const cursorInViewY = e.clientY - rect.top

    wheelPendingRef.current = { newZoom, cursorInViewX, cursorInViewY }

    if (!wheelRafRef.current) {
      wheelRafRef.current = requestAnimationFrame(() => {
        wheelRafRef.current = null
        const pending = wheelPendingRef.current
        if (!pending) return
        wheelPendingRef.current = null
        const { newZoom: nz, cursorInViewX: cvx, cursorInViewY: cvy } = pending
        const cur = zoomRef.current
        const oldPadX = boardPixelW * cur * wrapPad
        const oldPadY = boardPixelH * cur * wrapPad
        const boardX = (el.scrollLeft + cvx - oldPadX) / cur
        const boardY = (el.scrollTop + cvy - oldPadY) / cur

        zoomRef.current = nz
        baseZoomRef.current = nz
        const inner = boardInnerRef.current
        const wrapper = wrapperRef.current
        if (inner) inner.style.zoom = nz
        if (wrapper) wrapper.style.padding = `${boardPixelH * nz * wrapPad}px ${boardPixelW * nz * wrapPad}px`

        const newPadX = boardPixelW * nz * wrapPad
        const newPadY = boardPixelH * nz * wrapPad
        el.scrollLeft = newPadX + boardX * nz - cvx
        el.scrollTop = newPadY + boardY * nz - cvy
        setZoom(nz)
      })
    }
  }, [boardPixelW, boardPixelH, wrapPad, minZoom])

  const pinchRef = useRef(null)
  const touchVelocityRef = useRef({ vx: 0, vy: 0 })
  const touchLastMoveRef = useRef({ x: 0, y: 0, t: 0 })
  const pinchAnimRef = useRef(null)
  const targetPinchZoomRef = useRef(null)

  const handleTouchStart = useCallback((e) => {
    if (e.touches.length === 2) {
      e.preventDefault()
      stopInertia()
      if (pinchAnimRef.current) cancelAnimationFrame(pinchAnimRef.current)
      touchPanRef.current = null
      setTouchPanning(false)
      const dx = e.touches[0].clientX - e.touches[1].clientX
      const dy = e.touches[0].clientY - e.touches[1].clientY
      const midX = (e.touches[0].clientX + e.touches[1].clientX) / 2
      const midY = (e.touches[0].clientY + e.touches[1].clientY) / 2
      const el = boardRef.current
      pinchRef.current = {
        initialDist: Math.hypot(dx, dy),
        initialZoom: zoomRef.current,
        lastMidX: midX,
        lastMidY: midY,
        midX,
        midY,
      }
      targetPinchZoomRef.current = zoomRef.current
    } else if (e.touches.length === 1) {
      stopInertia()
      const el = boardRef.current
      touchPanRef.current = {
        x: e.touches[0].clientX,
        y: e.touches[0].clientY,
        scrollLeft: el.scrollLeft,
        scrollTop: el.scrollTop,
        moved: false,
      }
      touchLastMoveRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY, t: performance.now() }
      touchVelocityRef.current = { vx: 0, vy: 0 }
    }
  }, [])

  const applyZoomDirect = useCallback((newZoom) => {
    const inner = boardInnerRef.current
    const wrapper = wrapperRef.current
    if (!inner || !wrapper) return
    const base = baseZoomRef.current
    inner.style.transform = `scale(${newZoom / base})`
    inner.style.transformOrigin = '0 0'
    wrapper.style.width = `${boardPixelW * newZoom}px`
    wrapper.style.height = `${boardPixelH * newZoom}px`
    wrapper.style.padding = `${boardPixelH * newZoom * wrapPad}px ${boardPixelW * newZoom * wrapPad}px`
  }, [boardPixelW, boardPixelH, wrapPad])

  const commitZoom = useCallback((finalZoom) => {
    const inner = boardInnerRef.current
    const wrapper = wrapperRef.current
    if (!inner) return
    inner.style.zoom = finalZoom
    inner.style.transform = ''
    inner.style.transformOrigin = ''
    if (wrapper) {
      wrapper.style.width = ''
      wrapper.style.height = ''
    }
    baseZoomRef.current = finalZoom
  }, [])

  const handleTouchMove = useCallback((e) => {
    if (e.touches.length === 2 && pinchRef.current !== null) {
      e.preventDefault()
      const el = boardRef.current
      if (!el) return
      const dx = e.touches[0].clientX - e.touches[1].clientX
      const dy = e.touches[0].clientY - e.touches[1].clientY
      const dist = Math.hypot(dx, dy)
      const midX = (e.touches[0].clientX + e.touches[1].clientX) / 2
      const midY = (e.touches[0].clientY + e.touches[1].clientY) / 2

      const scale = dist / pinchRef.current.initialDist
      const rawTarget = pinchRef.current.initialZoom * scale
      targetPinchZoomRef.current = Math.min(1.5, Math.max(minZoom, rawTarget))

      pinchRef.current.midX = midX
      pinchRef.current.midY = midY

      if (!pinchAnimRef.current) {
        function tickPinch() {
          const p = pinchRef.current
          if (!p) { pinchAnimRef.current = null; return }
          const el = boardRef.current
          if (!el) { pinchAnimRef.current = null; return }

          const current = zoomRef.current
          const target = targetPinchZoomRef.current
          const diff = target - current
          const newZoom = Math.abs(diff) < 0.001 ? target : current + diff * 0.35

          const elRect = el.getBoundingClientRect()
          const cursorInViewX = p.midX - elRect.left
          const cursorInViewY = p.midY - elRect.top

          const oldPadX = boardPixelW * current * wrapPad
          const oldPadY = boardPixelH * current * wrapPad
          const boardX = (el.scrollLeft + cursorInViewX - oldPadX) / current
          const boardY = (el.scrollTop + cursorInViewY - oldPadY) / current

          const panDx = p.midX - p.lastMidX
          const panDy = p.midY - p.lastMidY
          p.lastMidX = p.midX
          p.lastMidY = p.midY

          zoomRef.current = newZoom
          applyZoomDirect(newZoom)

          const newPadX = boardPixelW * newZoom * wrapPad
          const newPadY = boardPixelH * newZoom * wrapPad
          el.scrollLeft = newPadX + boardX * newZoom - cursorInViewX - panDx
          el.scrollTop = newPadY + boardY * newZoom - cursorInViewY - panDy

          if (Math.abs(targetPinchZoomRef.current - newZoom) > 0.001 || p) {
            pinchAnimRef.current = requestAnimationFrame(tickPinch)
          } else {
            pinchAnimRef.current = null
          }
        }
        pinchAnimRef.current = requestAnimationFrame(tickPinch)
      }
    } else if (e.touches.length === 1 && touchPanRef.current) {
      const dx = e.touches[0].clientX - touchPanRef.current.x
      const dy = e.touches[0].clientY - touchPanRef.current.y
      if (!touchPanRef.current.moved && Math.hypot(dx, dy) > 5) {
        touchPanRef.current.moved = true
        setTouchPanning(true)
      }
      if (touchPanRef.current.moved) {
        e.preventDefault()
        const el = boardRef.current
        el.scrollLeft = touchPanRef.current.scrollLeft - dx
        el.scrollTop = touchPanRef.current.scrollTop - dy
        const now = performance.now()
        const dt = now - touchLastMoveRef.current.t || 16
        touchVelocityRef.current = {
          vx: (e.touches[0].clientX - touchLastMoveRef.current.x) / dt * 16,
          vy: (e.touches[0].clientY - touchLastMoveRef.current.y) / dt * 16,
        }
        touchLastMoveRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY, t: now }
      }
    }
  }, [applyZoomDirect])

  const handleTouchEnd = useCallback(() => {
    if (pinchRef.current !== null) {
      if (pinchAnimRef.current) cancelAnimationFrame(pinchAnimRef.current)
      pinchAnimRef.current = null
      const el = boardRef.current
      const finalZoom = zoomRef.current
      const oldBase = baseZoomRef.current
      if (el && oldBase !== finalZoom) {
        const vw = el.clientWidth
        const vh = el.clientHeight
        const oldPadX = boardPixelW * finalZoom * wrapPad
        const oldPadY = boardPixelH * finalZoom * wrapPad
        const centerBoardX = (el.scrollLeft + vw / 2 - oldPadX) / finalZoom
        const centerBoardY = (el.scrollTop + vh / 2 - oldPadY) / finalZoom
        commitZoom(finalZoom)
        setZoom(finalZoom)
        requestAnimationFrame(() => {
          const newPadX = boardPixelW * finalZoom * wrapPad
          const newPadY = boardPixelH * finalZoom * wrapPad
          el.scrollLeft = newPadX + centerBoardX * finalZoom - vw / 2
          el.scrollTop = newPadY + centerBoardY * finalZoom - vh / 2
        })
      } else {
        commitZoom(finalZoom)
        setZoom(finalZoom)
      }
      pinchRef.current = null
    }
    if (touchPanRef.current?.moved) {
      velocityRef.current = touchVelocityRef.current
      startInertia()
    }
    setTimeout(() => {
      touchPanRef.current = null
      setTouchPanning(false)
    }, 50)
  }, [])

  const hasCentered = useRef(false)
  useEffect(() => {
    const el = boardRef.current
    if (!el || hasCentered.current) return
    hasCentered.current = true
    requestAnimationFrame(() => {
      const vw = el.clientWidth
      const vh = el.clientHeight
      const isMobile = vw < 1024 || 'ontouchstart' in window
      let z = zoom
      if (isMobile) {
        const fitW = vw / boardPixelW
        const fitH = vh / boardPixelH
        z = Math.max(fitW, fitH, 0.15)
        z = Math.min(z, 1)
        zoomRef.current = z
        baseZoomRef.current = z
        setZoom(z)
      }
      const padX = boardPixelW * z * wrapPad
      const padY = boardPixelH * z * wrapPad
      const cc = myCommandCenter
      if (cc) {
        const ccX = cc.grid_col * HEX_W + (cc.grid_row & 1 ? HEX_W / 2 : 0) + RENDER_W / 2
        const ccY = cc.grid_row * ROW_H + RENDER_H / 2
        el.scrollLeft = padX + ccX * z - vw / 2
        el.scrollTop = padY + ccY * z - vh / 2
      } else {
        el.scrollLeft = padX + boardPixelW * z / 2 - vw / 2
        el.scrollTop = padY + boardPixelH * z / 2 - vh / 2
      }
    })
  })

  useEffect(() => {
    const el = boardRef.current
    if (!el) return
    el.addEventListener('wheel', handleWheel, { passive: false })
    el.addEventListener('touchstart', handleTouchStart, { passive: false })
    el.addEventListener('touchmove', handleTouchMove, { passive: false })
    el.addEventListener('touchend', handleTouchEnd)
    return () => {
      el.removeEventListener('wheel', handleWheel)
      el.removeEventListener('touchstart', handleTouchStart)
      el.removeEventListener('touchmove', handleTouchMove)
      el.removeEventListener('touchend', handleTouchEnd)
    }
  }, [handleWheel, handleTouchStart, handleTouchMove, handleTouchEnd])

  function handleBoardMouseDown(e) {
    if (spaceRef.current && e.button === 0) {
      e.preventDefault()
      beginPan(e.clientX, e.clientY)
    } else if (e.button === 1) {
      e.preventDefault()
      beginPan(e.clientX, e.clientY)
    }
  }

  async function handleCellClick(row, col) {
    if (spaceHeld || isPanning || touchPanning) return
    if (touchPanRef.current?.moved) return
    setError(null)

    setTappedTile(prev => (prev?.row === row && prev?.col === col) ? null : { row, col })
    setClickedTile({ row, col })

    const cellKey = `${row}-${col}`

    if (unitDeployFromTransportInfo) {
      if (!unitFromTransportDeployRange.has(cellKey)) {
        setUnitDeployFromTransportInfo(null)
        return
      }
      try {
        await deployFromTransport(unitDeployFromTransportInfo.transportId, row, col)
      } catch (err) {
        setError(err.message)
      }
      setUnitDeployFromTransportInfo(null)
      setSelectedUnitId(null)
      return
    }

    if (bayDeployInfo) {
      if (!bayDeployRange.has(cellKey)) {
        setBayDeployInfo(null)
        return
      }
      try {
        await deployFromBay(bayDeployInfo.shipId, bayDeployInfo.bayIndex, row, col)
      } catch (err) {
        setError(err.message)
      }
      setBayDeployInfo(null)
      return
    }

    if (bsDeployInfo) {
      if (!hangarDeployRange.has(cellKey)) {
        setBsDeployInfo(null)
        return
      }
      try {
        await deployDockedBattleship(bsDeployInfo.shipId, bsDeployInfo.bsSlotIndex, row, col)
      } catch (err) {
        setError(err.message)
      }
      setBsDeployInfo(null)
      return
    }

    if (hangarDeployInfo) {
      if (!hangarDeployRange.has(cellKey)) {
        setHangarDeployInfo(null)
        return
      }
      try {
        await deployFromHangar(hangarDeployInfo.shipId, hangarDeployInfo.hangarIndex, row, col)
      } catch (err) {
        setError(err.message)
      }
      setHangarDeployInfo(null)
      return
    }

    if (hangarDeployAllInfo) {
      if (!hangarDeployRange.has(cellKey)) {
        setHangarDeployAllInfo(null)
        return
      }
      try {
        await deployFromHangar(hangarDeployAllInfo.shipId, hangarDeployAllInfo.nextIndex, row, col)
        const ship = units.find(u => u.id === hangarDeployAllInfo.shipId)
        const hangar = ship?.upgrades?.hangar || []
        if (hangar.length <= 1) {
          setHangarDeployAllInfo(null)
        } else {
          setHangarDeployAllInfo({ shipId: hangarDeployAllInfo.shipId, nextIndex: 0 })
        }
      } catch (err) {
        setError(err.message)
        setHangarDeployAllInfo(null)
      }
      return
    }

    if (missileTargetInfo) {
      if (!missileTargetRange.has(cellKey)) {
        setMissileTargetInfo(null)
        return
      }
      try {
        await fireMissile(missileTargetInfo.shipId, missileTargetInfo.missileType, row, col, 'space', missileTargetInfo.warheadType)
      } catch (err) {
        setError(err.message)
      }
      setMissileTargetInfo(null)
      return
    }

    if (transportDeployInfo) {
      if (!transportDeployRange.has(cellKey)) {
        setTransportDeployInfo(null)
        return
      }
      try {
        await undockTransport(transportDeployInfo.structId, transportDeployInfo.transportIndex, row, col)
      } catch (err) {
        setError(err.message)
      }
      setTransportDeployInfo(null)
      return
    }

    const unit = getUnitAt(row, col)
    const isVisible = visibleTiles.has(cellKey)
    const showUnit = unit && (unit.owner_id === currentPlayer?.player_id || isVisible)

    if (selectedUnit && moveRange.has(cellKey) && !showUnit) {
      try {
        if (selectedUnit.upgrades?.autoPath) await clearAutoPath(selectedUnit.id)
        const moveDist = hexDistance(selectedUnit.grid_row, selectedUnit.grid_col, row, col)
        const usedAfter = (selectedUnit.moves_used || 0) + moveDist
        const maxRange = selectedUnit.wg_unit_types?.movement || 0
        await moveUnit(selectedUnit.id, row, col)
        if (usedAfter >= maxRange) {
          setSelectedUnitId(null)
          setCommandShipUnitId(null)
          setMode('select')
        }
      } catch (err) {
        setError(err.message)
      }
      return
    }

    if (selectedUnit && !showUnit && mode === 'select' && selectedUnit.owner_id === currentPlayer?.player_id && !moveRange.has(cellKey)) {
      const dist = hexDistance(selectedUnit.grid_row, selectedUnit.grid_col, row, col)
      if (dist > 0 && dist <= 40) {
        const unitName = selectedUnit.wg_unit_types?.name
        const path = findPath(selectedUnit.grid_row, selectedUnit.grid_col, row, col, unitName)
        if (path && path.length > 0) {
          try {
            await setAutoPath(selectedUnit.id, path)
          } catch (err) { setError(err.message) }
          return
        }
      }
    }

    if (showUnit) {
      if (unit.owner_id === currentPlayer?.player_id) {
        const toggling = commandShipUnitId === unit.id
        setCommandShipUnitId(toggling ? null : unit.id)
        setSelectedUnitId(toggling ? null : unit.id)
        setMode('select')
        setSpaceGuildOpen(false)
        setInspectedUnitId(null)
        setPanelOpen(!toggling)
        return
      }
      setInspectedUnitId(prev => prev === unit.id ? null : unit.id)
    } else {
      setInspectedUnitId(null)
    }

    if (spaceGuildTile && row === spaceGuildTile.grid_row && col === spaceGuildTile.grid_col) {
      setSpaceGuildOpen(prev => !prev)
      setSelectedUnitId(null)
      setCommandShipUnitId(null)
      setInspectedUnitId(null)
      setPanelOpen(true)
      return
    }

    if (!isMyTurn) return

    try {
      if (mode === 'deploy' && selectedUnitType) {
        if (!deployRange.has(cellKey)) {
          setError(hasCommandCenter ? 'Too far from Command Center or Base' : 'Deploy a Command Center first')
          return
        }
        const deployingType = unitTypes.find(t => t.id === selectedUnitType) || allUnitTypes?.find(t => t.id === selectedUnitType)
        if (deployingType?.name === 'Command Ship') {
          setShipModelPicker({ unitTypeId: selectedUnitType, row, col, type: 'ship' })
          return
        }
        if (deployingType?.name === 'Command Center') {
          setShipModelPicker({ unitTypeId: selectedUnitType, row, col, type: 'cc' })
          return
        }
        await deployUnit(selectedUnitType, row, col)
        setMode('select')
        setSelectedUnitType(null)
      } else if (mode === 'attack' && selectedUnit) {
        if (unit && unit.owner_id !== currentPlayer?.player_id) {
          await attackUnit(selectedUnit.id, unit.id)
          setSelectedUnitId(null)
          setMode('select')
        }
      } else if (mode === 'build' && selectedUnit) {
        if (buildRange.has(cellKey)) {
          try {
            await buildRoad(selectedUnit.id, row, col)
          } catch (buildErr) {
            setError(buildErr.message)
            return
          }
          setSelectedUnitId(null)
          setMode('select')
        } else {
          setError('Select an adjacent tile to build a road')
        }
      } else if (mode === 'destroy' && selectedUnit) {
        if (destroyRange.has(cellKey)) {
          try {
            await destroyRoad(selectedUnit.id, row, col)
          } catch (destroyErr) {
            setError(destroyErr.message)
            return
          }
          setSelectedUnitId(null)
          setMode('select')
        } else {
          setError('Select an adjacent road tile to destroy')
        }
      } else {
        if (unit && unit.owner_id === currentPlayer?.player_id) {
          setSelectedUnitId(unit.id)
          setCommandShipUnitId(null)
          setSpaceGuildOpen(false)
          setMode('select')
          setPanelOpen(true)
        } else {
          setSelectedUnitId(null)
        }
      }
    } catch (err) {
      setError(err.message)
    }
  }

  const boardCursor = isPanning ? 'grabbing' : spaceHeld ? 'grab' : 'default'

  const hexClip = 'polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)'

  const spaceGuildTile = useMemo(() => {
    if (activeBoard !== 'space') return null
    for (const t of tiles) {
      if (t.resource === 'space_guild') return t
    }
    return null
  }, [tiles, activeBoard])

  const resources = currentPlayer?.resources || {}

  const mobileInspectPanel = inspectedUnit ? (
    <div className="mb-3 p-3 rounded-lg flex items-center gap-3" style={{ backgroundColor: '#18191c', border: '1px solid #2a3140' }}>
      <img
        src={getUnitIcon(inspectedUnit.wg_unit_types, inspectedUnit)}
        alt={inspectedUnit.wg_unit_types?.name}
        className="w-10 h-10 object-contain shrink-0"
        style={{ filter: `drop-shadow(0 0 3px ${getPlayerColor(inspectedUnit.owner_id, inspectedUnit)})` }}
      />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: getPlayerColor(inspectedUnit.owner_id, inspectedUnit) }} />
          <span className="font-semibold text-xs truncate" style={{ color: '#c9d1d9' }}>
            {inspectedUnit.wg_unit_types?.name}
          </span>
        </div>
        <div className="flex gap-2 mt-0.5 text-[10px] font-mono" style={{ color: '#8b949e' }}>
          <span>HP {inspectedUnit.current_hp}/{inspectedUnit.wg_unit_types?.hp}</span>
          {(() => { const s = getUnitShield(inspectedUnit); return s && <span style={{ color: '#40a0e0' }}>SH {s.current}/{s.max}</span> })()}
          <span>ATK {inspectedUnit.wg_unit_types?.attack}</span>
          <span>DEF {inspectedUnit.wg_unit_types?.defense}</span>
          <span>MOV {inspectedUnit.wg_unit_types?.movement}</span>
        </div>
        <div className="flex gap-2 text-[10px] mt-0.5" style={{ color: '#4a5568' }}>
          <span>{inspectedUnit.isNPC ? 'Hostile Creature' : (allPlayers || players).find(p => p.player_id === inspectedUnit.owner_id)?.wg_profiles?.display_name}</span>
          <span className="font-mono">X{inspectedUnit.grid_row}/Y{inspectedUnit.grid_col}</span>
        </div>
        {inspectedUnit.upgrades?.loadedUnits?.length > 0 && (
          <div className="flex items-center gap-1 mt-0.5">
            <span className="text-[9px] uppercase tracking-widest font-semibold" style={{ color: '#4a5568' }}>Loaded:</span>
            {inspectedUnit.upgrades.loadedUnits.map((lu, li) => {
              const luType = allUnitTypes.find(ut => ut.id === lu.typeId)
              return <img key={li} src={getUnitIcon(luType)} alt={lu.typeName} title={lu.typeName} className="w-3.5 h-3.5 object-contain" />
            })}
          </div>
        )}
      </div>
      <button
        onClick={() => setInspectedUnitId(null)}
        className="w-5 h-5 rounded-full flex items-center justify-center text-xs cursor-pointer shrink-0"
        style={{ backgroundColor: '#21262d', color: '#8b949e', border: '1px solid #30363d' }}
      >
        &times;
      </button>
    </div>
  ) : null

  const sidebarContent = (
    <div className="space-y-3">
      <div className="p-3 rounded flex items-center justify-between lg:block cursor-pointer select-none" style={{ backgroundColor: '#18191c', border: '1px solid #2a3140' }} onClick={() => setTurnExpanded(e => !e)}>
        <div>
          <div className="text-[10px] uppercase tracking-widest font-semibold" style={{ color: '#4a5568' }}>Turn {game.turn_number}</div>
          <div className="font-semibold text-sm mt-0.5" style={{ color: '#c9d1d9' }}>
            {isMyTurn ? 'YOUR TURN' : 'Waiting...'}
          </div>
          <div className="text-[10px] font-mono mt-0.5" style={{ color: '#cca43b' }}>
            ⚒ {economy?.teamGold ?? (currentPlayer?.gold || 0)}
            {economy && (
              <span style={{ color: economy.netGold >= 0 ? '#6a9a72' : '#e05050' }}>
                {' '}({economy.netGold >= 0 ? '+' : ''}{economy.netGold}/turn)
              </span>
            )}
          </div>
          <div className="text-[10px] font-mono mt-0.5" style={{ color: '#8b949e' }}>
            +{economy?.net ?? 0} prod/turn
          </div>
          {turnExpanded && economy && (
            <div className="text-[9px] font-mono mt-1" style={{ color: '#6e7681' }}>
              <span style={{ color: '#6a9a72' }}>+{economy.production} prod</span>
              {economy.excavationIncome > 0 && <span style={{ color: '#c080e0' }}> +{economy.excavationIncome} excav</span>}
              <span style={{ color: '#e07050' }}> -{economy.goldUpkeep} gold upkeep</span>
            </div>
          )}
        </div>
        <div className="flex gap-3 lg:hidden">
          {[...new Set(players.map(p => p.color))].map(color => {
            const tGold = players.filter(p => p.color === color).reduce((s, p) => s + (p.gold || 0), 0)
            return (
              <div key={color} className="flex items-center gap-1">
                <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: color, border: '1px solid #2a3140' }} />
                <span className="text-xs font-mono" style={{ color: '#8b949e' }}>⚒{tGold}</span>
              </div>
            )
          })}
        </div>
      </div>
      {isMyTurn && (
        <button
          onClick={async (e) => {
            e.stopPropagation()
            try { await endTurn() } catch (err) { setError(err.message) }
          }}
          className="w-full px-3 py-2 text-sm font-semibold uppercase tracking-wide rounded transition-colors cursor-pointer"
          style={{ backgroundColor: '#2a2a1a', color: '#cca43b', border: '1px solid #4a4a2a' }}
        >
          End Turn
        </button>
      )}

      <div className="hidden lg:block p-3 rounded" style={{ backgroundColor: '#18191c', border: '1px solid #2a3140' }}>
        <div className="text-[10px] uppercase tracking-widest font-semibold mb-2" style={{ color: '#4a5568' }}>Operatives</div>
        {(() => {
          const teamColors = [...new Set(players.map(p => p.color))]
          return teamColors.map(color => {
            const teamMembers = players.filter(p => p.color === color)
            const tGold = teamMembers.reduce((s, p) => s + (p.gold || 0), 0)
            return (
              <div key={color}>
                <div className="flex items-center justify-between py-1.5"
                  style={{ color: color === game.current_team_color ? '#c9d1d9' : '#4a5568' }}>
                  <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: color, border: '1px solid #2a3140' }} />
                    <span className="text-sm font-medium">{teamMembers.map(p => p.wg_profiles?.display_name).join(', ')}</span>
                  </div>
                  <span className="text-sm font-mono" style={{ color: '#8b949e' }}>⚒{tGold}</span>
                </div>
              </div>
            )
          })
        })()}
      </div>

      {Object.keys(resources).length > 0 && (
        <div className="hidden lg:block p-3 rounded" style={{ backgroundColor: '#18191c', border: '1px solid #2a3140' }}>
          <div className="text-[10px] uppercase tracking-widest font-semibold mb-2" style={{ color: '#4a5568' }}>Resources</div>
          {Object.entries(resources).filter(([k, v]) => v > 0 && k !== 'excavations').map(([resId, amount]) => {
            const res = RESOURCE_BY_ID[resId]
            return (
              <div key={resId} className="flex items-center justify-between py-0.5">
                <div className="flex items-center gap-1.5">
                  {res?.icon && <img src={`/assets/${res.icon}`} alt={resId} className="w-3.5 h-3.5 object-contain" />}
                  <span className="text-xs" style={{ color: '#8b949e' }}>{res?.name || resId}</span>
                </div>
                <span className="text-xs font-mono" style={{ color: '#cca43b' }}>{amount}</span>
              </div>
            )
          })}
        </div>
      )}

      {isMyTurn && (
        <div className="p-3 rounded space-y-2" style={{ backgroundColor: '#18191c', border: '1px solid #2a3140' }}>

          <div className="flex gap-2 lg:flex-col">
            <button
              onClick={() => { setMode('deploy'); setSelectedUnitId(null) }}
              className="flex-1 lg:w-full px-3 py-2 text-sm font-semibold uppercase tracking-wide rounded transition-colors cursor-pointer"
              style={mode === 'deploy'
                ? { backgroundColor: '#1a3a2a', color: '#7ee787', border: '1px solid #2a5a3a' }
                : { backgroundColor: '#21262d', color: '#8b949e', border: '1px solid #30363d' }}
            >
              Deploy
            </button>
          </div>
        </div>
      )}

      {commandShipUnitId && (() => {
        const csUnit = units.find(u => u.id === commandShipUnitId)
        if (!csUnit) return null
        return (
          <CommandShipPanel
            unit={csUnit}
            isAdmin={isAdmin}
            onClose={() => { setCommandShipUnitId(null); setNumberedOverlays([]) }}
            onMove={() => {
              setSelectedUnitId(csUnit.id)
              setMode('select')
            }}
            onAttack={() => {
              setSelectedUnitId(csUnit.id)
              setMode('attack')
              setCommandShipUnitId(null)
              setPanelOpen(false)
            }}
            onBuild={() => {
              setSelectedUnitId(csUnit.id)
              setMode('build')
              setCommandShipUnitId(null)
              setPanelOpen(false)
            }}
            onDestroy={() => {
              setSelectedUnitId(csUnit.id)
              setMode('destroy')
              setCommandShipUnitId(null)
              setPanelOpen(false)
            }}
            onUpgrade={async (unitId, compartment, slotIndex, tierLevel) => {
              try { await upgradeShipCompartment(unitId, compartment, slotIndex, tierLevel) } catch (err) { setError(err.message) }
            }}
            onBuyMissile={async (unitId, missileType) => {
              try { await buyMissile(unitId, missileType) } catch (err) { setError(err.message) }
            }}
            onFireMissile={async (shipId, missileType, targetRow, targetCol, targetBoard, warheadType) => {
              if (targetBoard === 'space' && targetRow == null) {
                setMissileTargetInfo({ shipId, missileType, warheadType })
                setCommandShipUnitId(null)
                setPanelOpen(false)
                return
              }
              try { await fireMissile(shipId, missileType, targetRow, targetCol, targetBoard, warheadType) } catch (err) { setError(err.message) }
            }}
            missileFiredShips={missileFiredShips}
            onProduceWarhead={async (unitId, warheadType) => {
              try { await produceWarhead(unitId, warheadType) } catch (err) { setError(err.message) }
            }}
            onBuildConvoy={async (unitId) => {
              try { await buildConvoy(unitId) } catch (err) { setError(err.message) }
            }}
            onLoadUnit={async (shipId, convoyIdx, groundUnitId) => {
              try { await loadUnitToConvoy(shipId, convoyIdx, groundUnitId) } catch (err) { setError(err.message) }
            }}
            onLoadFromBay={async (shipId, convoyIdx, bayIdx) => {
              try { await loadFromBayToConvoy(shipId, convoyIdx, bayIdx) } catch (err) { setError(err.message) }
            }}
            onUnloadToHoldingBay={async (shipId, convoyIdx, unitIdx) => {
              try { await unloadToHoldingBay(shipId, convoyIdx, unitIdx) } catch (err) { setError(err.message) }
            }}
            onSendConvoy={async (shipId, convoyIdx, destId, order) => {
              try { await sendConvoy(shipId, convoyIdx, destId, order) } catch (err) { setError(err.message) }
            }}
            onDeployFromBay={(shipId, bayIdx) => {
              setBayDeployInfo({ shipId, bayIndex: bayIdx })
            }}
            onDeployFromHangar={(shipId, hangarIdx) => {
              setHangarDeployInfo({ shipId, hangarIndex: hangarIdx })
              setCommandShipUnitId(null)
              setPanelOpen(false)
            }}
            onProduceToHangar={async (shipId, unitTypeId, unitTypeName) => {
              try { await produceUnitToHangar(shipId, unitTypeId, unitTypeName) } catch (err) { setError(err.message) }
            }}
            onTransferHangar={async (fromShipId, hangarIdx, toShipId) => {
              try { await transferHangarUnit(fromShipId, hangarIdx, toShipId) } catch (err) { setError(err.message) }
            }}
            onTransferAllHangar={async (fromShipId, toShipId) => {
              try { await transferAllHangar(fromShipId, toShipId) } catch (err) { setError(err.message) }
            }}
            onDeployAllFromHangar={(shipId) => {
              setHangarDeployAllInfo({ shipId, nextIndex: 0 })
              setCommandShipUnitId(null)
              setPanelOpen(false)
            }}
            isDeployAllActive={!!hangarDeployAllInfo}
            onCancelDeployAll={() => setHangarDeployAllInfo(null)}
            onAddToHangar={async (shipId, unitId) => {
              try { await addToHangar(shipId, unitId) } catch (err) { setError(err.message) }
            }}
            onRenameUnit={async (unitId, newName) => {
              try { await renameUnit(unitId, newName) } catch (err) { setError(err.message) }
            }}
            onProduceBattleshipToBay={async (shipId, unitTypeId) => {
              try { await produceBattleshipToBay(shipId, unitTypeId) } catch (err) { setError(err.message) }
            }}
            onBuyMissileForDockedBs={async (shipId, missileType, bayIndex) => {
              try { await buyMissileForDockedBs(shipId, missileType, bayIndex) } catch (err) { setError(err.message) }
            }}
            onRenameDockedBs={async (shipId, bayIndex, newName) => {
              try { await renameDockedBattleship(shipId, bayIndex, newName) } catch (err) { setError(err.message) }
            }}
            onLoadToBsHangar={async (shipId, hangarIndex, bsSlotIndex) => {
              try { await loadToBattleshipHangar(shipId, hangarIndex, bsSlotIndex) } catch (err) { setError(err.message) }
            }}
            onDeployDockedBs={(shipId, bsSlotIndex) => {
              setBsDeployInfo({ shipId, bsSlotIndex })
              setCommandShipUnitId(null)
              setPanelOpen(false)
            }}
            onProduceFactoryItem={async (unitId, itemId) => {
              try { await produceFactoryItem(unitId, itemId) } catch (err) { setError(err.message) }
            }}
            onProduceUnit={async (shipId, unitTypeId, unitTypeName) => {
              try { await produceUnitToBay(shipId, unitTypeId, unitTypeName) } catch (err) { setError(err.message) }
            }}
            onLoadCargo={async (structId, convoyIdx, cargo) => {
              try { await loadCargoToConvoy(structId, convoyIdx, cargo) } catch (err) { setError(err.message) }
            }}
            onUnloadCargo={async (structId, convoyIdx) => {
              try { await unloadCargoFromConvoy(structId, convoyIdx) } catch (err) { setError(err.message) }
            }}
            onLoadInventoryToConvoy={async (structId, convoyIdx, itemId, amount) => {
              try { await loadInventoryToConvoy(structId, convoyIdx, itemId, amount) } catch (err) { setError(err.message) }
            }}
            onLoadSoldier={async (structId, transportIdx, soldierUnitId) => {
              try { await loadSoldierToTransport(structId, transportIdx, soldierUnitId) } catch (err) { setError(err.message) }
            }}
            onLoadBaySoldier={async (structId, transportIdx, bayIdx) => {
              try { await loadBaySoldierToTransport(structId, transportIdx, bayIdx) } catch (err) { setError(err.message) }
            }}
            onUnloadSoldier={async (structId, transportIdx, unitIdx) => {
              try { await unloadSoldierFromTransport(structId, transportIdx, unitIdx) } catch (err) { setError(err.message) }
            }}
            onUndock={(structId, transportIdx) => {
              setTransportDeployInfo({ structId, transportIndex: transportIdx })
              setCommandShipUnitId(null)
              setPanelOpen(false)
            }}
            onBuyAndLoadSoldier={async (structId, transportIdx, unitTypeId, unitTypeName) => {
              try { await buyAndLoadToTransport(structId, transportIdx, unitTypeId, unitTypeName) } catch (err) { setError(err.message) }
            }}
            groundUnits={allUnits.filter(u =>
              (u.board || 'ground') === 'ground' &&
              u.owner_id === csUnit.owner_id &&
              u.is_alive &&
              u.wg_unit_types?.name !== 'Command Center' &&
              u.wg_unit_types?.name !== 'Base' &&
              u.wg_unit_types?.name !== 'Factory' &&
              u.wg_unit_types?.name !== 'Mining Station'
            )}
            unitTypes={allUnitTypes || unitTypes}
            teamGold={economy?.teamGold ?? currentPlayer?.gold ?? 0}
            playerResources={currentPlayer?.resources || {}}
            allUnits={allUnits}
            nearbyUnits={units.filter(u =>
              u.id !== csUnit.id &&
              u.owner_id === csUnit.owner_id &&
              u.is_alive !== false &&
              hexDistance(csUnit.grid_row, csUnit.grid_col, u.grid_row, u.grid_col) <= 4
            )}
            onSetNumberedOverlays={setNumberedOverlays}
            onLevelUp={async (unitId) => {
              try { await levelUpUnit(unitId) } catch (err) { setError(err.message) }
            }}
            onExcavate={async (unitId) => {
              try { await excavate(unitId) } catch (err) { setError(err.message) }
            }}
            onClearAutoPath={async (unitId) => {
              try { await clearAutoPath(unitId) } catch (err) { setError(err.message) }
            }}
            onDeployFromTransportUnit={(transportId) => {
              setUnitDeployFromTransportInfo({ transportId })
              setCommandShipUnitId(null)
              setPanelOpen(false)
            }}
            economy={economy}
            availableProduction={productionPerTurn - (getUsedProduction?.() || 0)}
          />
        )
      })()}

      {spaceGuildOpen && (() => {
        const GUILD_SHIPS = new Set(['Command Ship', 'Battleship'])
        const myGuildShips = allUnits.filter(u =>
          u.owner_id === currentPlayer?.player_id &&
          GUILD_SHIPS.has(u.wg_unit_types?.name) &&
          u.is_alive !== false
        )
        return (
          <SpaceGuildPanel
            guildShips={myGuildShips}
            onClose={() => setSpaceGuildOpen(false)}
          />
        )
      })()}

      {mode === 'deploy' && isMyTurn && (
        <div className="p-3 rounded" style={{ backgroundColor: '#18191c', border: '1px solid #2a3140' }}>
          <div className="text-[10px] uppercase tracking-widest font-semibold mb-2" style={{ color: '#4a5568' }}>
            Requisition — <span className="font-mono" style={{ color: '#8b949e' }}>⚒ {economy?.teamGold ?? currentPlayer?.gold}</span>
          </div>
          {!hasCommandCenter && (
            <div className="text-xs mb-2 px-2 py-1 rounded" style={{ backgroundColor: '#1a1a0d', border: '1px solid #3d3d1a', color: '#cca43b' }}>
              Deploy a Command Center first
            </div>
          )}
          <div className="grid grid-cols-2 lg:grid-cols-1 gap-1.5">
            {sortedUnitTypes.map(ut => {
              const isBuilding = ut.name === 'Base' || ut.name === 'Factory'
              const isCC = ut.name === 'Command Center' || ut.name === 'Command Ship'
              const needsCC = !isCC && !isBuilding && !hasCommandCenter
              const alreadyHasCC = isCC && hasCommandStructureOnThisBoard
              const buildingNeedsCC = isBuilding && !hasCommandCenter
              const cantAfford = !isAdmin && (economy?.teamGold ?? currentPlayer?.gold ?? 0) < ut.cost
              const isBattleship = ut.name === 'Battleship'
              let missingMats = false
              if (isBattleship && !isAdmin) {
                const csUnit = units.find(u => u.owner_id === currentPlayer?.player_id && u.wg_unit_types?.name === 'Command Ship')
                const inv = csUnit?.upgrades?.inventory || {}
                missingMats = !csUnit || (inv.uranium || 0) < 1 || (inv.iron || 0) < 50 || (inv.aluminum || 0) < 30
              }
              return (
              <button
                key={ut.id}
                onClick={() => setSelectedUnitType(ut.id)}
                disabled={cantAfford || needsCC || alreadyHasCC || buildingNeedsCC || missingMats}
                className="flex flex-col lg:flex-row items-center lg:justify-between p-2 lg:p-3 rounded text-sm lg:text-base transition-colors disabled:opacity-20 cursor-pointer gap-1 lg:gap-3"
                style={selectedUnitType === ut.id
                  ? { backgroundColor: '#1a2a3a', color: '#c9d1d9', border: '1px solid #3a4a5a' }
                  : { backgroundColor: '#111214', color: '#c9d1d9', border: '1px solid #2a3140' }}
              >
                <img src={getUnitIcon(ut)} alt={ut.name} className="w-10 h-10 lg:w-16 lg:h-16 object-contain shrink-0" />
                <div className="flex flex-col items-center lg:items-start min-w-0 flex-1">
                  <span className="font-medium text-xs lg:text-sm truncate max-w-full">{ut.name}</span>
                  {isBattleship && (
                    <span className="text-[8px] lg:text-[10px] font-mono" style={{ color: '#6e7681' }}>1 uranium · 50 iron · 30 aluminum</span>
                  )}
                </div>
                <span className="shrink-0 text-xs lg:text-lg font-mono font-semibold" style={{ color: '#8b949e' }}>⚒{ut.cost}</span>
              </button>
              )
            })}
          </div>
        </div>
      )}

      {error && (
        <div className="p-2 rounded text-sm font-mono" style={{ backgroundColor: '#1a0d0d', border: '1px solid #3d1a1a', color: '#f47067' }}>
          {error}
        </div>
      )}
    </div>
  )

  return (
    <>
    <style>{`
      @keyframes unitFadeIn{from{opacity:0;transform:scale(0.5)}to{opacity:1;transform:scale(1)}}
      @keyframes unitFadeOut{from{opacity:1;transform:scale(1)}to{opacity:0;transform:scale(0.5)}}
      ${slideKeyframes}
    `}</style>
    <div className={`flex flex-col lg:flex-row h-full ${isFullscreen ? 'gap-0' : 'gap-3 lg:gap-4'}`}>
      <div className="hidden lg:flex lg:flex-col lg:w-80 shrink-0 lg:max-h-[calc(100vh-5rem)]">
        <div className="flex-1 overflow-y-auto min-h-0">
          {sidebarContent}
        </div>
        <div className="shrink-0 mt-2 space-y-1.5">
          {battleLogOpen ? (
            <BattleLog
              battleLog={battleLog || []}
              currentPlayer={currentPlayer}
              onClose={() => setBattleLogOpen(false)}
            />
          ) : (
            <button
              onClick={() => { setBattleLogOpen(true); setChatOpen(false) }}
              className="w-full flex items-center justify-center gap-2 py-2 rounded text-xs font-semibold cursor-pointer"
              style={{ backgroundColor: '#18191c', border: '1px solid #2a3140', color: '#8b949e' }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z" /><line x1="3" y1="6" x2="21" y2="6" /><path d="M16 10a4 4 0 01-8 0" />
              </svg>
              Battle Log{(battleLog || []).length > 0 ? ` (${(battleLog || []).length})` : ''}
            </button>
          )}
          {chatOpen ? (
            <TeamChat
              gameId={game.id}
              currentPlayer={currentPlayer}
              players={allPlayers || players}
              onClose={() => setChatOpen(false)}
            />
          ) : (
            <button
              onClick={() => { setChatOpen(true); setBattleLogOpen(false) }}
              className="w-full flex items-center justify-center gap-2 py-2 rounded text-xs font-semibold cursor-pointer"
              style={{ backgroundColor: '#18191c', border: '1px solid #2a3140', color: '#8b949e' }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
              </svg>
              Team Chat
            </button>
          )}
        </div>
      </div>

      <div className="flex-1 min-h-0 flex flex-row overflow-hidden">
      <div
        ref={boardRef}
        className="flex-1 overflow-auto min-w-0"
        style={{ cursor: boardCursor, touchAction: 'none' }}
        onMouseDown={handleBoardMouseDown}
      >
        <div ref={wrapperRef} style={{
          display: 'inline-block',
          padding: `${boardPixelH * zoom * wrapPad}px ${boardPixelW * zoom * wrapPad}px`,
        }}>
          <div
            ref={boardInnerRef}
            className="relative"
            style={{
              width: boardPixelW,
              height: boardPixelH,
              zoom: zoom,
            }}
          >
            {Array.from({ length: rows * cols }, (_, i) => {
              const row = Math.floor(i / cols)
              const col = i % cols
              const unit = getUnitAt(row, col)
              const cellKey = `${row}-${col}`
              const isVisible = visibleTiles.has(cellKey)
              const isInMoveRange = moveRange.has(cellKey)
              const isInAttackRange = attackRange.has(cellKey)
              const isInDeployRange = deployRange.has(cellKey)
              const isInBuildRange = buildRange.has(cellKey)
              const isInDestroyRange = destroyRange.has(cellKey)
              const isInBayDeployRange = bayDeployRange.has(cellKey)
              const isInHangarDeployRange = hangarDeployRange.has(cellKey)
              const isInMissileRange = missileTargetRange.has(cellKey)
              const isInTransportDeployRange = transportDeployRange.has(cellKey)
              const isInUnitFromTransportRange = unitFromTransportDeployRange.has(cellKey)
              const isOnAutoPath = autoPathTiles.has(cellKey)
              const isSelected = selectedUnit && selectedUnit.grid_row === row && selectedUnit.grid_col === col
              const isClicked = clickedTile?.row === row && clickedTile?.col === col
              const isHovered = hoveredTile?.row === row && hoveredTile?.col === col

              const board = activeBoard || 'ground'
              const fullKey = `${board}-${row}-${col}`
              const isDiscovered = discoveredTiles.has(fullKey)
              const showUnit = unit && (unit.owner_id === currentPlayer?.player_id || isVisible)

              const tileBg = getTileColor(row, col, isVisible, isDiscovered)
              const tileData = tileMap.get(cellKey)
              const isMountain = tileData?.terrain === 'mountain' && (isVisible || isDiscovered)
              const isMountainPeak = isMountain && !mountainInterior.has(cellKey)
              const isMountainInner = isMountain && mountainInterior.has(cellKey)
              const isMountainShadow = mountainShadowTiles.has(cellKey)

              let mountainBg = null
              if (isMountain) {
                const h = tileHash(row, col)
                const lightJitter = (h - 0.5) * 0.12
                const darkJitter = ((h * 7 + 0.3) % 1 - 0.5) * 0.12
                const isTundra = game.terrain_theme === 'crystal_tundra'
                const tealLight = isTundra && ((h * 17 + 0.4) % 1) < 0.25
                const [lr, lg, lb] = isTundra ? (tealLight ? parseHex('#88c0cc') : parseHex('#c0e2ea')) : parseHex(tileBg)
                const lightDim = isTundra ? (tealLight ? 0.88 : 0.92) : 0.92
                const lightColor = toHex(lr * lightDim * (1 + lightJitter), lg * lightDim * (1 + lightJitter), lb * lightDim * (1 + lightJitter))
                const [mr, mg, mb] = parseHex(tileBg)
                const [gr, gg, gb] = isTundra ? parseHex('#3a7080') : [0, 0, 0]
                const shadowR = isTundra ? gr * 0.55 : lr * 0.72
                const shadowG = isTundra ? gg * 0.55 : lg * 0.69
                const shadowB = isTundra ? gb * 0.55 : lb * 0.67
                let shadowMul = 1
                if (isTundra) {
                  const h2 = ((h * 13 + 0.7) % 1)
                  if (h2 < 0.3) shadowMul = 1.12
                  else if (h2 > 0.88) shadowMul = 0.78
                }
                const darkColor = toHex(shadowR * (1 + darkJitter) * shadowMul, shadowG * (1 + darkJitter) * shadowMul, shadowB * (1 + darkJitter) * shadowMul)
                if (isMountainPeak) {
                  const lightPct = isTundra ? Math.floor(25 + ((h * 11 + 0.2) % 1) * 25) : 50
                  mountainBg = `linear-gradient(to bottom, ${lightColor} ${lightPct}%, ${darkColor} ${lightPct}%)`
                } else if (isTundra && h < 0.4) {
                  const snowJitter = (h - 0.2) * 0.08
                  mountainBg = toHex(0.92 * (1 + snowJitter), 0.90 * (1 + snowJitter), 0.86 * (1 + snowJitter))
                } else {
                  mountainBg = darkColor
                }
              }

              const voidStarBg = null

              let bg
              let moveOverlay = false
              if (isSelected) bg = '#203348'
              else if (isInMissileRange) bg = '#2a181d'
              else if (isInBayDeployRange || isInHangarDeployRange || isInTransportDeployRange || isInUnitFromTransportRange) bg = '#203320'
              else if (isInDeployRange) bg = '#203320'
              else if (isInMoveRange) { bg = tileBg; moveOverlay = true }
              else if (isInAttackRange) bg = '#2a181d'
              else if (isInBuildRange) bg = '#2a2a1a'
              else if (isInDestroyRange) bg = '#2a181d'
              else bg = tileBg

              const isCC = showUnit && (unit?.wg_unit_types?.name === 'Command Center' || unit?.wg_unit_types?.name === 'Command Ship')
              const unitTeamColor = null

              const x = col * HEX_W + (row & 1 ? HEX_W / 2 : 0) + GAP / 2
              const y = row * ROW_H + GAP / 2

              return (
                <div
                  key={cellKey}
                  onClick={() => handleCellClick(row, col)}
                  onMouseEnter={() => setHoveredTile({ row, col })}
                  onMouseLeave={() => setHoveredTile(null)}
                  className="absolute flex items-center justify-center cursor-pointer"
                  style={{
                    left: x,
                    top: y,
                    width: RENDER_W,
                    height: RENDER_H,
                    clipPath: hexClip,
                    ...(mountainBg && !unitTeamColor
                      ? { background: mountainBg }
                      : voidStarBg
                        ? { background: `${voidStarBg}, ${bg}` }
                        : { backgroundColor: unitTeamColor || bg }),
                    pointerEvents: spaceHeld ? 'none' : 'auto',
                  }}
                >
                  {(isClicked || isHovered) && (() => {
                    const p = 3
                    const w = RENDER_W, h = RENDER_H
                    return (
                      <svg className="absolute inset-0 z-[5] pointer-events-none" width={w} height={h} viewBox={`0 0 ${w} ${h}`}>
                        <polygon
                          points={`${w/2},${p} ${w-p},${h*0.25+p*0.5} ${w-p},${h*0.75-p*0.5} ${w/2},${h-p} ${p},${h*0.75-p*0.5} ${p},${h*0.25+p*0.5}`}
                          fill="none"
                          stroke={isClicked ? 'rgba(180, 210, 255, 0.5)' : 'rgba(180, 210, 255, 0.22)'}
                          strokeWidth="2"
                          strokeLinejoin="round"
                        />
                      </svg>
                    )
                  })()}
                  {isInAttackRange && mode === 'attack' && (() => {
                    const p = 3
                    const w = RENDER_W, h = RENDER_H
                    return (
                      <svg className="absolute inset-0 z-[5] pointer-events-none" width={w} height={h} viewBox={`0 0 ${w} ${h}`}>
                        <polygon
                          points={`${w/2},${p} ${w-p},${h*0.25+p*0.5} ${w-p},${h*0.75-p*0.5} ${w/2},${h-p} ${p},${h*0.75-p*0.5} ${p},${h*0.25+p*0.5}`}
                          fill="none"
                          stroke="rgba(244, 112, 103, 0.7)"
                          strokeWidth="2"
                          strokeLinejoin="round"
                        />
                      </svg>
                    )
                  })()}
                  {moveOverlay && (
                    <div className="absolute inset-0 z-[1]" style={{ backgroundColor: (activeBoard || 'ground') === 'space' ? 'rgba(180, 200, 220, 0.18)' : 'rgba(0, 0, 0, 0.3)', clipPath: hexClip }} />
                  )}
                  {isOnAutoPath && (
                    <div className="absolute inset-0 z-[2] flex items-center justify-center pointer-events-none" style={{ clipPath: hexClip }}>
                      <div className="rounded-full" style={{ width: 8, height: 8, backgroundColor: 'rgba(100, 180, 255, 0.5)' }} />
                    </div>
                  )}
                  {isMountainShadow && (isVisible || isDiscovered) && (
                    <div className="absolute inset-0 z-[1]" style={{ backgroundColor: game.terrain_theme === 'crystal_tundra' ? 'rgba(0, 0, 0, 0.22)' : 'rgba(0, 0, 0, 0.12)', clipPath: hexClip }} />
                  )}
                  {(isCC || unitTeamColor) && (
                    <div
                      className="absolute inset-0 flex items-center justify-center"
                      style={{
                        clipPath: hexClip,
                        backgroundColor: bg,
                        margin: 2,
                      }}
                    />
                  )}
                  {/* ore icons disabled */}
                  {showUnit && unit.wg_unit_types?.name !== 'Command Center' && unit.wg_unit_types?.name !== 'Command Ship' && unit.wg_unit_types?.name !== 'Battleship' && unit.wg_unit_types?.icon !== 'hostilebattleship.png' && !slidingUnits.has(unit.id) && (() => {
                    const pColor = getPlayerColor(unit.owner_id, unit)
                    const hpRatio = unit.current_hp / getMaxHp(unit)
                    const isReconDrone = unit.wg_unit_types?.name === 'Recon Drone'
                    const sizeMultiplier = isReconDrone ? 0.774 : 1.032
                    const tokenSize = (Math.min(RENDER_W, RENDER_H) - 4) * sizeMultiplier
                    const fadeIn = unitAnimations.get(unit.id)?.type === 'fadeIn'
                    return (
                      <div className="relative flex items-center justify-center z-10" style={{ width: tokenSize, height: tokenSize, ...(fadeIn ? { animation: 'unitFadeIn 0.4s ease' } : {}) }}>
                        <div
                          className="absolute inset-0 rounded-full overflow-hidden"
                          style={{ border: `3px solid ${pColor}`, boxShadow: `0 0 8px ${pColor}40` }}
                        >
                          <img
                            src={getUnitIcon(unit.wg_unit_types, unit)}
                            alt={unit.wg_unit_types?.name}
                            className="w-full h-full object-cover pointer-events-none"
                          />
                        </div>
                        <div
                          className="absolute left-1/2 -translate-x-1/2 rounded-full z-20"
                          style={{
                            bottom: 3,
                            height: 4,
                            width: `${hpRatio * 60}%`,
                            backgroundColor: hpRatio > 0.5 ? '#4a8060' : '#804a4a',
                            minWidth: 6,
                            boxShadow: '0 0 2px #000',
                          }}
                        />
                      </div>
                    )
                  })()}
                </div>
              )
            })}
            {spaceGuildTile && (visibleTiles.has(`${spaceGuildTile.grid_row}-${spaceGuildTile.grid_col}`) || discoveredTiles.has(`${activeBoard || 'ground'}-${spaceGuildTile.grid_row}-${spaceGuildTile.grid_col}`)) && (() => {
              const sgR = spaceGuildTile.grid_row, sgC = spaceGuildTile.grid_col
              const sgX = sgC * HEX_W + (sgR & 1 ? HEX_W / 2 : 0) + RENDER_W / 2
              const sgY = sgR * ROW_H + RENDER_H / 2
              const sgSize = HEX_W * 2.479
              const sgVisible = visibleTiles.has(`${sgR}-${sgC}`)
              return (
                <div
                  key="sg-overlay"
                  className="absolute pointer-events-none z-10"
                  style={{
                    left: sgX - sgSize / 2,
                    top: sgY - sgSize / 2,
                    width: sgSize,
                    height: sgSize,
                  }}
                >
                  <div className="absolute inset-0 rounded-full overflow-hidden" style={{ border: '2px solid #6cb4e6', boxShadow: '0 0 8px #6cb4e640' }}>
                    <img
                      src="/assets/spaceguild.png"
                      alt="Space Guild"
                      className="w-full h-full object-cover"
                      style={{ opacity: sgVisible ? 1 : 0.5 }}
                    />
                  </div>
                </div>
              )
            })()}
            {units.filter(u => (u.wg_unit_types?.name === 'Command Center' || u.wg_unit_types?.name === 'Command Ship') && !slidingUnits.has(u.id) && (u.owner_id === currentPlayer?.player_id || visibleTiles.has(`${u.grid_row}-${u.grid_col}`))).map(cc => {
              const ccX = cc.grid_col * HEX_W + (cc.grid_row & 1 ? HEX_W / 2 : 0) + RENDER_W / 2
              const ccY = cc.grid_row * ROW_H + RENDER_H / 2
              const ccSize = HEX_W * 2.746
              const hpRatio = cc.current_hp / getMaxHp(cc)
              const pColor = getPlayerColor(cc.owner_id)
              const ccFadeIn = unitAnimations.get(cc.id)?.type === 'fadeIn'
              return (
                <div
                  key={`cc-overlay-${cc.id}`}
                  className="absolute pointer-events-none z-10"
                  style={{
                    left: ccX - ccSize / 2,
                    top: ccY - ccSize / 2,
                    width: ccSize,
                    height: ccSize,
                    ...(ccFadeIn ? { animation: 'unitFadeIn 0.4s ease' } : {}),
                  }}
                >
                  <div className="absolute inset-0 rounded-full overflow-hidden" style={{ border: `3.8px solid ${pColor}`, boxShadow: `0 0 8px ${pColor}40` }}>
                    <img
                      src={getUnitIcon(cc.wg_unit_types, cc)}
                      alt={cc.wg_unit_types?.name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div
                    className="absolute left-1/2 -translate-x-1/2 rounded-full z-20"
                    style={{
                      bottom: 4,
                      height: 3,
                      width: `${hpRatio * 50}%`,
                      backgroundColor: hpRatio > 0.5 ? '#4a8060' : '#804a4a',
                      minWidth: 4,
                      boxShadow: '0 0 2px #000',
                    }}
                  />
                </div>
              )
            })}
            {units.filter(u => (u.wg_unit_types?.name === 'Battleship' || u.wg_unit_types?.icon === 'hostilebattleship.png') && !slidingUnits.has(u.id) && (u.owner_id === currentPlayer?.player_id || visibleTiles.has(`${u.grid_row}-${u.grid_col}`))).map(bs => {
              const bsX = bs.grid_col * HEX_W + (bs.grid_row & 1 ? HEX_W / 2 : 0) + RENDER_W / 2
              const bsY = bs.grid_row * ROW_H + RENDER_H / 2
              const isBattleship = bs.wg_unit_types?.name === 'Battleship'
              const bsSize = HEX_W * 1.62
              const hpRatio = bs.current_hp / getMaxHp(bs)
              const pColor = getPlayerColor(bs.owner_id, bs)
              const bsFadeIn = unitAnimations.get(bs.id)?.type === 'fadeIn'
              return (
                <div
                  key={`bs-overlay-${bs.id}`}
                  className="absolute pointer-events-none z-10"
                  style={{
                    left: bsX - bsSize / 2,
                    top: bsY - bsSize / 2,
                    width: bsSize,
                    height: bsSize,
                    ...(bsFadeIn ? { animation: 'unitFadeIn 0.4s ease' } : {}),
                  }}
                >
                  <div className="absolute inset-0 rounded-full overflow-hidden" style={{ border: `3px solid ${pColor}`, boxShadow: `0 0 8px ${pColor}40` }}>
                    <img
                      src={getUnitIcon(bs.wg_unit_types, bs)}
                      alt={bs.wg_unit_types?.name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div
                    className="absolute left-1/2 -translate-x-1/2 rounded-full z-20"
                    style={{
                      bottom: 3,
                      height: 4,
                      width: `${hpRatio * 60}%`,
                      backgroundColor: hpRatio > 0.5 ? '#4a8060' : '#804a4a',
                      minWidth: 6,
                      boxShadow: '0 0 2px #000',
                    }}
                  />
                </div>
              )
            })}
            {numberedOverlays.map(({ unitId, number }) => {
              const ov = units.find(u => u.id === unitId)
              if (!ov) return null
              const ovX = ov.grid_col * HEX_W + (ov.grid_row & 1 ? HEX_W / 2 : 0) + RENDER_W / 2
              const ovY = ov.grid_row * ROW_H + RENDER_H / 2
              const isOvCC = ov.wg_unit_types?.name === 'Command Ship' || ov.wg_unit_types?.name === 'Command Center'
              const ovSize = isOvCC ? HEX_W * 2.746 : HEX_W * 1.62
              return (
                <div
                  key={`num-overlay-${unitId}`}
                  className="absolute z-20 pointer-events-none flex items-center justify-center"
                  style={{
                    left: ovX - ovSize / 2,
                    top: ovY - ovSize / 2,
                    width: ovSize,
                    height: ovSize,
                  }}
                >
                  <div
                    className="rounded-full flex items-center justify-center"
                    style={{
                      width: ovSize,
                      height: ovSize,
                      backgroundColor: 'rgba(0,0,0,0.55)',
                      fontSize: ovSize * 0.4,
                      fontWeight: 'bold',
                      color: '#fff',
                      textShadow: '0 0 4px #000',
                    }}
                  >
                    {number}
                  </div>
                </div>
              )
            })}
            {[...slidingUnits.entries()].map(([id, sl]) => {
              const u = sl.unit
              const pColor = getPlayerColor(u.owner_id, u)
              const isCC = u.wg_unit_types?.name === 'Command Ship' || u.wg_unit_types?.name === 'Command Center'
              const isBattleship = u.wg_unit_types?.name === 'Battleship'
              const isWarship = u.wg_unit_types?.icon === 'hostilebattleship.png'
              const tokenSize = isCC ? HEX_W * 2.746 : isBattleship ? HEX_W * 1.62 : isWarship ? HEX_W * 1.62 : (Math.min(RENDER_W, RENDER_H) - 4) * 1.032
              const hpRatio = u.current_hp / getMaxHp(u)
              return (
                <div
                  key={`slide-${id}`}
                  className="absolute pointer-events-none z-10"
                  style={{
                    width: tokenSize,
                    height: tokenSize,
                    animation: `slide-${id} 0.5s ease forwards`,
                    marginLeft: -tokenSize / 2,
                    marginTop: -tokenSize / 2,
                  }}
                >
                  <div className="absolute inset-0 rounded-full overflow-hidden" style={{ border: `${isCC ? '3.8px' : '3px'} solid ${pColor}`, boxShadow: `0 0 8px ${pColor}40` }}>
                    <img src={getUnitIcon(u.wg_unit_types, u)} alt="" className="w-full h-full object-cover pointer-events-none" />
                  </div>
                  <div
                    className="absolute left-1/2 -translate-x-1/2 rounded-full z-20"
                    style={{
                      bottom: isCC ? 4 : 3,
                      height: isCC ? 3 : 4,
                      width: `${hpRatio * (isCC ? 50 : 60)}%`,
                      backgroundColor: hpRatio > 0.5 ? '#4a8060' : '#804a4a',
                      minWidth: isCC ? 4 : 6,
                      boxShadow: '0 0 2px #000',
                    }}
                  />
                </div>
              )
            })}
            {deadUnits.map(du => {
              const duX = du.col * HEX_W + (du.row & 1 ? HEX_W / 2 : 0) + RENDER_W / 2
              const duY = du.row * ROW_H + RENDER_H / 2
              const pColor = getPlayerColor(du.ownerId, du.unit)
              const isCC = du.unitType?.name === 'Command Ship' || du.unitType?.name === 'Command Center'
              const isBattleship = du.unitType?.name === 'Battleship'
              const isWarship = du.unitType?.icon === 'hostilebattleship.png'
              const size = isCC ? HEX_W * 2.746 : isBattleship ? HEX_W * 1.62 : isWarship ? HEX_W * 1.62 : (Math.min(RENDER_W, RENDER_H) - 4) * 1.032
              return (
                <div
                  key={`dead-${du.id}`}
                  className="absolute pointer-events-none z-10"
                  style={{
                    left: duX - size / 2,
                    top: duY - size / 2,
                    width: size,
                    height: size,
                    animation: 'unitFadeOut 0.5s ease forwards',
                  }}
                >
                  <div className="absolute inset-0 rounded-full overflow-hidden" style={{ border: `${isCC ? '3.8px' : '3px'} solid ${pColor}`, boxShadow: `0 0 8px ${pColor}40` }}>
                    <img src={getUnitIcon(du.unitType, du.unit)} alt="" className="w-full h-full object-cover pointer-events-none" />
                  </div>
                </div>
              )
            })}
            {(() => {
              const activeTile = hoveredTile || tappedTile
              if (!activeTile) return null
              const { row: hr, col: hc } = activeTile
              const hKey = `${hr}-${hc}`
              const hVisible = visibleTiles.has(hKey)
              const board = activeBoard || 'ground'
              const hDiscovered = discoveredTiles.has(`${board}-${hr}-${hc}`)
              const hu = getUnitAt(hr, hc)
              const hShowUnit = hu && (hu.owner_id === currentPlayer?.player_id || hVisible)
              const info = (hVisible || hDiscovered) ? getTerrainInfo(hr, hc) : null
              if (!info && !hShowUnit) return null
              const hx = hc * HEX_W + (hr & 1 ? HEX_W / 2 : 0) + RENDER_W / 2
              const hy = hr * ROW_H - 4
              return (
                <div
                  className="hidden lg:block absolute z-20 pointer-events-none"
                  style={{
                    left: hx,
                    top: hy,
                    transform: `translate(-50%, -100%) scale(${1.25 / zoom})`,
                    transformOrigin: 'bottom center',
                  }}
                >
                  <div
                    className="rounded px-2 py-1.5 shadow-lg whitespace-nowrap"
                    style={{ backgroundColor: '#18191c', border: '1px solid #2a3140' }}
                  >
                    {hShowUnit && (
                      <div className="flex flex-col items-center gap-1 mb-1">
                        <img
                          src={getUnitIcon(hu.wg_unit_types, hu)}
                          alt={hu.wg_unit_types.name}
                          className="object-contain"
                          style={{ maxHeight: 80, maxWidth: 80 }}
                        />
                        <div className="text-xs font-semibold text-center" style={{ color: '#c9d1d9' }}>
                          {hu.wg_unit_types.name}
                        </div>
                        <div className="text-[10px] font-mono" style={{ color: '#8b949e' }}>HP {hu.current_hp}/{getMaxHp(hu)}</div>
                        {(() => { const s = getUnitShield(hu); return s && (
                          <div className="text-[10px] font-mono" style={{ color: '#40a0e0' }}>Shield {s.current}/{s.max}</div>
                        ) })()}
                        {hu.upgrades?.loadedUnits?.length > 0 && (
                          <div className="text-[10px] font-mono mt-1" style={{ color: '#8b949e' }}>{hu.upgrades.loadedUnits.length} unit{hu.upgrades.loadedUnits.length !== 1 ? 's' : ''} loaded</div>
                        )}
                      </div>
                    )}
                    {info?.resourceId === 'space_guild' && (
                      <div className="flex flex-col items-center gap-1 mb-1">
                        <img src="/assets/spaceguild.png" alt="Space Guild" className="object-contain" style={{ maxHeight: 80, maxWidth: 80 }} />
                        <div className="text-xs font-semibold text-center" style={{ color: '#6cb4e6' }}>Space Guild</div>
                        <div className="text-[10px] font-mono" style={{ color: '#8b949e' }}>Trade Station</div>
                      </div>
                    )}
                    {info && (
                      <div className="text-center">
                        <div className="text-[10px] font-semibold" style={{ color: '#8b949e' }}>
                          {info.terrain?.name}{info.hasRiver ? ' (River)' : ''}
                        </div>
                        {info.resource && info.resourceId !== 'space_guild' && (
                          <div className="text-[10px] font-mono" style={{ color: '#cca43b' }}>
                            {info.resource.name}{info.oreAmount ? ` (${info.oreAmount})` : ''}{info.resource.yield != null ? ` (+${info.resource.yield}g/turn)` : ' (+1g/turn)'}
                          </div>
                        )}
                      </div>
                    )}
                    <div className="text-[9px] font-mono text-center" style={{ color: '#4a5568' }}>X{hr}/Y{hc}</div>
                  </div>
                </div>
              )
            })()}
          </div>
        </div>
      </div>

      {isFullscreen && (
        <div className="lg:hidden flex shrink-0 h-full">
          <button
            onClick={() => setPanelOpen(!panelOpen)}
            className="flex items-center justify-center px-1 cursor-pointer self-stretch"
            style={{ backgroundColor: '#18191c', borderLeft: '1px solid #2a3140', color: '#4a5568', writingMode: 'vertical-rl' }}
          >
            <span className="text-xs font-semibold uppercase tracking-widest">{panelOpen ? 'Hide' : 'Menu'}</span>
          </button>
          {panelOpen && (
            <div className="h-full overflow-y-auto p-3 flex flex-col" style={{ width: 260, backgroundColor: '#111214', borderLeft: '1px solid #2a3140' }}>
              <div className="flex items-center justify-between mb-3 shrink-0">
                <div className="flex items-center gap-1.5">
                  <div className="flex rounded overflow-hidden" style={{ border: '1px solid #30363d' }}>
                    <button
                      onClick={() => setActiveBoard('ground')}
                      className="px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide transition-colors cursor-pointer"
                      style={activeBoard === 'ground'
                        ? { backgroundColor: '#1c3043', color: '#6cb4e6' }
                        : { backgroundColor: '#21262d', color: '#4a5568' }}
                    >
                      Ground
                    </button>
                    <button
                      onClick={() => setActiveBoard('space')}
                      className="px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide transition-colors cursor-pointer"
                      style={activeBoard === 'space'
                        ? { backgroundColor: '#2a1a3a', color: '#c080e0' }
                        : { backgroundColor: '#21262d', color: '#4a5568' }}
                    >
                      Space
                    </button>
                  </div>
                  <button
                    onClick={() => { setBattleLogOpen(prev => !prev); setChatOpen(false) }}
                    className="w-7 h-7 flex items-center justify-center rounded cursor-pointer"
                    style={{
                      backgroundColor: battleLogOpen ? '#2a1a1a' : '#21262d',
                      border: `1px solid ${battleLogOpen ? '#4a2a2a' : '#30363d'}`,
                      color: battleLogOpen ? '#f47067' : '#8b949e',
                    }}
                    title="Battle Log"
                  >
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z" /><line x1="3" y1="6" x2="21" y2="6" /><path d="M16 10a4 4 0 01-8 0" />
                    </svg>
                  </button>
                  <button
                    onClick={() => { setChatOpen(prev => !prev); setBattleLogOpen(false) }}
                    className="w-7 h-7 flex items-center justify-center rounded cursor-pointer"
                    style={{
                      backgroundColor: chatOpen ? '#1c3043' : '#21262d',
                      border: `1px solid ${chatOpen ? '#2a4a6a' : '#30363d'}`,
                      color: chatOpen ? '#6cb4e6' : '#8b949e',
                    }}
                    title="Team Chat"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                    </svg>
                  </button>
                </div>
                <button
                  onClick={onExitFullscreen}
                  className="w-6 h-6 flex items-center justify-center rounded cursor-pointer text-xs"
                  style={{ backgroundColor: '#21262d', color: '#f47067', border: '1px solid #3d2525' }}
                >
                  &times;
                </button>
              </div>
              {battleLogOpen ? (
                <div className="flex-1 min-h-0">
                  <BattleLog
                    battleLog={battleLog || []}
                    currentPlayer={currentPlayer}
                    isFullscreen
                  />
                </div>
              ) : chatOpen ? (
                <div className="flex-1 min-h-0">
                  <TeamChat
                    gameId={game.id}
                    currentPlayer={currentPlayer}
                    players={allPlayers || players}
                    isFullscreen
                  />
                </div>
              ) : <>{mobileInspectPanel}{sidebarContent}</>}
            </div>
          )}
        </div>
      )}
      </div>

      {tappedTile && (() => {
        const { row: tr, col: tc } = tappedTile
        const tKey = `${tr}-${tc}`
        const board = activeBoard || 'ground'
        const tVisible = visibleTiles.has(tKey)
        const tDiscovered = discoveredTiles.has(`${board}-${tr}-${tc}`)
        const tu = getUnitAt(tr, tc)
        const tShowUnit = tu && (tu.owner_id === currentPlayer?.player_id || tVisible)
        const tInfo = (tVisible || tDiscovered) ? getTerrainInfo(tr, tc) : null
        if (!tInfo && !tShowUnit) return null
        const tilePixelX = tc * HEX_W + (tr & 1 ? HEX_W / 2 : 0) + RENDER_W / 2
        const tilePixelY = tr * ROW_H
        const el = boardRef.current
        const scrollLeft = el ? el.scrollLeft : 0
        const scrollTop = el ? el.scrollTop : 0
        const screenX = tilePixelX * zoom - scrollLeft
        const screenY = tilePixelY * zoom - scrollTop
        return (
          <div
            className="lg:hidden fixed z-30 pointer-events-auto"
            style={{ left: Math.max(8, Math.min(screenX, window.innerWidth - 160)), top: Math.max(8, screenY - 8), transform: 'translate(-50%, -100%)' }}
          >
            <div
              className="rounded-lg shadow-lg px-2 py-1 relative"
              style={{ backgroundColor: '#18191cee', border: '1px solid #2a3140', minWidth: 100 }}
            >
              <button
                onClick={() => setTappedTile(null)}
                className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full flex items-center justify-center text-[9px] cursor-pointer z-10"
                style={{ backgroundColor: '#21262d', color: '#8b949e', border: '1px solid #30363d' }}
              >
                &times;
              </button>
              {tShowUnit && (
                <div className="flex items-center gap-1.5 mb-0.5">
                  <img src={getUnitIcon(tu.wg_unit_types, tu)} alt={tu.wg_unit_types.name} className="w-6 h-6 object-contain shrink-0" />
                  <div className="min-w-0">
                    <div className="text-[10px] font-semibold truncate" style={{ color: '#c9d1d9' }}>
                      {tu.wg_unit_types.name}
                    </div>
                    <div className="flex gap-1.5 text-[9px] font-mono" style={{ color: '#8b949e' }}>
                      <span>HP {tu.current_hp}/{getMaxHp(tu)}</span>
                      {(() => { const s = getUnitShield(tu); return s && <span style={{ color: '#40a0e0' }}>SH {s.current}/{s.max}</span> })()}
                    </div>
                  </div>
                </div>
              )}
              {tInfo?.resourceId === 'space_guild' && (
                <div className="flex items-center gap-1.5 mb-0.5">
                  <img src="/assets/spaceguild.png" alt="Space Guild" className="w-6 h-6 object-contain shrink-0" />
                  <div className="text-[10px] font-semibold" style={{ color: '#6cb4e6' }}>Space Guild</div>
                </div>
              )}
              {tInfo && (
                <div className="text-[9px] font-mono" style={{ color: '#8b949e' }}>
                  {tInfo.terrain?.name}{tInfo.hasRiver ? ' (River)' : ''}
                  {tInfo.resource && tInfo.resourceId !== 'space_guild' && (
                    <span style={{ color: '#cca43b' }}> {tInfo.resource.name}{tInfo.oreAmount ? ` (${tInfo.oreAmount})` : ''}</span>
                  )}
                </div>
              )}
              <div className="text-[8px] font-mono" style={{ color: '#4a5568' }}>X{tr}/Y{tc}</div>
            </div>
          </div>
        )
      })()}

      {inspectedUnit && (
        <div
          className="hidden lg:flex fixed bottom-16 left-1/2 -translate-x-1/2 lg:absolute lg:bottom-4 z-30 items-center gap-3 px-4 py-3 rounded-lg shadow-lg max-w-sm"
          style={{ backgroundColor: '#18191c', border: '1px solid #2a3140' }}
        >
          <img
            src={getUnitIcon(inspectedUnit.wg_unit_types, inspectedUnit)}
            alt={inspectedUnit.wg_unit_types?.name}
            className="w-12 h-12 object-contain shrink-0"
            style={{ filter: `drop-shadow(0 0 3px ${getPlayerColor(inspectedUnit.owner_id, inspectedUnit)})` }}
          />
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: getPlayerColor(inspectedUnit.owner_id, inspectedUnit) }} />
              <span className="font-semibold text-sm truncate" style={{ color: '#c9d1d9' }}>
                {inspectedUnit.wg_unit_types?.name}
              </span>
            </div>
            <div className="flex gap-3 mt-1 text-xs font-mono" style={{ color: '#8b949e' }}>
              <span>HP {inspectedUnit.current_hp}/{inspectedUnit.wg_unit_types?.hp}</span>
              {(() => { const s = getUnitShield(inspectedUnit); return s && <span style={{ color: '#40a0e0' }}>Shield {s.current}/{s.max}</span> })()}
              <span>ATK {inspectedUnit.wg_unit_types?.attack}</span>
              <span>DEF {inspectedUnit.wg_unit_types?.defense}</span>
              <span>MOV {inspectedUnit.wg_unit_types?.movement}</span>
            </div>
            <div className="flex gap-2 text-xs mt-0.5" style={{ color: '#4a5568' }}>
              <span>{inspectedUnit.isNPC ? 'Hostile Creature' : (allPlayers || players).find(p => p.player_id === inspectedUnit.owner_id)?.wg_profiles?.display_name}</span>
              <span className="font-mono">X{inspectedUnit.grid_row}/Y{inspectedUnit.grid_col}</span>
            </div>
            {inspectedUnit.upgrades?.loadedUnits?.length > 0 && (
              <div className="flex items-center gap-1.5 mt-1">
                <span className="text-[10px] uppercase tracking-widest font-semibold" style={{ color: '#4a5568' }}>Loaded:</span>
                {inspectedUnit.upgrades.loadedUnits.map((lu, li) => {
                  const luType = allUnitTypes.find(ut => ut.id === lu.typeId)
                  return <img key={li} src={getUnitIcon(luType)} alt={lu.typeName} title={lu.typeName} className="w-4 h-4 object-contain" />
                })}
              </div>
            )}
          </div>
          <button
            onClick={() => setInspectedUnitId(null)}
            className="absolute -top-2 -right-2 w-5 h-5 rounded-full flex items-center justify-center text-xs cursor-pointer"
            style={{ backgroundColor: '#21262d', color: '#8b949e', border: '1px solid #30363d' }}
          >
            &times;
          </button>
        </div>
      )}

      {!isFullscreen && (
        <div className="lg:hidden fixed bottom-0 left-0 right-0 z-20">
          <div className="flex items-center justify-between px-3 py-1.5" style={{ backgroundColor: '#18191c', borderTop: '1px solid #2a3140' }}>
            <div className="flex items-center gap-1.5">
              <div className="flex rounded overflow-hidden" style={{ border: '1px solid #30363d' }}>
                <button
                  onClick={() => setActiveBoard('ground')}
                  className="px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wide transition-colors cursor-pointer"
                  style={activeBoard === 'ground'
                    ? { backgroundColor: '#1c3043', color: '#6cb4e6' }
                    : { backgroundColor: '#21262d', color: '#4a5568' }}
                >
                  Ground
                </button>
                <button
                  onClick={() => setActiveBoard('space')}
                  className="px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wide transition-colors cursor-pointer"
                  style={activeBoard === 'space'
                    ? { backgroundColor: '#2a1a3a', color: '#c080e0' }
                    : { backgroundColor: '#21262d', color: '#4a5568' }}
                >
                  Space
                </button>
              </div>
              <button
                onClick={() => { setBattleLogOpen(prev => !prev); if (!battleLogOpen) { setPanelOpen(false); setChatOpen(false) } }}
                className="w-8 h-8 flex items-center justify-center rounded cursor-pointer"
                style={{
                  backgroundColor: battleLogOpen ? '#2a1a1a' : '#21262d',
                  border: `1px solid ${battleLogOpen ? '#4a2a2a' : '#30363d'}`,
                  color: battleLogOpen ? '#f47067' : '#8b949e',
                }}
                title="Battle Log"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z" /><line x1="3" y1="6" x2="21" y2="6" /><path d="M16 10a4 4 0 01-8 0" />
                </svg>
              </button>
              <button
                onClick={() => { setChatOpen(prev => !prev); if (!chatOpen) { setPanelOpen(false); setBattleLogOpen(false) } }}
                className="w-8 h-8 flex items-center justify-center rounded cursor-pointer"
                style={{
                  backgroundColor: chatOpen ? '#1c3043' : '#21262d',
                  border: `1px solid ${chatOpen ? '#2a4a6a' : '#30363d'}`,
                  color: chatOpen ? '#6cb4e6' : '#8b949e',
                }}
                title="Team Chat"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                </svg>
              </button>
            </div>
            <button
              onClick={() => { setPanelOpen(!panelOpen); if (panelOpen) { setChatOpen(false); setBattleLogOpen(false) } else { setChatOpen(false); setBattleLogOpen(false) } }}
              className="flex items-center gap-1.5 py-1 text-xs font-semibold uppercase tracking-wide cursor-pointer"
              style={{ color: '#4a5568' }}
            >
              <span>{panelOpen ? 'Hide' : 'Controls'}</span>
              <span className={`transition-transform ${panelOpen ? 'rotate-180' : ''}`}>&#9650;</span>
            </button>
          </div>
          {battleLogOpen && (
            <div className="px-2 pb-1" style={{ backgroundColor: '#111214', borderTop: '1px solid #2a3140' }}>
              <BattleLog
                battleLog={battleLog || []}
                currentPlayer={currentPlayer}
                onClose={() => setBattleLogOpen(false)}
              />
            </div>
          )}
          {chatOpen && !battleLogOpen && (
            <div className="px-2 pb-1" style={{ backgroundColor: '#111214', borderTop: '1px solid #2a3140' }}>
              <TeamChat
                gameId={game.id}
                currentPlayer={currentPlayer}
                players={allPlayers || players}
                onClose={() => setChatOpen(false)}
              />
            </div>
          )}
          {panelOpen && !chatOpen && !battleLogOpen && (
            <div className="p-3 max-h-[50vh] overflow-y-auto" style={{ backgroundColor: '#111214', borderTop: '1px solid #2a3140' }}>
              {mobileInspectPanel}
              {sidebarContent}
            </div>
          )}
        </div>
      )}

      {shipModelPicker && (() => {
        const isCC = shipModelPicker.type === 'cc'
        const models = isCC
          ? [{ file: 'command center', label: 'Mk.1' }, ...Array.from({ length: 5 }, (_, i) => ({ file: `commandcenter${i + 1}`, label: `Mk.${i + 2}` }))]
          : [2, 3, 4, 5, 6, 7].map(n => ({ file: `commandship${n}`, label: `Mk.${n - 1}` }))
        const accentColor = isCC ? '#6cb4e6' : '#c060e0'
        const hoverBg = isCC ? '#1a2a3e' : '#1a1a2e'
        return (
        <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ backgroundColor: 'rgba(0,0,0,0.7)' }}>
          <div className="rounded-lg p-6 sm:p-10 w-full mx-4" style={{ maxWidth: 1036, backgroundColor: '#18191c', border: '1px solid #2a3140' }}>
            <div className="text-base sm:text-xl font-semibold mb-4 sm:mb-6 text-center" style={{ color: '#c9d1d9' }}>{isCC ? 'Select Your Command Center' : 'Select Your Command Ship'}</div>
            <div className="grid grid-cols-6 gap-3 sm:gap-5 mb-4 sm:mb-6">
              {models.map((m, i) => (
                  <button
                    key={i}
                    onClick={async () => {
                      const { unitTypeId, row, col } = shipModelPicker
                      setShipModelPicker(null)
                      try {
                        const opts = isCC ? { ccModel: m.file } : { shipModel: m.file }
                        await deployUnit(unitTypeId, row, col, opts)
                        setMode('select')
                        setSelectedUnitType(null)
                      } catch (err) {
                        setError(err.message)
                      }
                    }}
                    className="flex flex-col items-center gap-1.5 sm:gap-3 p-3 sm:p-5 rounded cursor-pointer transition-all"
                    style={{ backgroundColor: '#111214', border: '1px solid #2a3140' }}
                    onMouseEnter={e => { e.currentTarget.style.borderColor = accentColor; e.currentTarget.style.backgroundColor = hoverBg }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor = '#2a3140'; e.currentTarget.style.backgroundColor = '#111214' }}
                  >
                    <img src={`/assets/${m.file}.png`} alt={m.label} className="w-18 h-18 sm:w-32 sm:h-32 object-contain" />
                    <span className="text-[11px] sm:text-sm font-mono" style={{ color: '#8b949e' }}>{m.label}</span>
                  </button>
              ))}
            </div>
            <button
              onClick={() => setShipModelPicker(null)}
              className="w-full py-2 rounded text-sm font-semibold cursor-pointer"
              style={{ backgroundColor: '#21262d', color: '#8b949e', border: '1px solid #30363d' }}
            >
              Cancel
            </button>
          </div>
        </div>
        )
      })()}
    </div>
    </>
  )
}
