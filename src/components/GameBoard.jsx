import { useCallback, useEffect, useRef, useState } from 'react'

const HEX_SIZE = 16
const HEX_W = Math.round(Math.sqrt(3) * HEX_SIZE)
const HEX_H = HEX_SIZE * 2
const ROW_H = HEX_H * 0.75
const GAP = 2
const RENDER_W = HEX_W - GAP
const RENDER_H = HEX_H - GAP

function hexDistance(r1, c1, r2, c2) {
  const q1 = c1 - ((r1 - (r1 & 1)) >> 1)
  const q2 = c2 - ((r2 - (r2 & 1)) >> 1)
  const s1 = -q1 - r1
  const s2 = -q2 - r2
  return Math.max(Math.abs(q1 - q2), Math.abs(r1 - r2), Math.abs(s1 - s2))
}

export default function GameBoard({
  game, players, units, unitTypes, currentPlayer, isMyTurn,
  deployUnit, moveUnit, attackUnit, endTurn,
  isFullscreen, onExitFullscreen,
}) {
  const [selectedUnitId, setSelectedUnitId] = useState(null)
  const [selectedUnitType, setSelectedUnitType] = useState(null)
  const [mode, setMode] = useState('select')
  const [error, setError] = useState(null)
  const [panelOpen, setPanelOpen] = useState(false)
  const [zoom, setZoom] = useState(1)
  const [spaceHeld, setSpaceHeld] = useState(false)
  const [isPanning, setIsPanning] = useState(false)
  const boardRef = useRef(null)
  const panStart = useRef({ x: 0, y: 0, scrollLeft: 0, scrollTop: 0 })

  const selectedUnit = selectedUnitId ? units.find(u => u.id === selectedUnitId) || null : null

  const myCommandCenter = units.find(u => u.owner_id === currentPlayer?.player_id && u.wg_unit_types?.name === 'Command Center')
  const hasCommandCenter = !!myCommandCenter
  const myBases = units.filter(u => u.owner_id === currentPlayer?.player_id && u.wg_unit_types?.name === 'Base')
  const myStructures = myCommandCenter ? [myCommandCenter, ...myBases] : []

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
  }, [units, selectedUnitId])

  const rows = game.grid_rows
  const cols = game.grid_cols

  const boardPixelW = cols * HEX_W + HEX_W / 2 + GAP
  const boardPixelH = (rows - 1) * ROW_H + HEX_H + GAP

  const visibleTiles = (() => {
    const set = new Set()
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
        if (dist > 0 && dist <= range && !getUnitAt(r, c)) {
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

  const moveRange = mode === 'move' && selectedUnit ? getMoveRange(selectedUnit) : []
  const attackRange = mode === 'attack' && selectedUnit ? getAttackRange(selectedUnit) : []

  function isEdgeOrCorner(r, c) {
    return r === 0 || r === rows - 1 || c === 0 || c === cols - 1
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
          if (!getUnitAt(r, c) && isEdgeOrCorner(r, c) && isFarFromEnemyCCs(r, c)) {
            cells.push(`${r}-${c}`)
          }
        }
      }
    } else if (unitTypeData.name === 'Base') {
      if (!hasCommandCenter) return []
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          const d = distToNearestStructure(r, c)
          if (!getUnitAt(r, c) && d > 0 && d <= 4) {
            cells.push(`${r}-${c}`)
          }
        }
      }
    } else if (hasCommandCenter) {
      const range = unitTypeData.movement
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          const d = distToNearestStructure(r, c)
          if (!getUnitAt(r, c) && d > 0 && d <= range) {
            cells.push(`${r}-${c}`)
          }
        }
      }
    }
    return cells
  }

  const deployRange = mode === 'deploy' && selectedUnitTypeData ? getDeployRange(selectedUnitTypeData) : []

  // Space key tracking for pan mode
  useEffect(() => {
    function onKeyDown(e) {
      if (e.code === 'Space' && e.target.tagName !== 'INPUT' && e.target.tagName !== 'TEXTAREA') {
        e.preventDefault()
        if (!e.repeat) {
          setSpaceHeld(true)
          document.body.style.overflow = 'hidden'
        }
      }
    }
    function onKeyUp(e) {
      if (e.code === 'Space') {
        e.preventDefault()
        setSpaceHeld(false)
        setIsPanning(false)
        document.body.style.overflow = ''
      }
    }
    window.addEventListener('keydown', onKeyDown)
    window.addEventListener('keyup', onKeyUp)
    return () => {
      window.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('keyup', onKeyUp)
    }
  }, [])

  // Zoom with mouse wheel
  const handleWheel = useCallback((e) => {
    e.preventDefault()
    setZoom(prev => {
      const delta = e.deltaY > 0 ? -0.1 : 0.1
      return Math.min(3, Math.max(0.3, prev + delta))
    })
  }, [])

  // Pinch-to-zoom for touch
  const pinchRef = useRef(null)

  const handleTouchStart = useCallback((e) => {
    if (e.touches.length === 2) {
      e.preventDefault()
      const dx = e.touches[0].clientX - e.touches[1].clientX
      const dy = e.touches[0].clientY - e.touches[1].clientY
      pinchRef.current = Math.hypot(dx, dy)
    }
  }, [])

  const handleTouchMove = useCallback((e) => {
    if (e.touches.length === 2 && pinchRef.current !== null) {
      e.preventDefault()
      const dx = e.touches[0].clientX - e.touches[1].clientX
      const dy = e.touches[0].clientY - e.touches[1].clientY
      const dist = Math.hypot(dx, dy)
      const scale = dist / pinchRef.current
      pinchRef.current = dist
      setZoom(prev => Math.min(3, Math.max(0.3, prev * scale)))
    }
  }, [])

  const handleTouchEnd = useCallback(() => {
    pinchRef.current = null
  }, [])

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
    if (!spaceHeld) return
    e.preventDefault()
    setIsPanning(true)
    const el = boardRef.current
    panStart.current = {
      x: e.clientX,
      y: e.clientY,
      scrollLeft: el.scrollLeft,
      scrollTop: el.scrollTop,
    }
  }

  function handleBoardMouseMove(e) {
    if (!isPanning) return
    e.preventDefault()
    const el = boardRef.current
    el.scrollLeft = panStart.current.scrollLeft - (e.clientX - panStart.current.x)
    el.scrollTop = panStart.current.scrollTop - (e.clientY - panStart.current.y)
  }

  function handleBoardMouseUp() {
    setIsPanning(false)
  }

  async function handleCellClick(row, col) {
    if (spaceHeld || isPanning) return
    setError(null)

    if (!isMyTurn) {
      setError("It's not your turn")
      return
    }

    try {
      if (mode === 'deploy' && selectedUnitType) {
        const cellKey = `${row}-${col}`
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
        const target = getUnitAt(row, col)
        if (target && target.owner_id !== currentPlayer?.player_id) {
          await attackUnit(selectedUnit.id, target.id)
          setSelectedUnitId(null)
          setMode('select')
        }
      } else {
        const unit = getUnitAt(row, col)
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

  const boardCursor = spaceHeld ? (isPanning ? 'grabbing' : 'grab') : 'default'

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
                  {!selectedUnit.has_moved && (
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
                  {!selectedUnit.has_attacked && (
                    <button
                      onClick={() => setMode('attack')}
                      className="px-3 py-1 text-xs font-semibold uppercase tracking-wide rounded transition-colors cursor-pointer"
                      style={mode === 'attack'
                        ? { backgroundColor: '#4c1a1a', color: '#f47067', border: '1px solid #6e2b2b' }
                        : { backgroundColor: '#21262d', color: '#8b949e', border: '1px solid #30363d' }}
                    >
                      Attack
                    </button>
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
              const needsCC = ut.name !== 'Command Center' && ut.name !== 'Base' && !hasCommandCenter
              const alreadyHasCC = ut.name === 'Command Center' && hasCommandCenter
              const baseNeedsCC = ut.name === 'Base' && !hasCommandCenter
              const cantAfford = currentPlayer?.gold < ut.cost
              return (
              <button
                key={ut.id}
                onClick={() => setSelectedUnitType(ut.id)}
                disabled={cantAfford || needsCC || alreadyHasCC || baseNeedsCC}
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
        style={{ cursor: boardCursor, touchAction: 'pan-x pan-y' }}
        onMouseDown={handleBoardMouseDown}
        onMouseMove={handleBoardMouseMove}
        onMouseUp={handleBoardMouseUp}
        onMouseLeave={handleBoardMouseUp}
      >
        <div style={{ width: boardPixelW * zoom, height: boardPixelH * zoom }}>
          <div
            className="relative"
            style={{
              width: boardPixelW,
              height: boardPixelH,
              transform: `scale(${zoom})`,
              transformOrigin: '0 0',
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
              const isSelected = selectedUnit && selectedUnit.grid_row === row && selectedUnit.grid_col === col

              const showUnit = unit && (unit.owner_id === currentPlayer?.player_id || isVisible)

              let bg
              if (isSelected) bg = isVisible ? '#203348' : '#1a2a3a'
              else if (isInDeployRange) bg = isVisible ? '#203320' : '#1a2a1a'
              else if (isInMoveRange) bg = isVisible ? '#182533' : '#121d28'
              else if (isInAttackRange) bg = isVisible ? '#2a181d' : '#221216'
              else bg = isVisible ? '#232a35' : '#1a2029'

              const isCC = showUnit && unit?.wg_unit_types?.name === 'Command Center'
              const ccColor = isCC ? getPlayerColor(unit.owner_id) : null

              const x = col * HEX_W + (row & 1 ? HEX_W / 2 : 0) + GAP / 2
              const y = row * ROW_H + GAP / 2

              return (
                <div
                  key={cellKey}
                  onClick={() => handleCellClick(row, col)}
                  className="absolute flex items-center justify-center cursor-pointer"
                  style={{
                    left: x,
                    top: y,
                    width: RENDER_W,
                    height: RENDER_H,
                    clipPath: hexClip,
                    backgroundColor: ccColor || bg,
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
          </div>
        </div>
      </div>

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
            {isFullscreen && (
              <button
                onClick={onExitFullscreen}
                className="w-full mb-3 px-3 py-2 text-sm font-semibold uppercase tracking-wide rounded transition-colors cursor-pointer"
                style={{ backgroundColor: '#2a1a1a', color: '#f47067', border: '1px solid #3d2525' }}
              >
                Exit Fullscreen
              </button>
            )}
            {sidebarContent}
          </div>
        )}
      </div>
    </div>
  )
}
