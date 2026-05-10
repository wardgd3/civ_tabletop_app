import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import CommandShipPanel from './CommandShipPanel'
import { TERRAIN, RESOURCES, SPACE_RESOURCES, LUXURY_RESOURCES } from '../lib/terrainGen'

const HEX_SIZE = 16
const HEX_W = Math.round(Math.sqrt(3) * HEX_SIZE)
const HEX_H = HEX_SIZE * 2
const ROW_H = HEX_H * 0.75
const GAP = 0.5
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
const RESOURCE_BY_ID = Object.fromEntries([
  ...Object.values(RESOURCES).map(r => [r.id, r]),
  ...Object.values(SPACE_RESOURCES).map(r => [r.id, r]),
  ...Object.values(LUXURY_RESOURCES).map(r => [r.id, r]),
])
function getUnitIcon(unitType) {
  if (!unitType?.icon) return '/assets/infantry.png'
  if (unitType.name === 'Command Ship') return '/assets/mothership.png'
  return `/assets/${encodeURIComponent(unitType.icon)}`
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
  excavate, upgradeShipCompartment, levelUpUnit,
  buildConvoy, loadUnitToConvoy, loadFromBayToConvoy, unloadToHoldingBay, sendConvoy, deployFromBay, produceUnitToBay, loadCargoToConvoy, unloadCargoFromConvoy,
  dockTransport, loadSoldierToTransport, loadBaySoldierToTransport, unloadSoldierFromTransport, undockTransport, deployFromTransport,
  isFullscreen, onExitFullscreen,
  activeBoard, setActiveBoard, canActOnBoard, allPlayers, realIsMyTurn,
  productionPerTurn, economy,
}) {
  const [selectedUnitId, setSelectedUnitId] = useState(null)
  const [selectedUnitType, setSelectedUnitType] = useState(null)
  const [inspectedUnitId, setInspectedUnitId] = useState(null)
  const [hoveredTile, setHoveredTile] = useState(null)
  const [tappedTile, setTappedTile] = useState(null)
  const [mode, setMode] = useState('select')
  const [error, setError] = useState(null)
  const [panelOpen, setPanelOpen] = useState(false)
  const [zoom, setZoom] = useState(1)
  const [spaceHeld, setSpaceHeld] = useState(false)
  const [isPanning, setIsPanning] = useState(false)
  const [touchPanning, setTouchPanning] = useState(false)
  const [commandShipUnitId, setCommandShipUnitId] = useState(null)
  const [bayDeployInfo, setBayDeployInfo] = useState(null)
  const [transportDeployInfo, setTransportDeployInfo] = useState(null)
  const [unitDeployFromTransportInfo, setUnitDeployFromTransportInfo] = useState(null)
  const boardRef = useRef(null)
  const panStart = useRef({ x: 0, y: 0, scrollLeft: 0, scrollTop: 0 })
  const touchPanRef = useRef(null)
  const panningRef = useRef(false)
  const spaceRef = useRef(false)
  const velocityRef = useRef({ vx: 0, vy: 0 })
  const lastMoveRef = useRef({ x: 0, y: 0, t: 0 })
  const inertiaRef = useRef(null)

  const selectedUnit = selectedUnitId ? units.find(u => u.id === selectedUnitId) || null : null
  const inspectedUnit = inspectedUnitId ? units.find(u => u.id === inspectedUnitId) || null : null

  const myColor = currentPlayer?.color
  const allMyUnits = allUnits || units
  const hasCommandCenter = !!allMyUnits.find(u => u.owner_id === currentPlayer?.player_id && (u.wg_unit_types?.name === 'Command Center' || u.wg_unit_types?.name === 'Command Ship'))
  const hasCommandStructureOnThisBoard = !!units.find(u => u.owner_id === currentPlayer?.player_id && (u.wg_unit_types?.name === 'Command Center' || u.wg_unit_types?.name === 'Command Ship'))
  const myCommandCenter = units.find(u => u.owner_id === currentPlayer?.player_id && (u.wg_unit_types?.name === 'Command Center' || u.wg_unit_types?.name === 'Command Ship'))
  const myBuildings = units.filter(u => u.owner_id === currentPlayer?.player_id && (u.wg_unit_types?.name === 'Base' || u.wg_unit_types?.name === 'Factory'))
  const myStructures = myCommandCenter ? [myCommandCenter, ...myBuildings] : []

  const sortedUnitTypes = [...unitTypes].sort((a, b) => {
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

  const tileMap = useMemo(() => {
    const map = new Map()
    for (const t of tiles) map.set(`${t.grid_row}-${t.grid_col}`, t)
    return map
  }, [tiles])

  const visibleTiles = (() => {
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
      const vis = u.wg_unit_types?.visibility ?? 2
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          if (hexDistance(u.grid_row, u.grid_col, r, c) <= vis) {
            set.add(`${r}-${c}`)
          }
        }
      }
    }
    return set
  })()

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

  function getTileColor(row, col, isVisible, isDiscovered) {
    const isSpace = activeBoard === 'space'
    const fogColor = isSpace ? '#0d1117' : '#1a2029'
    const tile = tileMap.get(`${row}-${col}`)
    if (!tile) return isVisible ? '#232a35' : isDiscovered ? '#1e2530' : fogColor
    const terrain = TERRAIN_BY_ID[tile.terrain]
    if (!terrain) return isVisible ? '#232a35' : isDiscovered ? '#1e2530' : fogColor
    if (tile.has_road) {
      if (isVisible) return '#8a7a60'
      if (isDiscovered) return '#5a5040'
      return fogColor
    }
    if (isVisible) return terrain.color
    if (isDiscovered) return terrain.darkColor
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
    return units.find(u => u.grid_row === row && u.grid_col === col)
  }

  function getPlayerColor(playerId) {
    return (allPlayers || players).find(p => p.player_id === playerId)?.color || '#888'
  }

  function getMoveRange(unit) {
    if (!unit?.wg_unit_types) return []
    const unitName = unit.wg_unit_types.name
    const baseRange = unit.wg_unit_types.movement
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
        if (getUnitAt(nr, nc)) continue
        const nTile = tileMap.get(nk)
        const nHasRoad = nTile?.has_road
        let cost = 1
        const maxRange = (sourceHasRoad && nHasRoad) ? baseRange + 2 : baseRange
        const newDist = dist + cost
        if (newDist > maxRange) continue
        const prev = visited.get(nk)
        if (prev !== undefined && prev <= newDist) continue
        visited.set(nk, newDist)
        cells.push(nk)
        queue.push([nr, nc, newDist])
      }
    }
    return [...new Set(cells)]
  }

  function getAttackRange(unit) {
    if (!unit?.wg_unit_types) return []
    const cells = []
    const range = unit.wg_unit_types.attack_range
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const dist = hexDistance(unit.grid_row, unit.grid_col, r, c)
        const target = getUnitAt(r, c)
        if (dist > 0 && dist <= range && target && target.owner_id !== currentPlayer?.player_id) {
          cells.push(`${r}-${c}`)
        }
      }
    }
    return cells
  }

  function getBuildRange(unit) {
    if (!unit?.wg_unit_types || unit.wg_unit_types.name !== 'Engineer') return []
    const cells = []
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const dist = hexDistance(unit.grid_row, unit.grid_col, r, c)
        if (dist !== 1) continue
        const tile = tileMap.get(`${r}-${c}`)
        if (!tile || tile.has_road || tile.terrain === 'mountain') continue
        cells.push(`${r}-${c}`)
      }
    }
    return cells
  }

  function getDestroyRange(unit) {
    if (!unit?.wg_unit_types || unit.wg_unit_types.name !== 'Engineer') return []
    const cells = []
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const dist = hexDistance(unit.grid_row, unit.grid_col, r, c)
        if (dist !== 1) continue
        const tile = tileMap.get(`${r}-${c}`)
        if (!tile || !tile.has_road) continue
        cells.push(`${r}-${c}`)
      }
    }
    return cells
  }

  const moveRange = mode === 'move' && selectedUnit ? getMoveRange(selectedUnit) : []
  const attackRange = mode === 'attack' && selectedUnit ? getAttackRange(selectedUnit) : []
  const buildRange = mode === 'build' && selectedUnit ? getBuildRange(selectedUnit) : []
  const destroyRange = mode === 'destroy' && selectedUnit ? getDestroyRange(selectedUnit) : []

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
    if (!unitTypeData) return []
    const cells = []
    const isMiningStation = unitTypeData.name === 'Mining Station'
    if (unitTypeData.name === 'Command Center' || unitTypeData.name === 'Command Ship') {
      if (hasCommandStructureOnThisBoard) return []
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          if (!getUnitAt(r, c) && !isImpassable(r, c) && isNearEdge(r, c) && isFarFromEnemyCCs(r, c)) {
            cells.push(`${r}-${c}`)
          }
        }
      }
    } else if (unitTypeData.name === 'Base' || unitTypeData.name === 'Factory') {
      if (!hasCommandCenter) return []
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          const d = distToNearestStructure(r, c)
          if (!getUnitAt(r, c) && !isImpassable(r, c) && d > 0 && d <= 4) {
            cells.push(`${r}-${c}`)
          }
        }
      }
    } else if (hasCommandCenter) {
      const range = unitTypeData.movement
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          const d = distToNearestStructure(r, c)
          if (!getUnitAt(r, c) && !isImpassable(r, c, isMiningStation ? 'Mining Station' : null) && d > 0 && d <= range) {
            cells.push(`${r}-${c}`)
          }
        }
      }
    }
    return cells
  }

  const deployRange = mode === 'deploy' && selectedUnitTypeData ? getDeployRange(selectedUnitTypeData) : []

  const bayDeployRange = bayDeployInfo ? (() => {
    const cc = units.find(u => u.id === bayDeployInfo.shipId)
    if (!cc) return []
    const neighbors = hexNeighborsBoard(cc.grid_row, cc.grid_col, rows, cols)
    const cells = []
    for (const [nr, nc] of neighbors) {
      if (getUnitAt(nr, nc)) continue
      if (isImpassable(nr, nc)) continue
      cells.push(`${nr}-${nc}`)
    }
    return cells
  })() : []

  const transportDeployRange = transportDeployInfo ? (() => {
    const struct = units.find(u => u.id === transportDeployInfo.structId)
    if (!struct) return []
    const neighbors = hexNeighborsBoard(struct.grid_row, struct.grid_col, rows, cols)
    const cells = []
    for (const [nr, nc] of neighbors) {
      if (getUnitAt(nr, nc)) continue
      if (isImpassable(nr, nc)) continue
      cells.push(`${nr}-${nc}`)
    }
    return cells
  })() : []

  const unitFromTransportDeployRange = unitDeployFromTransportInfo ? (() => {
    const transport = units.find(u => u.id === unitDeployFromTransportInfo.transportId)
    if (!transport) return []
    const neighbors = hexNeighborsBoard(transport.grid_row, transport.grid_col, rows, cols)
    const cells = []
    for (const [nr, nc] of neighbors) {
      if (getUnitAt(nr, nc)) continue
      if (isImpassable(nr, nc)) continue
      cells.push(`${nr}-${nc}`)
    }
    return cells
  })() : []

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

  const zoomRef = useRef(zoom)
  zoomRef.current = zoom
  const targetZoomRef = useRef(zoom)
  const wheelAnimRef = useRef(null)
  const wheelCursorRef = useRef({ clientX: 0, clientY: 0 })

  function tickWheelZoom() {
    const el = boardRef.current
    if (!el) return
    const current = zoomRef.current
    const target = targetZoomRef.current
    const diff = target - current
    if (Math.abs(diff) < 0.002) {
      zoomRef.current = target
      setZoom(target)
      wheelAnimRef.current = null
      return
    }
    const rect = el.getBoundingClientRect()
    const { clientX, clientY } = wheelCursorRef.current
    const anchorX = clientX - rect.left + el.scrollLeft
    const anchorY = clientY - rect.top + el.scrollTop
    const next = current + diff * 0.25
    const ratio = next / current
    zoomRef.current = next
    setZoom(next)
    el.scrollLeft = anchorX * ratio - (clientX - rect.left)
    el.scrollTop = anchorY * ratio - (clientY - rect.top)
    wheelAnimRef.current = requestAnimationFrame(tickWheelZoom)
  }

  const handleWheel = useCallback((e) => {
    e.preventDefault()
    wheelCursorRef.current = { clientX: e.clientX, clientY: e.clientY }
    const factor = e.deltaY > 0 ? 0.85 : 1.18
    targetZoomRef.current = Math.min(3, Math.max(0.3, targetZoomRef.current * factor))
    if (!wheelAnimRef.current) {
      wheelAnimRef.current = requestAnimationFrame(tickWheelZoom)
    }
  }, [])

  const pinchRef = useRef(null)

  const handleTouchStart = useCallback((e) => {
    if (e.touches.length === 2) {
      e.preventDefault()
      touchPanRef.current = null
      setTouchPanning(false)
      const dx = e.touches[0].clientX - e.touches[1].clientX
      const dy = e.touches[0].clientY - e.touches[1].clientY
      const midX = (e.touches[0].clientX + e.touches[1].clientX) / 2
      const midY = (e.touches[0].clientY + e.touches[1].clientY) / 2
      const el = boardRef.current
      const rect = el.getBoundingClientRect()
      pinchRef.current = {
        dist: Math.hypot(dx, dy),
        contentX: midX - rect.left + el.scrollLeft,
        contentY: midY - rect.top + el.scrollTop,
      }
    } else if (e.touches.length === 1) {
      const el = boardRef.current
      touchPanRef.current = {
        x: e.touches[0].clientX,
        y: e.touches[0].clientY,
        scrollLeft: el.scrollLeft,
        scrollTop: el.scrollTop,
        moved: false,
      }
    }
  }, [])

  const handleTouchMove = useCallback((e) => {
    if (e.touches.length === 2 && pinchRef.current !== null) {
      e.preventDefault()
      const el = boardRef.current
      if (!el) return
      const rect = el.getBoundingClientRect()
      const dx = e.touches[0].clientX - e.touches[1].clientX
      const dy = e.touches[0].clientY - e.touches[1].clientY
      const dist = Math.hypot(dx, dy)
      const midX = (e.touches[0].clientX + e.touches[1].clientX) / 2
      const midY = (e.touches[0].clientY + e.touches[1].clientY) / 2
      const scale = dist / pinchRef.current.dist
      const oldZoom = zoomRef.current
      const newZoom = Math.min(3, Math.max(0.3, oldZoom * scale))
      const ratio = newZoom / oldZoom

      const newContentX = pinchRef.current.contentX * ratio
      const newContentY = pinchRef.current.contentY * ratio

      setZoom(newZoom)
      zoomRef.current = newZoom
      pinchRef.current = {
        dist,
        contentX: newContentX,
        contentY: newContentY,
      }

      el.scrollLeft = newContentX - (midX - rect.left)
      el.scrollTop = newContentY - (midY - rect.top)
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
      }
    }
  }, [])

  const handleTouchEnd = useCallback(() => {
    pinchRef.current = null
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
      el.scrollLeft = (el.scrollWidth - el.clientWidth) / 2
      el.scrollTop = (el.scrollHeight - el.clientHeight) / 2
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

    const cellKey = `${row}-${col}`

    if (unitDeployFromTransportInfo) {
      if (!unitFromTransportDeployRange.includes(cellKey)) {
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
      if (!bayDeployRange.includes(cellKey)) {
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

    if (transportDeployInfo) {
      if (!transportDeployRange.includes(cellKey)) {
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

    if (showUnit) {
      if ((unit.wg_unit_types?.name === 'Command Ship' || unit.wg_unit_types?.name === 'Command Center' || unit.wg_unit_types?.name === 'Base') && unit.owner_id === currentPlayer?.player_id) {
        setCommandShipUnitId(prev => prev === unit.id ? null : unit.id)
        setPanelOpen(true)
        return
      }
      setInspectedUnitId(prev => prev === unit.id ? null : unit.id)
    } else {
      setInspectedUnitId(null)
    }

    if (!isMyTurn) return

    try {
      if (mode === 'deploy' && selectedUnitType) {
        if (!deployRange.includes(cellKey)) {
          setError(hasCommandCenter ? 'Too far from Command Center or Base' : 'Deploy a Command Center first')
          return
        }
        await deployUnit(selectedUnitType, row, col)
        setMode('select')
        setSelectedUnitType(null)
      } else if (mode === 'move' && selectedUnit) {
        await moveUnit(selectedUnit.id, row, col)
        setSelectedUnitId(null)
        setCommandShipUnitId(null)
        setMode('select')
      } else if (mode === 'attack' && selectedUnit) {
        if (unit && unit.owner_id !== currentPlayer?.player_id) {
          await attackUnit(selectedUnit.id, unit.id)
          setSelectedUnitId(null)
          setMode('select')
        }
      } else if (mode === 'build' && selectedUnit) {
        if (buildRange.includes(cellKey)) {
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
        if (destroyRange.includes(cellKey)) {
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

  const canExcavate = selectedUnit && (selectedUnit.wg_unit_types?.name === 'Mining Station' || selectedUnit.wg_unit_types?.name === 'Excavator')
  const selectedUnitTile = selectedUnit ? tileMap.get(`${selectedUnit.grid_row}-${selectedUnit.grid_col}`) : null
  const selectedTileLux = selectedUnitTile?.resource ? RESOURCE_BY_ID[selectedUnitTile.resource] : null
  const isSelectedTileLuxury = selectedTileLux && selectedTileLux.yield != null
  const hasOreToExcavate = canExcavate && selectedUnitTile?.resource && selectedUnitTile.resource !== 'space_guild' && (isSelectedTileLuxury || selectedUnitTile?.ore_amount > 0)

  const spaceGuildTile = useMemo(() => {
    if (activeBoard !== 'space') return null
    for (const t of tiles) {
      if (t.resource === 'space_guild') return t
    }
    return null
  }, [tiles, activeBoard])

  const isNearSpaceGuild = selectedUnit && spaceGuildTile && selectedUnit.owner_id === currentPlayer?.player_id &&
    hexDistance(selectedUnit.grid_row, selectedUnit.grid_col, spaceGuildTile.grid_row, spaceGuildTile.grid_col) <= 3

  const resources = currentPlayer?.resources || {}

  const sidebarContent = (
    <div className="space-y-3">
      <div className="p-3 rounded flex items-center justify-between lg:block" style={{ backgroundColor: '#161b22', border: '1px solid #2a3140' }}>
        <div>
          <div className="text-[10px] uppercase tracking-widest font-semibold" style={{ color: '#4a5568' }}>Turn {game.turn_number}</div>
          <div className="font-semibold text-sm mt-0.5" style={{ color: '#c9d1d9' }}>
            {isMyTurn ? 'YOUR TURN' : 'Waiting...'}
          </div>
          <div className="text-[10px] font-mono mt-0.5" style={{ color: '#8b949e' }}>
            ⚒ {economy?.teamGold ?? (currentPlayer?.gold || 0)}
            {economy && (
              <span style={{ color: economy.net >= 0 ? '#6a9a72' : '#e05050' }}>
                {' '}({economy.net >= 0 ? '+' : ''}{economy.net}/turn)
              </span>
            )}
          </div>
          {economy && (
            <div className="text-[9px] font-mono mt-0.5 hidden lg:block" style={{ color: '#6e7681' }}>
              <span style={{ color: '#6a9a72' }}>+{economy.production} prod</span>
              {economy.excavationIncome > 0 && <span style={{ color: '#c080e0' }}> +{economy.excavationIncome} excav</span>}
              <span style={{ color: '#e07050' }}> -{economy.upkeep} upkeep</span>
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

      <div className="hidden lg:block p-3 rounded" style={{ backgroundColor: '#161b22', border: '1px solid #2a3140' }}>
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
        <div className="hidden lg:block p-3 rounded" style={{ backgroundColor: '#161b22', border: '1px solid #2a3140' }}>
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
        <div className="p-3 rounded space-y-2" style={{ backgroundColor: '#161b22', border: '1px solid #2a3140' }}>
          {selectedUnit && (
            <div className="text-xs p-3 rounded mb-2" style={{ backgroundColor: '#0d1117', border: '1px solid #2a3140', color: '#8b949e' }}>
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-2 font-semibold" style={{ color: '#c9d1d9' }}>
                  <img src={getUnitIcon(selectedUnit.wg_unit_types)} alt={selectedUnit.wg_unit_types?.name} className="w-20 h-20 object-contain" />
                  {selectedUnit.wg_unit_types?.name}
                  {(selectedUnit.upgrades?.level || 0) > 0 && (
                    <span className="text-xs font-mono" style={{ color: '#cca43b' }}>Lv{selectedUnit.upgrades.level}</span>
                  )}
                </span>
                <span className="font-mono" style={{ color: '#6e7681' }}>HP {selectedUnit.current_hp}/{selectedUnit.wg_unit_types?.hp}</span>
              </div>
              <div className="flex items-center justify-between mt-2">
                <span className="font-mono" style={{ color: '#6e7681' }}>ATK {selectedUnit.wg_unit_types?.attack} | DEF {selectedUnit.wg_unit_types?.defense}</span>
                <div className="flex gap-1">
                  {(isAdmin || !selectedUnit.has_moved) && (
                    <button
                      onClick={() => setMode('move')}
                      className="px-3 py-1 text-xs font-semibold uppercase tracking-wide rounded transition-colors cursor-pointer"
                      style={mode === 'move'
                        ? { backgroundColor: '#1a3a5c', color: '#79c0ff', border: '1px solid #2a5a8c' }
                        : { backgroundColor: '#21262d', color: '#8b949e', border: '1px solid #30363d' }}
                    >
                      Move
                    </button>
                  )}
                  {selectedUnit.wg_unit_types?.name === 'Engineer' ? (
                    <>
                      {(isAdmin || !selectedUnit.has_attacked) && (
                        <button
                          onClick={() => setMode('build')}
                          className="px-3 py-1 text-xs font-semibold uppercase tracking-wide rounded transition-colors cursor-pointer"
                          style={mode === 'build'
                            ? { backgroundColor: '#1a3a2a', color: '#7ee787', border: '1px solid #2a5a3a' }
                            : { backgroundColor: '#21262d', color: '#8b949e', border: '1px solid #30363d' }}
                        >
                          Build
                        </button>
                      )}
                      {(isAdmin || !selectedUnit.has_attacked) && (
                        <button
                          onClick={() => setMode('destroy')}
                          className="px-3 py-1 text-xs font-semibold uppercase tracking-wide rounded transition-colors cursor-pointer"
                          style={mode === 'destroy'
                            ? { backgroundColor: '#4c1a1a', color: '#f47067', border: '1px solid #6e2b2b' }
                            : { backgroundColor: '#21262d', color: '#8b949e', border: '1px solid #30363d' }}
                        >
                          Destroy
                        </button>
                      )}
                    </>
                  ) : (
                    (isAdmin || !selectedUnit.has_attacked) && (
                      <button
                        onClick={() => setMode('attack')}
                        className="px-3 py-1 text-xs font-semibold uppercase tracking-wide rounded transition-colors cursor-pointer"
                        style={mode === 'attack'
                          ? { backgroundColor: '#4c1a1a', color: '#f47067', border: '1px solid #6e2b2b' }
                          : { backgroundColor: '#21262d', color: '#8b949e', border: '1px solid #30363d' }}
                      >
                        Attack
                      </button>
                    )
                  )}
                </div>
              </div>
              {hasOreToExcavate && (
                <button
                  onClick={async () => {
                    try { await excavate(selectedUnit.id) } catch (err) { setError(err.message) }
                  }}
                  className="w-full mt-2 py-1.5 text-xs font-semibold uppercase tracking-wide rounded transition-colors cursor-pointer"
                  style={{ backgroundColor: '#2a2a1a', color: '#cca43b', border: '1px solid #4a4a2a' }}
                >
                  Excavate {RESOURCE_BY_ID[selectedUnitTile.resource]?.name || selectedUnitTile.resource}
                  {isSelectedTileLuxury ? ` (+${selectedTileLux.yield}g/turn)` : ` (+1g/turn)`}{!isSelectedTileLuxury && selectedUnitTile.ore_amount ? ` +${selectedUnitTile.ore_amount} ore` : ''}
                </button>
              )}
              {isNearSpaceGuild && (
                <button
                  onClick={() => setError('Trade functionality coming soon!')}
                  className="w-full mt-2 py-1.5 text-xs font-semibold uppercase tracking-wide rounded transition-colors cursor-pointer"
                  style={{ backgroundColor: '#1a2a3a', color: '#6cb4e6', border: '1px solid #264a6a' }}
                >
                  Trade with Space Guild
                </button>
              )}
              {selectedUnit.owner_id === currentPlayer?.player_id && selectedUnit.wg_unit_types?.name === 'Armor Transport' && (() => {
                const nearbyStruct = allUnits.filter(u =>
                  u.owner_id === currentPlayer?.player_id &&
                  (u.wg_unit_types?.name === 'Command Center' || u.wg_unit_types?.name === 'Base') &&
                  (u.board || 'ground') === (selectedUnit.board || 'ground') &&
                  hexDistance(u.grid_row, u.grid_col, selectedUnit.grid_row, selectedUnit.grid_col) <= 1
                )
                if (nearbyStruct.length === 0) return null
                return nearbyStruct.map(struct => {
                  const structUpgrades = struct.upgrades || {}
                  const lb = structUpgrades.loadingBay || []
                  const maxSlots = struct.wg_unit_types?.name === 'Base' ? 1 : 2
                  const isFull = lb.length >= maxSlots
                  return (
                    <button
                      key={struct.id}
                      onClick={async () => {
                        try {
                          await dockTransport(struct.id, selectedUnit.id)
                          setSelectedUnitId(null)
                          setCommandShipUnitId(struct.id)
                          setPanelOpen(true)
                        } catch (err) { setError(err.message) }
                      }}
                      disabled={isFull}
                      className="w-full mt-2 py-1.5 text-xs font-semibold uppercase tracking-wide rounded transition-colors cursor-pointer disabled:opacity-30"
                      style={{ backgroundColor: '#1a2a3a', color: '#6080a0', border: '1px solid #304a6a' }}
                    >
                      Enter Loading Bay
                    </button>
                  )
                })
              })()}
              {selectedUnit.wg_unit_types?.name === 'Armor Transport' && selectedUnit.upgrades?.loadedUnits?.length > 0 && (
                <div className="mt-2 p-2 rounded" style={{ backgroundColor: '#0d1117', border: '1px solid #2a3140' }}>
                  <div className="text-[10px] uppercase tracking-widest font-semibold mb-1" style={{ color: '#4a5568' }}>
                    Loaded Units ({selectedUnit.upgrades.loadedUnits.length}/4)
                  </div>
                  {selectedUnit.upgrades.loadedUnits.map((lu, li) => {
                    const luType = allUnitTypes.find(ut => ut.id === lu.typeId)
                    return (
                      <div key={li} className="flex items-center gap-2 py-0.5">
                        <img src={getUnitIcon(luType)} alt={lu.typeName} className="w-5 h-5 object-contain" />
                        <span className="text-xs" style={{ color: '#c9d1d9' }}>{lu.typeName}</span>
                        <span className="text-[10px] font-mono ml-auto" style={{ color: '#8b949e' }}>HP {lu.hp}</span>
                      </div>
                    )
                  })}
                  {selectedUnit.owner_id === currentPlayer?.player_id && (
                    <button
                      onClick={() => {
                        setUnitDeployFromTransportInfo({ transportId: selectedUnit.id })
                        setSelectedUnitId(null)
                      }}
                      className="w-full mt-2 py-1.5 text-xs font-semibold uppercase tracking-wide rounded transition-colors cursor-pointer"
                      style={{ backgroundColor: '#1a3a2a', color: '#7ee787', border: '1px solid #2a5a3a' }}
                    >
                      Deploy Unit
                    </button>
                  )}
                </div>
              )}
              {selectedUnit.owner_id === currentPlayer?.player_id && (() => {
                const unitLevel = selectedUnit.upgrades?.level || 0
                const maxLevel = 5
                const upgradeCost = (unitLevel + 1) * 5
                const canAfford = isAdmin || (economy?.teamGold ?? 0) >= upgradeCost
                return (
                  <div className="mt-2 p-2 rounded" style={{ backgroundColor: '#0d1117', border: '1px solid #2a3140' }}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[10px] uppercase tracking-widest font-semibold" style={{ color: '#4a5568' }}>Unit Level</span>
                      <span className="text-[10px] font-mono" style={{ color: '#8b949e' }}>Lv {unitLevel}/{maxLevel}</span>
                    </div>
                    <div className="flex gap-0.5 mb-2">
                      {Array.from({ length: maxLevel }, (_, i) => (
                        <div
                          key={i}
                          className="flex-1 h-1.5 rounded-full"
                          style={{
                            backgroundColor: i < unitLevel ? '#cca43b' : '#21262d',
                            border: `1px solid ${i < unitLevel ? '#cca43b' : '#30363d'}`,
                          }}
                        />
                      ))}
                    </div>
                    {unitLevel < maxLevel ? (
                      <button
                        onClick={async () => {
                          try { await levelUpUnit(selectedUnit.id) } catch (err) { setError(err.message) }
                        }}
                        disabled={!canAfford}
                        className="w-full py-1.5 text-[10px] font-semibold uppercase tracking-wide rounded transition-colors cursor-pointer disabled:opacity-30"
                        style={{ backgroundColor: '#2a2a1a', color: '#cca43b', border: '1px solid #4a4a2a' }}
                      >
                        Level Up (⚒{upgradeCost})
                      </button>
                    ) : (
                      <div className="text-[10px] font-semibold text-center py-1" style={{ color: '#cca43b' }}>
                        MAX LEVEL
                      </div>
                    )}
                  </div>
                )
              })()}
            </div>
          )}

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

            <button
              onClick={async () => {
                try { await endTurn() } catch (err) { setError(err.message) }
              }}
              className="flex-1 lg:w-full px-3 py-2 text-sm font-semibold uppercase tracking-wide rounded transition-colors cursor-pointer"
              style={{ backgroundColor: '#2a2a1a', color: '#cca43b', border: '1px solid #4a4a2a' }}
            >
              End Turn
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
            onClose={() => setCommandShipUnitId(null)}
            onMove={() => {
              setSelectedUnitId(csUnit.id)
              setMode('move')
            }}
            onUpgrade={async (unitId, compartment, slotIndex, tierLevel) => {
              try { await upgradeShipCompartment(unitId, compartment, slotIndex, tierLevel) } catch (err) { setError(err.message) }
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
            onSendConvoy={async (shipId, convoyIdx) => {
              try { await sendConvoy(shipId, convoyIdx) } catch (err) { setError(err.message) }
            }}
            onDeployFromBay={(shipId, bayIdx) => {
              setBayDeployInfo({ shipId, bayIndex: bayIdx })
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
          />
        )
      })()}

      {mode === 'deploy' && isMyTurn && (
        <div className="p-3 rounded" style={{ backgroundColor: '#161b22', border: '1px solid #2a3140' }}>
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
              return (
              <button
                key={ut.id}
                onClick={() => setSelectedUnitType(ut.id)}
                disabled={cantAfford || needsCC || alreadyHasCC || buildingNeedsCC}
                className="flex flex-col lg:flex-row items-center lg:justify-between p-2 lg:p-3 rounded text-sm lg:text-base transition-colors disabled:opacity-20 cursor-pointer gap-1 lg:gap-3"
                style={selectedUnitType === ut.id
                  ? { backgroundColor: '#1a2a3a', color: '#c9d1d9', border: '1px solid #3a4a5a' }
                  : { backgroundColor: '#0d1117', color: '#c9d1d9', border: '1px solid #2a3140' }}
              >
                <img src={getUnitIcon(ut)} alt={ut.name} className="w-10 h-10 lg:w-16 lg:h-16 object-contain shrink-0" />
                <span className="font-medium text-xs lg:text-sm truncate max-w-full">{ut.name}</span>
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
    <div className="flex flex-col lg:flex-row gap-3 lg:gap-4 h-full">
      <div className="hidden lg:block lg:w-80 shrink-0 lg:max-h-[calc(100vh-5rem)] lg:overflow-y-auto">
        {sidebarContent}
      </div>

      <div
        ref={boardRef}
        className="flex-1 overflow-auto"
        style={{ cursor: boardCursor, touchAction: 'none' }}
        onMouseDown={handleBoardMouseDown}
      >
        <div style={{
          width: boardPixelW * zoom * 2.2,
          height: boardPixelH * zoom * 2.2,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}>
          <div
            className="relative shrink-0"
            style={{
              width: boardPixelW,
              height: boardPixelH,
              transform: `scale(${zoom})`,
              transformOrigin: 'center center',
            }}
          >
            {Array.from({ length: rows * cols }, (_, i) => {
              const row = Math.floor(i / cols)
              const col = i % cols
              const unit = getUnitAt(row, col)
              const cellKey = `${row}-${col}`
              const isVisible = visibleTiles.has(cellKey)
              const isInMoveRange = moveRange.includes(cellKey)
              const isInAttackRange = attackRange.includes(cellKey)
              const isInDeployRange = deployRange.includes(cellKey)
              const isInBuildRange = buildRange.includes(cellKey)
              const isInDestroyRange = destroyRange.includes(cellKey)
              const isInBayDeployRange = bayDeployRange.includes(cellKey)
              const isInTransportDeployRange = transportDeployRange.includes(cellKey)
              const isInUnitFromTransportRange = unitFromTransportDeployRange.includes(cellKey)
              const isSelected = selectedUnit && selectedUnit.grid_row === row && selectedUnit.grid_col === col

              const board = activeBoard || 'ground'
              const fullKey = `${board}-${row}-${col}`
              const isDiscovered = discoveredTiles.has(fullKey)
              const showUnit = unit && (unit.owner_id === currentPlayer?.player_id || isVisible)

              let bg
              if (isSelected) bg = '#203348'
              else if (isInBayDeployRange || isInTransportDeployRange || isInUnitFromTransportRange) bg = '#203320'
              else if (isInDeployRange) bg = '#203320'
              else if (isInMoveRange) bg = '#182533'
              else if (isInAttackRange) bg = '#2a181d'
              else if (isInBuildRange) bg = '#2a2a1a'
              else if (isInDestroyRange) bg = '#2a181d'
              else bg = getTileColor(row, col, isVisible, isDiscovered)

              const isCC = showUnit && (unit?.wg_unit_types?.name === 'Command Center' || unit?.wg_unit_types?.name === 'Command Ship')
              const ccAdjColor = ccAdjacentTiles.get(cellKey)
              const unitTeamColor = showUnit && unit.wg_unit_types?.name !== 'Command Center' && unit.wg_unit_types?.name !== 'Command Ship' ? getPlayerColor(unit.owner_id) : ccAdjColor || null

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
                    backgroundColor: unitTeamColor || bg,
                    pointerEvents: spaceHeld ? 'none' : 'auto',
                  }}
                >
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
                  {!showUnit && (isVisible || isDiscovered) && (() => {
                    const tile = tileMap.get(cellKey)
                    if (!tile?.resource) return null
                    if (tile.resource === 'space_guild') {
                      return (
                        <img
                          src="/assets/spaceguild.png"
                          alt="Space Guild"
                          className="absolute object-contain pointer-events-none z-[5]"
                          style={{
                            width: RENDER_W - 4,
                            height: RENDER_H - 6,
                            opacity: isVisible ? 1 : 0.5,
                            filter: 'drop-shadow(0 0 4px #6cb4e6)',
                          }}
                        />
                      )
                    }
                    const res = RESOURCE_BY_ID[tile.resource]
                    if (!res?.icon) return null
                    return (
                      <img
                        src={`/assets/${res.icon}`}
                        alt={res.name}
                        className="absolute object-contain pointer-events-none z-[5]"
                        style={{
                          width: RENDER_W * 0.55,
                          height: RENDER_H * 0.55,
                          opacity: isVisible ? 0.85 : 0.45,
                        }}
                      />
                    )
                  })()}
                  {showUnit && unit.wg_unit_types?.name !== 'Command Center' && unit.wg_unit_types?.name !== 'Command Ship' && (() => {
                    const pColor = getPlayerColor(unit.owner_id)
                    const hpRatio = unit.current_hp / unit.wg_unit_types?.hp
                    const tokenSize = (Math.min(RENDER_W, RENDER_H) - 4) * 0.86
                    return (
                      <div className="relative flex items-center justify-center z-10" style={{ width: tokenSize, height: tokenSize }}>
                        <div
                          className="absolute inset-0 rounded-full overflow-hidden"
                        >
                          <img
                            src={getUnitIcon(unit.wg_unit_types)}
                            alt={unit.wg_unit_types?.name}
                            className="w-full h-full object-cover pointer-events-none"
                          />
                        </div>
                        <div
                          className="absolute left-1/2 -translate-x-1/2 rounded-full z-20"
                          style={{
                            bottom: 1,
                            height: 2,
                            width: `${hpRatio * 60}%`,
                            backgroundColor: hpRatio > 0.5 ? '#4a8060' : '#804a4a',
                            minWidth: 3,
                            boxShadow: '0 0 2px #000',
                          }}
                        />
                        {(unit.upgrades?.level || 0) > 0 && (
                          <div
                            className="absolute -top-0.5 -left-0.5 flex items-center justify-center rounded-full z-20"
                            style={{
                              width: 7, height: 7,
                              backgroundColor: '#1a1a0d',
                              border: '1px solid #cca43b',
                              fontSize: 5, fontWeight: 'bold',
                              color: '#cca43b', lineHeight: 1,
                            }}
                          >
                            {unit.upgrades.level}
                          </div>
                        )}
                      </div>
                    )
                  })()}
                </div>
              )
            })}
            {units.filter(u => (u.wg_unit_types?.name === 'Command Center' || u.wg_unit_types?.name === 'Command Ship') && (u.owner_id === currentPlayer?.player_id || visibleTiles.has(`${u.grid_row}-${u.grid_col}`))).map(cc => {
              const ccX = cc.grid_col * HEX_W + (cc.grid_row & 1 ? HEX_W / 2 : 0) + RENDER_W / 2
              const ccY = cc.grid_row * ROW_H + RENDER_H / 2
              const ccSize = HEX_W * 2.04
              const hpRatio = cc.current_hp / cc.wg_unit_types?.hp
              const pColor = getPlayerColor(cc.owner_id)
              return (
                <div
                  key={`cc-overlay-${cc.id}`}
                  className="absolute pointer-events-none z-10"
                  style={{
                    left: ccX - ccSize / 2,
                    top: ccY - ccSize / 2,
                    width: ccSize,
                    height: ccSize,
                  }}
                >
                  <div className="absolute inset-0 rounded-full overflow-hidden" style={{ border: `2px solid ${pColor}`, boxShadow: `0 0 8px ${pColor}40` }}>
                    <img
                      src={getUnitIcon(cc.wg_unit_types)}
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
                  className="absolute z-20 pointer-events-none"
                  style={{
                    left: hx,
                    top: hy,
                    transform: `translate(-50%, -100%) scale(${1.25 / zoom})`,
                    transformOrigin: 'bottom center',
                  }}
                >
                  <div
                    className="rounded px-2 py-1.5 shadow-lg whitespace-nowrap"
                    style={{ backgroundColor: '#161b22', border: '1px solid #2a3140' }}
                  >
                    {hShowUnit && (
                      <div className="flex flex-col items-center gap-1 mb-1">
                        <img
                          src={getUnitIcon(hu.wg_unit_types)}
                          alt={hu.wg_unit_types.name}
                          className="object-contain"
                          style={{ maxHeight: 80, maxWidth: 80 }}
                        />
                        <div className="text-xs font-semibold text-center" style={{ color: '#c9d1d9' }}>
                          {hu.wg_unit_types.name}
                          {(hu.upgrades?.level || 0) > 0 && (
                            <span className="ml-1 font-mono" style={{ color: '#cca43b' }}>Lv{hu.upgrades.level}</span>
                          )}
                        </div>
                        <div className="text-[10px] font-mono" style={{ color: '#8b949e' }}>HP {hu.current_hp}/{hu.wg_unit_types.hp}</div>
                        {hu.upgrades?.loadedUnits?.length > 0 && (
                          <div className="mt-1 pt-1" style={{ borderTop: '1px solid #2a3140' }}>
                            <div className="text-[9px] uppercase tracking-widest font-semibold mb-0.5" style={{ color: '#4a5568' }}>Loaded ({hu.upgrades.loadedUnits.length})</div>
                            {hu.upgrades.loadedUnits.map((lu, li) => {
                              const luType = allUnitTypes.find(ut => ut.id === lu.typeId)
                              return (
                                <div key={li} className="flex items-center gap-1 py-0.5">
                                  <img src={getUnitIcon(luType)} alt={lu.typeName} className="w-3.5 h-3.5 object-contain" />
                                  <span className="text-[10px]" style={{ color: '#8b949e' }}>{lu.typeName}</span>
                                </div>
                              )
                            })}
                          </div>
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

      {inspectedUnit && (
        <div
          className="fixed bottom-16 left-1/2 -translate-x-1/2 lg:absolute lg:bottom-4 z-30 flex items-center gap-3 px-4 py-3 rounded-lg shadow-lg max-w-sm"
          style={{ backgroundColor: '#161b22', border: '1px solid #2a3140' }}
        >
          <img
            src={getUnitIcon(inspectedUnit.wg_unit_types)}
            alt={inspectedUnit.wg_unit_types?.name}
            className="w-12 h-12 object-contain shrink-0"
            style={{ filter: `drop-shadow(0 0 3px ${getPlayerColor(inspectedUnit.owner_id)})` }}
          />
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: getPlayerColor(inspectedUnit.owner_id) }} />
              <span className="font-semibold text-sm truncate" style={{ color: '#c9d1d9' }}>
                {inspectedUnit.wg_unit_types?.name}
              </span>
            </div>
            <div className="flex gap-3 mt-1 text-xs font-mono" style={{ color: '#8b949e' }}>
              <span>HP {inspectedUnit.current_hp}/{inspectedUnit.wg_unit_types?.hp}</span>
              <span>ATK {inspectedUnit.wg_unit_types?.attack}</span>
              <span>DEF {inspectedUnit.wg_unit_types?.defense}</span>
              <span>MOV {inspectedUnit.wg_unit_types?.movement}</span>
            </div>
            <div className="flex gap-2 text-xs mt-0.5" style={{ color: '#4a5568' }}>
              <span>{(allPlayers || players).find(p => p.player_id === inspectedUnit.owner_id)?.wg_profiles?.display_name}</span>
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
          <div className="flex items-center justify-between px-3 py-1.5" style={{ backgroundColor: '#161b22', borderTop: '1px solid #2a3140' }}>
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
              onClick={() => setPanelOpen(!panelOpen)}
              className="flex items-center gap-1.5 py-1 text-xs font-semibold uppercase tracking-wide cursor-pointer"
              style={{ color: '#4a5568' }}
            >
              <span>{panelOpen ? 'Hide' : 'Controls'}</span>
              <span className={`transition-transform ${panelOpen ? 'rotate-180' : ''}`}>&#9650;</span>
            </button>
          </div>
          {panelOpen && (
            <div className="p-3 max-h-[50vh] overflow-y-auto" style={{ backgroundColor: '#0d1117', borderTop: '1px solid #2a3140' }}>
              {sidebarContent}
            </div>
          )}
        </div>
      )}

      {isFullscreen && (
        <div className="lg:hidden fixed top-0 right-0 bottom-0 z-20 flex">
          <button
            onClick={() => setPanelOpen(!panelOpen)}
            className="flex items-center justify-center px-1 cursor-pointer self-stretch"
            style={{ backgroundColor: '#161b22', borderLeft: '1px solid #2a3140', color: '#4a5568', writingMode: 'vertical-rl' }}
          >
            <span className="text-xs font-semibold uppercase tracking-widest">{panelOpen ? 'Hide' : 'Menu'}</span>
          </button>
          {panelOpen && (
            <div className="w-54 h-full overflow-y-auto p-3" style={{ backgroundColor: '#0d1117', borderLeft: '1px solid #2a3140' }}>
              <div className="flex items-center justify-between mb-3">
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
                  onClick={onExitFullscreen}
                  className="w-6 h-6 flex items-center justify-center rounded cursor-pointer text-xs"
                  style={{ backgroundColor: '#21262d', color: '#f47067', border: '1px solid #3d2525' }}
                >
                  &times;
                </button>
              </div>
              {sidebarContent}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
