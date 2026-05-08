import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { TERRAIN, RESOURCES } from '../lib/terrainGen'

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
const RESOURCE_BY_ID = Object.fromEntries(Object.values(RESOURCES).map(r => [r.id, r]))
const IMPASSABLE = new Set(['ocean', 'mountain', 'lake', 'river'])

export default function GameBoard({
  game, players, units, unitTypes, tiles, discoveredTiles, persistDiscoveredTiles,
  currentPlayer, isMyTurn, isAdmin,
  deployUnit, moveUnit, attackUnit, buildRoad, destroyRoad, endTurn,
  isFullscreen, onExitFullscreen,
}) {
  const [selectedUnitId, setSelectedUnitId] = useState(null)
  const [selectedUnitType, setSelectedUnitType] = useState(null)
  const [inspectedUnitId, setInspectedUnitId] = useState(null)
  const [hoveredTile, setHoveredTile] = useState(null)
  const [mode, setMode] = useState('select')
  const [error, setError] = useState(null)
  const [panelOpen, setPanelOpen] = useState(false)
  const [zoom, setZoom] = useState(1)
  const [spaceHeld, setSpaceHeld] = useState(false)
  const [isPanning, setIsPanning] = useState(false)
  const [touchPanning, setTouchPanning] = useState(false)
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

  const myCommandCenter = units.find(u => u.owner_id === currentPlayer?.player_id && u.wg_unit_types?.name === 'Command Center')
  const hasCommandCenter = !!myCommandCenter
  const myBuildings = units.filter(u => u.owner_id === currentPlayer?.player_id && (u.wg_unit_types?.name === 'Base' || u.wg_unit_types?.name === 'Factory'))
  const myStructures = myCommandCenter ? [myCommandCenter, ...myBuildings] : []

  const sortedUnitTypes = [...unitTypes].sort((a, b) => {
    if (a.name === 'Command Center') return -1
    if (b.name === 'Command Center') return 1
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
  }, [units, selectedUnitId, inspectedUnitId])

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
    const myUnits = units.filter(u => u.owner_id === currentPlayer?.player_id)
    for (const u of myUnits) {
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
    const newKeys = []
    for (const key of visibleTiles) {
      if (!discoveredTiles.has(key) && !prevVisibleRef.current.has(key)) {
        newKeys.push(key)
      }
    }
    prevVisibleRef.current = visibleTiles
    if (newKeys.length > 0) persistDiscoveredTiles(newKeys)
  }, [visibleTiles, discoveredTiles, persistDiscoveredTiles])

  function getTileColor(row, col, isVisible, isDiscovered) {
    const tile = tileMap.get(`${row}-${col}`)
    if (!tile) return isVisible ? '#232a35' : isDiscovered ? '#1e2530' : '#1a2029'
    const terrain = TERRAIN_BY_ID[tile.terrain]
    if (!terrain) return isVisible ? '#232a35' : isDiscovered ? '#1e2530' : '#1a2029'
    if (tile.has_road) {
      if (isVisible) return '#8a7a60'
      if (isDiscovered) return '#5a5040'
      return '#1a2029'
    }
    if (isVisible) return terrain.color
    if (isDiscovered) return terrain.darkColor
    return '#1a2029'
  }

  function getTerrainInfo(row, col) {
    const tile = tileMap.get(`${row}-${col}`)
    if (!tile) return null
    const terrain = TERRAIN_BY_ID[tile.terrain]
    const resource = tile.resource ? RESOURCE_BY_ID[tile.resource] : null
    return { terrain, resource, hasRiver: tile.has_river }
  }

  function isImpassable(row, col) {
    const tile = tileMap.get(`${row}-${col}`)
    if (!tile) return false
    if (tile.has_road) return false
    return IMPASSABLE.has(tile.terrain)
  }

  function getUnitAt(row, col) {
    return units.find(u => u.grid_row === row && u.grid_col === col)
  }

  function getPlayerColor(playerId) {
    return players.find(p => p.player_id === playerId)?.color || '#888'
  }

  function getMoveRange(unit) {
    if (!unit?.wg_unit_types) return []
    const cells = []
    const range = unit.wg_unit_types.movement
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const dist = hexDistance(unit.grid_row, unit.grid_col, r, c)
        if (dist > 0 && dist <= range && !getUnitAt(r, c) && !isImpassable(r, c)) {
          cells.push(`${r}-${c}`)
        }
      }
    }
    return cells
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
    const enemyCCs = units.filter(u => u.owner_id !== currentPlayer?.player_id && u.wg_unit_types?.name === 'Command Center')
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
    if (unitTypeData.name === 'Command Center') {
      if (hasCommandCenter) return []
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
          if (!getUnitAt(r, c) && !isImpassable(r, c) && d > 0 && d <= range) {
            cells.push(`${r}-${c}`)
          }
        }
      }
    }
    return cells
  }

  const deployRange = mode === 'deploy' && selectedUnitTypeData ? getDeployRange(selectedUnitTypeData) : []

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

  // Space key tracking for pan mode
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

  // Smooth animated zoom toward target
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

  // Zoom with mouse wheel — accumulates target, animates smoothly
  const handleWheel = useCallback((e) => {
    e.preventDefault()
    wheelCursorRef.current = { clientX: e.clientX, clientY: e.clientY }
    const factor = e.deltaY > 0 ? 0.85 : 1.18
    targetZoomRef.current = Math.min(3, Math.max(0.3, targetZoomRef.current * factor))
    if (!wheelAnimRef.current) {
      wheelAnimRef.current = requestAnimationFrame(tickWheelZoom)
    }
  }, [])

  // Pinch-to-zoom for touch
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

    const cellKey = `${row}-${col}`
    const unit = getUnitAt(row, col)
    const isVisible = visibleTiles.has(cellKey)
    const showUnit = unit && (unit.owner_id === currentPlayer?.player_id || isVisible)

    if (showUnit) {
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

  const sidebarContent = (
    <div className="space-y-3">
      <div className="p-3 rounded flex items-center justify-between lg:block" style={{ backgroundColor: '#161b22', border: '1px solid #2a3140' }}>
        <div>
          <div className="text-[10px] uppercase tracking-widest font-semibold" style={{ color: '#4a5568' }}>Turn {game.turn_number}</div>
          <div className="font-semibold text-sm mt-0.5" style={{ color: '#c9d1d9' }}>
            {isMyTurn ? 'YOUR TURN' : `Waiting — ${players.find(p => p.player_id === game.current_player_id)?.wg_profiles?.display_name}`}
          </div>
        </div>
        <div className="flex gap-3 lg:hidden">
          {players.map(p => (
            <div key={p.player_id} className="flex items-center gap-1">
              <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: p.color, border: '1px solid #2a3140' }} />
              <span className="text-xs font-mono" style={{ color: '#8b949e' }}>{p.gold}g</span>
            </div>
          ))}
        </div>
      </div>

      <div className="hidden lg:block p-3 rounded" style={{ backgroundColor: '#161b22', border: '1px solid #2a3140' }}>
        <div className="text-[10px] uppercase tracking-widest font-semibold mb-2" style={{ color: '#4a5568' }}>Operatives</div>
        {players.map(p => (
          <div
            key={p.player_id}
            className="flex items-center justify-between py-1.5"
            style={{ color: p.player_id === game.current_player_id ? '#c9d1d9' : '#4a5568' }}
          >
            <div className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: p.color, border: '1px solid #2a3140' }} />
              <span className="text-sm font-medium">{p.wg_profiles?.display_name}</span>
            </div>
            <span className="text-sm font-mono" style={{ color: '#8b949e' }}>{p.gold}g</span>
          </div>
        ))}
      </div>

      {isMyTurn && (
        <div className="p-3 rounded space-y-2" style={{ backgroundColor: '#161b22', border: '1px solid #2a3140' }}>
          {selectedUnit && (
            <div className="text-xs p-3 rounded mb-2" style={{ backgroundColor: '#0d1117', border: '1px solid #2a3140', color: '#8b949e' }}>
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-2 font-semibold" style={{ color: '#c9d1d9' }}>
                  <img src={`/assets/${encodeURIComponent(selectedUnit.wg_unit_types?.icon)}`} alt={selectedUnit.wg_unit_types?.name} className="w-20 h-20 object-contain" />
                  {selectedUnit.wg_unit_types?.name}
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

      {mode === 'deploy' && isMyTurn && (
        <div className="p-3 rounded" style={{ backgroundColor: '#161b22', border: '1px solid #2a3140' }}>
          <div className="text-[10px] uppercase tracking-widest font-semibold mb-2" style={{ color: '#4a5568' }}>
            Requisition — <span className="font-mono" style={{ color: '#8b949e' }}>{currentPlayer?.gold}g</span>
          </div>
          {!hasCommandCenter && (
            <div className="text-xs mb-2 px-2 py-1 rounded" style={{ backgroundColor: '#1a1a0d', border: '1px solid #3d3d1a', color: '#cca43b' }}>
              Deploy a Command Center first
            </div>
          )}
          <div className="grid grid-cols-2 lg:grid-cols-1 gap-1.5">
            {sortedUnitTypes.map(ut => {
              const isBuilding = ut.name === 'Base' || ut.name === 'Factory'
              const needsCC = ut.name !== 'Command Center' && !isBuilding && !hasCommandCenter
              const alreadyHasCC = ut.name === 'Command Center' && hasCommandCenter
              const buildingNeedsCC = isBuilding && !hasCommandCenter
              const cantAfford = !isAdmin && currentPlayer?.gold < ut.cost
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
                <img src={`/assets/${encodeURIComponent(ut.icon)}`} alt={ut.name} className="w-10 h-10 lg:w-16 lg:h-16 object-contain shrink-0" />
                <span className="font-medium text-xs lg:text-sm truncate max-w-full">{ut.name}</span>
                <span className="shrink-0 text-xs lg:text-lg font-mono font-semibold" style={{ color: '#8b949e' }}>{ut.cost}g</span>
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
              const isSelected = selectedUnit && selectedUnit.grid_row === row && selectedUnit.grid_col === col

              const isDiscovered = discoveredTiles.has(cellKey)
              const showUnit = unit && (unit.owner_id === currentPlayer?.player_id || isVisible)

              let bg
              if (isSelected) bg = '#203348'
              else if (isInDeployRange) bg = '#203320'
              else if (isInMoveRange) bg = '#182533'
              else if (isInAttackRange) bg = '#2a181d'
              else if (isInBuildRange) bg = '#2a2a1a'
              else if (isInDestroyRange) bg = '#2a181d'
              else bg = getTileColor(row, col, isVisible, isDiscovered)

              const isCC = showUnit && unit?.wg_unit_types?.name === 'Command Center'
              const ccColor = isCC ? getPlayerColor(unit.owner_id) : null

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
                    backgroundColor: ccColor || bg,
                    pointerEvents: spaceHeld ? 'none' : 'auto',
                  }}
                >
                  {isCC && (
                    <div
                      className="absolute inset-0 flex items-center justify-center"
                      style={{
                        clipPath: hexClip,
                        backgroundColor: bg,
                        margin: 2,
                      }}
                    />
                  )}
                  {showUnit && (
                    <div className="relative flex items-center justify-center z-10">
                      <img
                        src={`/assets/${encodeURIComponent(unit.wg_unit_types?.icon)}`}
                        alt={unit.wg_unit_types?.name}
                        className="object-contain pointer-events-none"
                        style={{
                          width: RENDER_W - 8,
                          height: RENDER_H - 10,
                          filter: `drop-shadow(0 0 3px ${getPlayerColor(unit.owner_id)})`,
                        }}
                      />
                      <div
                        className="absolute -bottom-0.5 left-1/2 -translate-x-1/2 rounded-full"
                        style={{
                          height: 2,
                          width: `${(unit.current_hp / unit.wg_unit_types?.hp) * 100}%`,
                          backgroundColor: unit.current_hp / unit.wg_unit_types?.hp > 0.5 ? '#4a8060' : '#804a4a',
                          minWidth: 4,
                          maxWidth: RENDER_W - 10,
                        }}
                      />
                      <div
                        className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 rounded-full"
                        style={{ backgroundColor: getPlayerColor(unit.owner_id), border: '1px solid #12161d' }}
                      />
                    </div>
                  )}
                </div>
              )
            })}
            {(() => {
              if (!hoveredTile) return null
              const { row: hr, col: hc } = hoveredTile
              const hKey = `${hr}-${hc}`
              const hVisible = visibleTiles.has(hKey)
              const hDiscovered = discoveredTiles.has(hKey)
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
                    className="hidden lg:block rounded px-2 py-1.5 shadow-lg whitespace-nowrap"
                    style={{ backgroundColor: '#161b22', border: '1px solid #2a3140' }}
                  >
                    {hShowUnit && (
                      <div className="flex flex-col items-center gap-1 mb-1">
                        <img
                          src={`/assets/${encodeURIComponent(hu.wg_unit_types.icon)}`}
                          alt={hu.wg_unit_types.name}
                          className="object-contain"
                          style={{ maxHeight: 80, maxWidth: 80 }}
                        />
                        <div className="text-xs font-semibold text-center" style={{ color: '#c9d1d9' }}>{hu.wg_unit_types.name}</div>
                        <div className="text-[10px] font-mono" style={{ color: '#8b949e' }}>HP {hu.current_hp}/{hu.wg_unit_types.hp}</div>
                      </div>
                    )}
                    {info && (
                      <div className="text-center">
                        <div className="text-[10px] font-semibold" style={{ color: '#8b949e' }}>
                          {info.terrain?.name}{info.hasRiver ? ' (River)' : ''}
                        </div>
                        {info.resource && (
                          <div className="text-[10px] font-mono" style={{ color: '#cca43b' }}>{info.resource.name}</div>
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
            src={`/assets/${encodeURIComponent(inspectedUnit.wg_unit_types?.icon)}`}
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
              <span>{players.find(p => p.player_id === inspectedUnit.owner_id)?.wg_profiles?.display_name}</span>
              <span className="font-mono">X{inspectedUnit.grid_row}/Y{inspectedUnit.grid_col}</span>
            </div>
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

      {/* Mobile panel: bottom-up normally, right-side in fullscreen */}
      {!isFullscreen && (
        <div className="lg:hidden fixed bottom-0 left-0 right-0 z-20">
          <button
            onClick={() => setPanelOpen(!panelOpen)}
            className="w-full flex items-center justify-center gap-2 py-2 text-sm font-semibold uppercase tracking-wide cursor-pointer"
            style={{ backgroundColor: '#161b22', borderTop: '1px solid #2a3140', color: '#4a5568' }}
          >
            <span>{panelOpen ? 'Hide' : 'Show'} Controls</span>
            <span className={`transition-transform ${panelOpen ? 'rotate-180' : ''}`}>&#9650;</span>
          </button>
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
              <button
                onClick={onExitFullscreen}
                className="w-full mb-3 px-3 py-2 text-sm font-semibold uppercase tracking-wide rounded transition-colors cursor-pointer"
                style={{ backgroundColor: '#2a1a1a', color: '#f47067', border: '1px solid #3d2525' }}
              >
                Exit Fullscreen
              </button>
              {sidebarContent}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
