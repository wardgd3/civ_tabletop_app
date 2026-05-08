import { useState } from 'react'

export default function GameBoard({
  game, players, units, unitTypes, currentPlayer, isMyTurn,
  deployUnit, moveUnit, attackUnit, endTurn,
}) {
  const [selectedUnit, setSelectedUnit] = useState(null)
  const [selectedUnitType, setSelectedUnitType] = useState(null)
  const [mode, setMode] = useState('select')
  const [error, setError] = useState(null)
  const [panelOpen, setPanelOpen] = useState(false)

  const rows = game.grid_rows
  const cols = game.grid_cols

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
        const dist = Math.abs(unit.grid_row - r) + Math.abs(unit.grid_col - c)
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
        const dist = Math.abs(unit.grid_row - r) + Math.abs(unit.grid_col - c)
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

  async function handleCellClick(row, col) {
    setError(null)

    if (!isMyTurn) {
      setError("It's not your turn")
      return
    }

    try {
      if (mode === 'deploy' && selectedUnitType) {
        await deployUnit(selectedUnitType, row, col)
        setMode('select')
        setSelectedUnitType(null)
      } else if (mode === 'move' && selectedUnit) {
        await moveUnit(selectedUnit.id, row, col)
        setSelectedUnit(null)
        setMode('select')
      } else if (mode === 'attack' && selectedUnit) {
        const target = getUnitAt(row, col)
        if (target && target.owner_id !== currentPlayer?.player_id) {
          await attackUnit(selectedUnit.id, target.id)
          setSelectedUnit(null)
          setMode('select')
        }
      } else {
        const unit = getUnitAt(row, col)
        if (unit && unit.owner_id === currentPlayer?.player_id) {
          setSelectedUnit(unit)
          setMode('select')
          setPanelOpen(true)
        } else {
          setSelectedUnit(null)
        }
      }
    } catch (err) {
      setError(err.message)
    }
  }

  const sidebarContent = (
    <div className="space-y-3">
      {/* Turn info */}
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

      {/* Player info */}
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

      {/* Actions */}
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
                      className="px-3 py-1 text-xs font-semibold uppercase tracking-wide rounded transition-colors"
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
                      className="px-3 py-1 text-xs font-semibold uppercase tracking-wide rounded transition-colors"
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
              onClick={() => { setMode('deploy'); setSelectedUnit(null) }}
              className="flex-1 lg:w-full px-3 py-2 text-sm font-semibold uppercase tracking-wide rounded transition-colors"
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
              className="flex-1 lg:w-full px-3 py-2 text-sm font-semibold uppercase tracking-wide rounded transition-colors"
              style={{ backgroundColor: '#2a2a1a', color: '#cca43b', border: '1px solid #4a4a2a' }}
            >
              End Turn
            </button>
          </div>
        </div>
      )}

      {/* Unit shop */}
      {mode === 'deploy' && isMyTurn && (
        <div className="p-3 rounded" style={{ backgroundColor: '#161b22', border: '1px solid #2a3140' }}>
          <div className="text-[10px] uppercase tracking-widest font-semibold mb-2" style={{ color: '#4a5568' }}>
            Requisition — <span className="font-mono" style={{ color: '#8b949e' }}>{currentPlayer?.gold}g</span>
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-1 gap-1.5">
            {unitTypes.map(ut => (
              <button
                key={ut.id}
                onClick={() => setSelectedUnitType(ut.id)}
                disabled={currentPlayer?.gold < ut.cost}
                className="flex items-center justify-between p-3 rounded text-base transition-colors disabled:opacity-20"
                style={selectedUnitType === ut.id
                  ? { backgroundColor: '#1a2a3a', color: '#c9d1d9', border: '1px solid #3a4a5a' }
                  : { backgroundColor: '#0d1117', color: '#c9d1d9', border: '1px solid #2a3140' }}
              >
                <span className="flex items-center gap-3 truncate">
                  <img src={`/assets/${encodeURIComponent(ut.icon)}`} alt={ut.name} className="w-20 h-20 object-contain shrink-0" />
                  <span className="font-medium">{ut.name}</span>
                </span>
                <span className="ml-2 shrink-0 text-lg font-mono font-semibold" style={{ color: '#8b949e' }}>{ut.cost}g</span>
              </button>
            ))}
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
      {/* Desktop sidebar */}
      <div className="hidden lg:block lg:w-80 shrink-0 lg:max-h-[calc(100vh-5rem)] lg:overflow-y-auto">
        {sidebarContent}
      </div>

      {/* Grid */}
      <div className="flex-1 overflow-auto touch-pan-x touch-pan-y">
        <div
          className="inline-grid gap-px rounded overflow-hidden"
          style={{
            gridTemplateColumns: `repeat(${cols}, minmax(3rem, 1fr))`,
            gridTemplateRows: `repeat(${rows}, minmax(3rem, 1fr))`,
            backgroundColor: '#1e2530',
            border: '1px solid #2a3140',
          }}
        >
          {Array.from({ length: rows * cols }, (_, i) => {
            const row = Math.floor(i / cols)
            const col = i % cols
            const unit = getUnitAt(row, col)
            const cellKey = `${row}-${col}`
            const isInMoveRange = moveRange.includes(cellKey)
            const isInAttackRange = attackRange.includes(cellKey)
            const isSelected = selectedUnit && selectedUnit.grid_row === row && selectedUnit.grid_col === col

            let bg = '#12161d'
            if (isSelected) bg = '#1a2a3a'
            else if (isInMoveRange) bg = '#121d28'
            else if (isInAttackRange) bg = '#221216'

            return (
              <button
                key={cellKey}
                onClick={() => handleCellClick(row, col)}
                className="flex items-center justify-center relative transition-colors hover:brightness-130 active:brightness-150"
                style={{ minWidth: '3rem', minHeight: '3rem', backgroundColor: bg }}
              >
                {unit && (
                  <div className="relative">
                    <img
                      src={`/assets/${encodeURIComponent(unit.wg_unit_types?.icon)}`}
                      alt={unit.wg_unit_types?.name}
                      className="w-16 h-16 sm:w-20 sm:h-20 object-contain"
                      style={{ filter: `drop-shadow(0 0 4px ${getPlayerColor(unit.owner_id)})` }}
                    />
                    <div
                      className="absolute -bottom-1 left-1/2 -translate-x-1/2 h-1 rounded-full"
                      style={{
                        width: `${(unit.current_hp / unit.wg_unit_types?.hp) * 100}%`,
                        backgroundColor: unit.current_hp / unit.wg_unit_types?.hp > 0.5 ? '#4a8060' : '#804a4a',
                        minWidth: '6px',
                        maxWidth: '28px',
                      }}
                    />
                    <div
                      className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full"
                      style={{ backgroundColor: getPlayerColor(unit.owner_id), border: '1px solid #12161d' }}
                    />
                  </div>
                )}
              </button>
            )
          })}
        </div>
      </div>

      {/* Mobile bottom panel */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 z-20">
        <button
          onClick={() => setPanelOpen(!panelOpen)}
          className="w-full flex items-center justify-center gap-2 py-2 text-sm font-semibold uppercase tracking-wide"
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
    </div>
  )
}
